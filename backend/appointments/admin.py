from django.contrib import admin

from .models import Appointment, ClinicalNote, Prescription, PrescriptionItem


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("appointment", "created_at")
    inlines = [PrescriptionItemInline]


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = ("appointment", "created_at")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "doctor", "scheduled_at", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("patient__name", "patient__phone", "doctor__first_name", "doctor__last_name")
