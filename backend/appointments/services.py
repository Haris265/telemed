from __future__ import annotations

from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from catalog.models import DoctorAvailability, DoctorProfile
from patients.models import PatientProfile

from .models import Appointment


def format_clock(t: time) -> str:
    return t.strftime("%I:%M %p").lstrip("0")


def upcoming_available_dates(
    doctor: DoctorProfile,
    *,
    days_ahead: int = 21,
    limit: int = 10,
) -> list[dict]:
    """Return upcoming dates matching doctor's active weekday availability."""
    today = timezone.localdate()
    slots = list(
        DoctorAvailability.objects.filter(doctor=doctor, is_active=True).order_by(
            "weekday",
            "start_time",
        )
    )
    by_weekday: dict[int, list[DoctorAvailability]] = {}
    for slot in slots:
        by_weekday.setdefault(slot.weekday, []).append(slot)

    options: list[dict] = []
    for offset in range(0, days_ahead + 1):
        day = today + timedelta(days=offset)
        weekday = day.weekday()
        day_slots = by_weekday.get(weekday)
        if day_slots:
            slot = day_slots[0]
            options.append(
                {
                    "date": day.isoformat(),
                    "label": day.strftime("%a %d %b %Y"),
                    "start": slot.start_time.strftime("%H:%M:%S"),
                    "end": slot.end_time.strftime("%H:%M:%S"),
                    "timing": f"{format_clock(slot.start_time)} – {format_clock(slot.end_time)}",
                }
            )
        elif not slots and offset < 7:
            options.append(
                {
                    "date": day.isoformat(),
                    "label": day.strftime("%a %d %b %Y"),
                    "start": "09:00:00",
                    "end": "17:00:00",
                    "timing": "9:00 AM – 5:00 PM (default)",
                }
            )
        if len(options) >= limit:
            break
    return options


def book_token(
    patient: PatientProfile,
    doctor: DoctorProfile,
    token_date: date,
    start_time: time | None = None,
    *,
    notes: str = "Booked via WhatsApp",
) -> Appointment:
    with transaction.atomic():
        existing = (
            Appointment.objects.select_for_update()
            .filter(
                patient=patient,
                doctor=doctor,
                token_date=token_date,
                status=Appointment.Status.UPCOMING,
            )
            .first()
        )
        if existing:
            raise ValueError(
                f"You already have Token {existing.token_code} "
                f"with Dr. {doctor.full_name} on {token_date.strftime('%d %b %Y')}."
            )

        locked = (
            Appointment.objects.select_for_update()
            .filter(doctor=doctor, token_date=token_date)
            .aggregate(m=Max("token_number"))
        )
        next_token = (locked["m"] or 0) + 1

        base = datetime.combine(token_date, start_time or time(9, 0))
        if timezone.is_naive(base):
            base = timezone.make_aware(base, timezone.get_current_timezone())
        scheduled_at = base + timedelta(minutes=doctor.session_time * (next_token - 1))

        return Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            scheduled_at=scheduled_at,
            token_date=token_date,
            token_number=next_token,
            status=Appointment.Status.UPCOMING,
            notes=notes,
        )


def queue_info(appointment: Appointment) -> dict:
    """Token queue / ETA details for a single appointment."""
    people_ahead = max(appointment.token_number - 1, 0)
    estimated = appointment.scheduled_at
    local_estimated = timezone.localtime(estimated)
    approx = format_clock(local_estimated.time())
    date_label = appointment.token_date.strftime("%d %b %Y")
    message = (
        f"Your token is {appointment.token_code}. "
        f"Approx time {approx} on {date_label} — please arrive a few minutes early."
    )
    return {
        "appointment_id": appointment.id,
        "token_code": appointment.token_code,
        "token_number": appointment.token_number,
        "token_date": appointment.token_date.isoformat(),
        "position": appointment.token_number,
        "people_ahead": people_ahead,
        "estimated_at": estimated.isoformat(),
        "doctor_name": appointment.doctor.full_name,
        "status": str(appointment.status),
        "message": message,
    }
