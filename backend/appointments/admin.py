from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "scheduled_at", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("patient__name", "patient__phone", "doctor__first_name", "doctor__last_name")
