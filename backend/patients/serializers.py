import random
import re
import string

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from appointments.serializers import AppointmentSerializer
from catalog.models import DoctorProfile, Speciality
from catalog.serializers import SpecialitySerializer

from .models import PatientProfile

User = get_user_model()


def normalize_phone(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit())


def clean_name(value: str) -> str:
    name = re.sub(r"\s+", " ", (value or "").strip())
    if len(name) < 2 or name.isdigit():
        return ""
    return name[:150]


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def issue_tokens_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["email"] = user.email
    refresh["full_name"] = user.get_full_name() or user.username
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ("id", "uuid", "phone", "name", "is_verified", "created_at", "updated_at")
        read_only_fields = ("uuid", "phone", "is_verified", "created_at", "updated_at")


class PatientDetailSerializer(PatientProfileSerializer):
    appointments = serializers.SerializerMethodField()

    class Meta(PatientProfileSerializer.Meta):
        fields = (*PatientProfileSerializer.Meta.fields, "appointments")

    def get_appointments(self, obj):
        qs = obj.appointments.select_related("doctor").order_by(
            "-token_date", "token_number", "-created_at"
        )
        return AppointmentSerializer(qs, many=True).data


class RequestOtpSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)

    def validate_phone(self, value):
        phone = normalize_phone(value)
        if len(phone) < 10:
            raise serializers.ValidationError("Enter a valid phone number.")
        return phone


class VerifyOtpSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    otp = serializers.CharField(max_length=6)
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_phone(self, value):
        phone = normalize_phone(value)
        if len(phone) < 10:
            raise serializers.ValidationError("Enter a valid phone number.")
        return phone

    def validate_otp(self, value):
        otp = (value or "").strip()
        if not otp.isdigit() or len(otp) != 6:
            raise serializers.ValidationError("OTP must be 6 digits.")
        return otp

    def validate(self, attrs):
        phone = attrs["phone"]
        cached = cache.get(f"otp:{phone}")
        if not cached or str(cached) != attrs["otp"]:
            raise serializers.ValidationError({"otp": "Invalid or expired OTP."})
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        phone = self.validated_data["phone"]
        name_in = clean_name(self.validated_data.get("name") or "")
        patient = PatientProfile.objects.filter(phone=phone).first()

        if patient:
            if name_in and (not patient.name or patient.name.isdigit()):
                patient.name = name_in
            patient.is_verified = True
            patient.save()
        else:
            if not name_in:
                raise serializers.ValidationError(
                    {"name": "Full name is required for new patients."}
                )
            patient = PatientProfile.objects.create(
                phone=phone,
                name=name_in,
                is_verified=True,
            )

        username = f"patient_{phone}"
        user = patient.user
        if user is None:
            user = User.objects.filter(username=username).first()
            if user is None:
                user = User(
                    username=username,
                    role=User.Role.PATIENT,
                    first_name=patient.name.split()[0][:30],
                    last_name=" ".join(patient.name.split()[1:])[:150],
                )
                user.set_unusable_password()
                user.save()
            else:
                user.role = User.Role.PATIENT
                user.save(update_fields=["role"])
            patient.user = user
            patient.save(update_fields=["user", "updated_at"])
        else:
            if user.role != User.Role.PATIENT:
                user.role = User.Role.PATIENT
                user.save(update_fields=["role"])

        cache.delete(f"otp:{phone}")
        tokens = issue_tokens_for_user(user)
        return {
            **tokens,
            "patient": PatientProfileSerializer(patient).data,
            "needs_name": False,
        }


class PatientDoctorSerializer(serializers.ModelSerializer):
    specialities = SpecialitySerializer(many=True, read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = DoctorProfile
        fields = (
            "id",
            "uuid",
            "first_name",
            "last_name",
            "full_name",
            "specialities",
            "session_time",
            "is_active",
        )


class PatientBookSerializer(serializers.Serializer):
    doctor_uuid = serializers.UUIDField()
    token_date = serializers.DateField()

    def validate(self, attrs):
        from appointments.services import upcoming_available_dates

        doctor = DoctorProfile.objects.filter(
            uuid=attrs["doctor_uuid"], is_active=True
        ).first()
        if not doctor:
            raise serializers.ValidationError(
                {"doctor_uuid": "Doctor not found or inactive."}
            )
        token_date = attrs["token_date"]
        options = upcoming_available_dates(doctor)
        allowed = {o["date"] for o in options}
        if token_date.isoformat() not in allowed:
            raise serializers.ValidationError(
                {"token_date": "Selected date is not available for this doctor."}
            )
        match = next(o for o in options if o["date"] == token_date.isoformat())
        attrs["start"] = match["start"]
        attrs["doctor"] = doctor
        return attrs