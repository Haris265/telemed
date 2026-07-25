import logging
from datetime import time

from django.conf import settings
from django.core.cache import cache
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsPatient
from appointments.models import Appointment
from appointments.serializers import AppointmentSerializer
from appointments.services import book_token, queue_info, upcoming_available_dates
from catalog.models import DoctorAvailability, DoctorProfile, Speciality
from catalog.serializers import DoctorAvailabilitySerializer, SpecialitySerializer
from whatsapp.meta_client import MetaWhatsAppClient

from .models import PatientProfile
from .serializers import (
    PatientBookSerializer,
    PatientDoctorSerializer,
    PatientProfileSerializer,
    RequestOtpSerializer,
    VerifyOtpSerializer,
    generate_otp,
)

logger = logging.getLogger(__name__)


def _patient_for_user(user) -> PatientProfile | None:
    return getattr(user, "patient_profile", None) or PatientProfile.objects.filter(
        user=user
    ).first()


class ClinicInfoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        number = (settings.CLINIC_WHATSAPP_NUMBER or "").strip()
        digits = "".join(ch for ch in number if ch.isdigit())
        if not digits:
            digits = MetaWhatsAppClient().get_display_phone_digits()
        prefill = "2"
        link = f"https://wa.me/{digits}" if digits else ""
        if link and prefill:
            link = f"{link}?text={prefill}"
        return Response(
            {
                "whatsapp_number": digits,
                "whatsapp_link": link,
                "book_prefill": prefill,
                "webhook_path": "/api/whatsapp/webhook/",
            }
        )


class RequestOtpView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = RequestOtpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        phone = ser.validated_data["phone"]
        otp = generate_otp()
        cache.set(f"otp:{phone}", otp, timeout=300)

        body = (
            f"Your Telemed login OTP is: {otp}\n"
            "It expires in 5 minutes."
        )
        try:
            MetaWhatsAppClient().send_text(phone, body)
        except Exception:
            logger.exception("Failed sending OTP WhatsApp to %s", phone)

        patient = PatientProfile.objects.filter(phone=phone).first()
        payload = {
            "detail": "OTP sent.",
            "phone": phone,
            "needs_name": patient is None or not (patient.name or "").strip(),
        }
        if settings.DEBUG:
            payload["otp"] = otp
        return Response(payload)


class VerifyOtpView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = VerifyOtpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.save()
        return Response(data)


class MeView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        patient = _patient_for_user(request.user)
        if not patient:
            return Response({"detail": "Patient profile not found."}, status=404)
        return Response(PatientProfileSerializer(patient).data)

    def patch(self, request):
        patient = _patient_for_user(request.user)
        if not patient:
            return Response({"detail": "Patient profile not found."}, status=404)
        ser = PatientProfileSerializer(patient, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class PatientSpecialityListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = SpecialitySerializer
    pagination_class = None

    def get_queryset(self):
        return Speciality.objects.filter(is_active=True).order_by("name")


class PatientDoctorListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = PatientDoctorSerializer
    pagination_class = None

    def get_queryset(self):
        qs = (
            DoctorProfile.objects.filter(is_active=True)
            .prefetch_related("specialities")
            .order_by("first_name", "last_name")
        )
        speciality = self.request.query_params.get("speciality")
        if speciality:
            qs = qs.filter(specialities__id=speciality).distinct()
        return qs


class PatientDoctorAvailabilityView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request, uuid):
        doctor = DoctorProfile.objects.filter(uuid=uuid, is_active=True).first()
        if not doctor:
            return Response({"detail": "Doctor not found."}, status=404)
        weekly = DoctorAvailability.objects.filter(
            doctor=doctor, is_active=True
        ).order_by("weekday", "start_time")
        dates = upcoming_available_dates(doctor)
        return Response(
            {
                "doctor": PatientDoctorSerializer(doctor).data,
                "weekly": DoctorAvailabilitySerializer(weekly, many=True).data,
                "dates": dates,
            }
        )


class PatientAppointmentListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        patient = _patient_for_user(request.user)
        if not patient:
            return Response({"detail": "Patient profile not found."}, status=404)
        qs = (
            Appointment.objects.filter(patient=patient)
            .select_related("doctor")
            .order_by("-token_date", "token_number", "-created_at")
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(AppointmentSerializer(qs, many=True).data)

    def post(self, request):
        patient = _patient_for_user(request.user)
        if not patient:
            return Response({"detail": "Patient profile not found."}, status=404)

        ser = PatientBookSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        doctor = ser.validated_data["doctor"]
        token_date = ser.validated_data["token_date"]
        start_raw = ser.validated_data["start"]
        parts = [int(x) for x in start_raw.split(":")[:3]]
        start_time = time(*parts)

        try:
            appt = book_token(
                patient,
                doctor,
                token_date,
                start_time,
                notes="Booked via App",
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "appointment": AppointmentSerializer(appt).data,
                "queue": queue_info(appt),
            },
            status=status.HTTP_201_CREATED,
        )


class PatientAppointmentQueueView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request, pk):
        patient = _patient_for_user(request.user)
        if not patient:
            return Response({"detail": "Patient profile not found."}, status=404)
        appt = (
            Appointment.objects.filter(pk=pk, patient=patient)
            .select_related("doctor")
            .first()
        )
        if not appt:
            return Response({"detail": "Appointment not found."}, status=404)
        return Response(queue_info(appt))
