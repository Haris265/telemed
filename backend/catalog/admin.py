from django.contrib import admin

from .models import DoctorAvailability, DoctorProfile, Speciality


@admin.register(Speciality)
class SpecialityAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    search_fields = ("name",)


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "session_time", "is_active", "created_at")
    list_filter = ("is_active", "specialities")
    search_fields = ("first_name", "last_name", "user__email")
    filter_horizontal = ("specialities",)


@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("doctor", "weekday", "start_time", "end_time", "is_active")
    list_filter = ("weekday", "is_active")
