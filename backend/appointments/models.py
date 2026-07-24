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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-token_date", "token_number"]
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

    def __str__(self):
        return f"#{self.token_number} {self.patient} → {self.doctor} @ {self.token_date}"
