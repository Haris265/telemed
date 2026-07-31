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
    days_ahead: int = 42,
    limit: int = 42,
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
    """Live token queue / ETA for a single appointment."""
    doctor = appointment.doctor
    day = appointment.token_date
    session_mins = max(int(doctor.session_time or 15), 1)
    today = timezone.localdate()
    now = timezone.now()

    day_qs = Appointment.objects.filter(doctor=doctor, token_date=day).exclude(
        status=Appointment.Status.CANCELLED
    )

    # Currently serving = lowest remaining upcoming token for this doctor/day
    now_serving_appt = (
        day_qs.filter(status=Appointment.Status.UPCOMING)
        .order_by("token_number")
        .first()
    )
    now_serving_number = now_serving_appt.token_number if now_serving_appt else None
    now_serving_code = now_serving_appt.token_code if now_serving_appt else None

    completed_count = day_qs.filter(status=Appointment.Status.COMPLETED).count()
    total_upcoming = day_qs.filter(status=Appointment.Status.UPCOMING).count()

    people_ahead = day_qs.filter(
        status=Appointment.Status.UPCOMING,
        token_number__lt=appointment.token_number,
    ).count()

    status_value = str(appointment.status)
    wait_minutes = 0
    phase = "waiting"

    if appointment.status == Appointment.Status.COMPLETED:
        phase = "completed"
        message = (
            f"Token {appointment.token_code} is done. "
            "Thank you — hope you feel better soon."
        )
    elif appointment.status == Appointment.Status.CANCELLED:
        phase = "cancelled"
        message = f"Token {appointment.token_code} was cancelled."
    elif (
        now_serving_number is not None
        and now_serving_number == appointment.token_number
    ):
        phase = "now"
        wait_minutes = 0
        message = (
            f"It's your turn now — Token {appointment.token_code}. "
            "Please proceed to the doctor."
        )
    else:
        phase = "waiting"
        wait_minutes = people_ahead * session_mins
        serving_label = now_serving_code or "—"
        if wait_minutes <= 0:
            message = (
                f"Now serving {serving_label}. "
                f"Your token {appointment.token_code} is next — stay nearby."
            )
        elif wait_minutes < 60:
            message = (
                f"Now serving {serving_label}. "
                f"About {wait_minutes} min until Token {appointment.token_code}."
            )
        else:
            hours = wait_minutes // 60
            mins = wait_minutes % 60
            eta_label = f"{hours}h {mins}m" if mins else f"{hours}h"
            message = (
                f"Now serving {serving_label}. "
                f"About {eta_label} until Token {appointment.token_code}."
            )

    if day == today and phase in ("waiting", "now"):
        estimated = now + timedelta(minutes=wait_minutes)
    else:
        estimated = appointment.scheduled_at

    local_estimated = timezone.localtime(estimated)
    approx = format_clock(local_estimated.time())
    date_label = appointment.token_date.strftime("%d %b %Y")

    return {
        "appointment_id": appointment.id,
        "token_code": appointment.token_code,
        "token_number": appointment.token_number,
        "token_date": appointment.token_date.isoformat(),
        "is_today": day == today,
        "position": appointment.token_number,
        "people_ahead": people_ahead,
        "wait_minutes": wait_minutes,
        "session_minutes": session_mins,
        "now_serving_number": now_serving_number,
        "now_serving_code": now_serving_code,
        "completed_count": completed_count,
        "upcoming_count": total_upcoming,
        "phase": phase,
        "estimated_at": estimated.isoformat(),
        "approx_time": approx,
        "date_label": date_label,
        "doctor_name": doctor.full_name,
        "doctor_id": doctor.id,
        "status": status_value,
        "message": message,
        "updated_at": now.isoformat(),
    }


def lookup_patient_token(
    patient: PatientProfile,
    query: str,
    *,
    today_only: bool = True,
) -> Appointment | None:
    """Find a patient's appointment by token code (AH-003) or token number (3)."""
    raw = (query or "").strip().upper()
    if not raw:
        return None

    qs = Appointment.objects.filter(patient=patient).select_related("doctor")
    if today_only:
        qs = qs.filter(token_date=timezone.localdate())

    # Full token code e.g. AH-003 or AH003
    compact = raw.replace(" ", "")
    if "-" in compact or any(ch.isalpha() for ch in compact):
        for appt in qs.order_by("-token_date", "token_number"):
            code = appt.token_code.upper().replace(" ", "")
            if code == compact or code.replace("-", "") == compact.replace("-", ""):
                return appt

    # Numeric token number
    digits = "".join(ch for ch in raw if ch.isdigit())
    if digits:
        num = int(digits)
        match = qs.filter(token_number=num).order_by("-token_date", "token_number").first()
        if match:
            return match

    return None
