from django.urls import path

from .views import (
    ClinicInfoView,
    MeView,
    NearbyClinicsView,
    PatientAppointmentListCreateView,
    PatientAppointmentQueueView,
    PatientClinicDetailView,
    PatientDoctorAvailabilityView,
    PatientDoctorListView,
    PatientSpecialityListView,
    PatientTokenLookupView,
    RequestOtpView,
    SymptomCheckView,
    VerifyOtpView,
)

urlpatterns = [
    path("clinic/", ClinicInfoView.as_view(), name="patient-clinic"),
    path("auth/request-otp/", RequestOtpView.as_view(), name="patient-request-otp"),
    path("auth/verify-otp/", VerifyOtpView.as_view(), name="patient-verify-otp"),
    path("me/", MeView.as_view(), name="patient-me"),
    path("specialities/", PatientSpecialityListView.as_view(), name="patient-specialities"),
    path("doctors/", PatientDoctorListView.as_view(), name="patient-doctors"),
    path(
        "doctors/<uuid:uuid>/availability/",
        PatientDoctorAvailabilityView.as_view(),
        name="patient-doctor-availability",
    ),
    path(
        "appointments/",
        PatientAppointmentListCreateView.as_view(),
        name="patient-appointments",
    ),
    path(
        "appointments/<int:pk>/queue/",
        PatientAppointmentQueueView.as_view(),
        name="patient-appointment-queue",
    ),
    path(
        "queue/lookup/",
        PatientTokenLookupView.as_view(),
        name="patient-queue-lookup",
    ),
    path(
        "symptoms/check/",
        SymptomCheckView.as_view(),
        name="patient-symptoms-check",
    ),
    path(
        "clinics/nearby/",
        NearbyClinicsView.as_view(),
        name="patient-clinics-nearby",
    ),
    path(
        "clinics/<int:pk>/",
        PatientClinicDetailView.as_view(),
        name="patient-clinic-detail",
    ),
]
