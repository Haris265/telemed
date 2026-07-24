from django.urls import path

from appointments.views import (
    AdminAppointmentDetailView,
    AdminAppointmentListCreateView,
    AdminPatientDetailView,
    AdminPatientListView,
)

from .views import (
    AdminDoctorAvailabilityListView,
    DashboardStatsView,
    DoctorAppointmentListView,
    DoctorAvailabilityListCreateView,
    DoctorDetailView,
    DoctorListView,
    DoctorOnboardingView,
    SpecialityDetailView,
    SpecialityListCreateView,
)

urlpatterns = [
    path("dashboard/", DashboardStatsView.as_view(), name="admin-dashboard"),
    path("specialities/", SpecialityListCreateView.as_view(), name="admin-specialities"),
    path(
        "specialities/<int:pk>/",
        SpecialityDetailView.as_view(),
        name="admin-speciality-detail",
    ),
    path("doctors/onboarding/", DoctorOnboardingView.as_view(), name="admin-doctor-onboard"),
    path("doctors/", DoctorListView.as_view(), name="admin-doctors"),
    path(
        "doctors/<uuid:uuid>/availability/",
        AdminDoctorAvailabilityListView.as_view(),
        name="admin-doctor-availability",
    ),
    path("doctors/<uuid:uuid>/", DoctorDetailView.as_view(), name="admin-doctor-detail"),
    path("patients/", AdminPatientListView.as_view(), name="admin-patients"),
    path(
        "patients/<uuid:uuid>/",
        AdminPatientDetailView.as_view(),
        name="admin-patient-detail",
    ),
    path("appointments/", AdminAppointmentListCreateView.as_view(), name="admin-appointments"),
    path(
        "appointments/<int:pk>/",
        AdminAppointmentDetailView.as_view(),
        name="admin-appointment-detail",
    ),
]

doctor_urlpatterns = [
    path("availability/", DoctorAvailabilityListCreateView.as_view(), name="doctor-availability"),
    path("appointments/", DoctorAppointmentListView.as_view(), name="doctor-appointments"),
]
