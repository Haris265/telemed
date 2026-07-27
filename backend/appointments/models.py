from django.db import models
from django.db.models import UniqueConstraint
from django.utils import timezone

from catalog.models import DoctorProfile
from patients.models import PatientProfile


class Appointment(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        REJECTED = "rejected", "Rejected"

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    scheduled_at = models.DateTimeField()
    token_date = models.DateField(db_index=True)
    token_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPCOMING,
    )
    notes = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            UniqueConstraint(
                fields=["doctor", "token_date", "token_number"],
                name="uniq_doctor_token_per_day",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.token_date:
            self.token_date = timezone.localdate()
        super().save(*args, **kwargs)

    @staticmethod
    def doctor_initials(doctor: DoctorProfile) -> str:
        parts = [doctor.first_name.strip(), doctor.last_name.strip()]
        initials = "".join(part[0].upper() for part in parts if part)
        return initials or "DR"

    @property
    def token_code(self) -> str:
        prefix = self.doctor_initials(self.doctor)
        return f"{prefix}-{self.token_number:03d}"

    def __str__(self):
        return f"{self.token_code} {self.patient} → {self.doctor} @ {self.token_date}"


class ClinicalNote(models.Model):
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="clinical_note",
    )
    subjective = models.TextField(blank=True, default="")
    objective = models.TextField(blank=True, default="")
    assessment = models.TextField(blank=True, default="")
    plan = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"SOAP for {self.appointment.token_code}"


class Prescription(models.Model):
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="prescription",
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Rx for {self.appointment.token_code}"


class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name="items",
    )
    medicine_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100, blank=True, default="")
    frequency = models.CharField(max_length=100, blank=True, default="")
    duration = models.CharField(max_length=100, blank=True, default="")
    instructions = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.medicine_name
