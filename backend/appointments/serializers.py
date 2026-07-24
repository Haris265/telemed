from rest_framework import serializers

from catalog.models import DoctorProfile
from patients.models import PatientProfile

from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_phone = serializers.CharField(source="patient.phone", read_only=True)
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "patient",
            "patient_name",
            "patient_phone",
            "doctor",
            "doctor_name",
            "scheduled_at",
            "token_date",
            "token_number",
            "status",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at", "token_date", "token_number")


class AppointmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = (
            "patient",
            "doctor",
            "scheduled_at",
            "token_date",
            "token_number",
            "status",
            "notes",
        )

    def validate_doctor(self, value: DoctorProfile):
        if not value.is_active:
            raise serializers.ValidationError("Doctor is not active.")
        return value

    def validate_patient(self, value: PatientProfile):
        return value
