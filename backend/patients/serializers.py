from rest_framework import serializers

from .models import PatientProfile


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ("id", "phone", "name", "is_verified", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")
