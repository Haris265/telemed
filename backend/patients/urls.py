from django.urls import path

from .views import (
    ClinicInfoView,
    MeView,
    PatientAppointmentListCreateView,
    PatientAppointmentQueueView,
    PatientDoctorAvailabilityView,
    PatientDoctorListView,
    PatientSpecialityListView,
    RequestOtpView,
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
]
