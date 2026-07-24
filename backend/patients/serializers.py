from rest_framework import serializers

from appointments.serializers import AppointmentSerializer

from .models import PatientProfile


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ("id", "uuid", "phone", "name", "is_verified", "created_at", "updated_at")
        read_only_fields = ("uuid", "created_at", "updated_at")


class PatientDetailSerializer(PatientProfileSerializer):
    appointments = serializers.SerializerMethodField()

    class Meta(PatientProfileSerializer.Meta):
        fields = (*PatientProfileSerializer.Meta.fields, "appointments")

    def get_appointments(self, obj):
        qs = obj.appointments.select_related("doctor").order_by(
            "-token_date", "token_number", "-created_at"
        )
        return AppointmentSerializer(qs, many=True).data
