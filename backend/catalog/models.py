from django.conf import settings
from django.db import models


class Speciality(models.Model):
    name = models.CharField(max_length=120, unique=True)
    icon = models.ImageField(upload_to="specialities/", blank=True, null=True)
    icon_url = models.URLField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "specialities"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def display_icon(self):
        if self.icon:
            return self.icon.url
        return self.icon_url


class DoctorProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="doctor_profile",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    specialities = models.ManyToManyField(Speciality, related_name="doctors", blank=True)
    session_time = models.PositiveIntegerField(
        default=15,
        help_text="Consultation session length in minutes",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class DoctorAvailability(models.Model):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name="availabilities",
    )
    weekday = models.IntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["weekday", "start_time"]
        verbose_name_plural = "doctor availabilities"

    def __str__(self):
        return f"{self.doctor} — {self.get_weekday_display()} {self.start_time}-{self.end_time}"
