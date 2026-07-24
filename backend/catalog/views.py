from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsDoctor
from appointments.models import Appointment
from appointments.serializers import AppointmentSerializer
from patients.models import PatientProfile

from .models import DoctorAvailability, DoctorProfile, Speciality
from .serializers import (
    DoctorAvailabilitySerializer,
    DoctorOnboardingSerializer,
    DoctorProfileSerializer,
    SpecialitySerializer,
)


class DashboardStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        today = timezone.localdate()

        upcoming_today = (
            Appointment.objects.filter(
                status=Appointment.Status.UPCOMING,
                token_date=today,
            )
            .select_related("patient", "doctor")
            .order_by("-created_at", "-id")[:5]
        )
        recent = (
            Appointment.objects.select_related("patient", "doctor")
            .order_by("-created_at", "-id")[:5]
        )

        return Response(
            {
                "total_doctors": DoctorProfile.objects.filter(is_active=True).count(),
                "total_patients": PatientProfile.objects.count(),
                "total_appointments": Appointment.objects.count(),
                "upcoming_today": AppointmentSerializer(upcoming_today, many=True).data,
                "recent_appointments": AppointmentSerializer(recent, many=True).data,
            }
        )


class SpecialityListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = SpecialitySerializer
    queryset = Speciality.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(name__icontains=q)
        active = self.request.query_params.get("is_active")
        if active is not None:
            qs = qs.filter(is_active=active.lower() in ("1", "true", "yes"))
        return qs


class SpecialityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = SpecialitySerializer
    queryset = Speciality.objects.all()


class DoctorOnboardingView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = DoctorOnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doctor = serializer.save()
        return Response(
            DoctorProfileSerializer(doctor).data,
            status=status.HTTP_201_CREATED,
        )


class DoctorListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = DoctorProfileSerializer

    def get_queryset(self):
        qs = DoctorProfile.objects.select_related("user").prefetch_related("specialities")
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(user__email__icontains=q)
            )
        speciality = self.request.query_params.get("speciality")
        if speciality:
            qs = qs.filter(specialities__id=speciality)
        active = self.request.query_params.get("is_active")
        if active is not None:
            qs = qs.filter(is_active=active.lower() in ("1", "true", "yes"))
        return qs.distinct()


class DoctorDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = DoctorProfileSerializer
    queryset = DoctorProfile.objects.select_related("user").prefetch_related("specialities")
    lookup_field = "uuid"
    lookup_url_kwarg = "uuid"

    def perform_destroy(self, instance):
        # Cascade removes DoctorProfile via OneToOne; drop login account too.
        user = instance.user
        user.delete()


class DoctorAvailabilityListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsDoctor]
    serializer_class = DoctorAvailabilitySerializer

    def get_doctor(self):
        return self.request.user.doctor_profile

    def get_queryset(self):
        return DoctorAvailability.objects.filter(doctor=self.get_doctor())

    def perform_create(self, serializer):
        serializer.save(doctor=self.get_doctor())


class AdminDoctorAvailabilityListView(generics.ListAPIView):
    """Admin read-only view of a doctor's weekly availability."""

    permission_classes = [IsAdmin]
    serializer_class = DoctorAvailabilitySerializer
    pagination_class = None

    def get_queryset(self):
        doctor_uuid = self.kwargs["uuid"]
        return DoctorAvailability.objects.filter(doctor__uuid=doctor_uuid).order_by(
            "weekday", "start_time"
        )


class DoctorAppointmentListView(generics.ListAPIView):
    permission_classes = [IsDoctor]
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        qs = Appointment.objects.filter(
            doctor=self.request.user.doctor_profile
        ).select_related("patient", "doctor")
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs
