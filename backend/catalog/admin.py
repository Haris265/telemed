from django.contrib import admin

from .models import Clinic, DoctorAvailability, DoctorProfile, DoctorSubscription, Speciality


@admin.register(Speciality)
class SpecialityAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    search_fields = ("name",)


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "phone", "is_active", "created_at")
    list_filter = ("is_active", "city")
    search_fields = ("name", "address", "city", "phone")


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "clinic", "session_time", "is_active", "created_at")
    list_filter = ("is_active", "specialities", "clinic")
    search_fields = ("first_name", "last_name", "user__email")
    filter_horizontal = ("specialities",)
    raw_id_fields = ("clinic",)


@admin.register(DoctorSubscription)
class DoctorSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "doctor",
        "amount",
        "payment_method",
        "start_date",
        "end_date",
        "is_active",
        "created_at",
    )
    list_filter = ("payment_method", "is_active")
    search_fields = ("doctor__first_name", "doctor__last_name")


@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("doctor", "weekday", "start_time", "end_time", "is_active")
    list_filter = ("weekday", "is_active")
