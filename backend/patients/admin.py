from django.contrib import admin

from .models import PatientProfile


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "is_verified", "user", "created_at")
    search_fields = ("name", "phone")
    list_filter = ("is_verified",)
    raw_id_fields = ("user",)
