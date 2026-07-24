import logging
import random
import string
from datetime import timedelta

from django.core.cache import cache
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from appointments.models import Appointment
from catalog.models import DoctorProfile, Speciality
from patients.models import PatientProfile

from .models import WhatsAppSession

logger = logging.getLogger(__name__)

MENU_TEXT = (
    "Welcome to Telemed.\n\n"
    "Reply with:\n"
    "1. Request OTP for Login\n"
    "2. Book today's appointment\n"
    "3. View My Appointments"
)


def _normalize_phone(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit())


def _get_or_create_session(phone: str) -> WhatsAppSession:
    session, _ = WhatsAppSession.objects.get_or_create(phone=phone)
    return session


def _message_text(msg: dict) -> str:
    if msg.get("type") == "text":
        return (msg.get("text") or {}).get("body", "").strip()
    if msg.get("type") == "button":
        return ((msg.get("button") or {}).get("text") or "").strip()
    if msg.get("type") == "interactive":
        interactive = msg.get("interactive") or {}
        if interactive.get("type") == "button_reply":
            return ((interactive.get("button_reply") or {}).get("title") or "").strip()
        if interactive.get("type") == "list_reply":
            return ((interactive.get("list_reply") or {}).get("title") or "").strip()
    return ""


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def _parse_choice_index(text: str, count: int) -> int | None:
    raw = text.strip()
    if not raw.isdigit():
        return None
    idx = int(raw)
    if 1 <= idx <= count:
        return idx - 1
    return None


def _active_specialities():
    return list(Speciality.objects.filter(is_active=True).order_by("name"))


def _active_doctors_for_speciality(speciality_id: int):
    return list(
        DoctorProfile.objects.filter(
            is_active=True,
            specialities__id=speciality_id,
        )
        .distinct()
        .order_by("first_name", "last_name")
    )


def _format_specialities(items: list[Speciality]) -> str:
    lines = ["Select a speciality (reply with number):"]
    for i, s in enumerate(items, start=1):
        lines.append(f"{i}. {s.name}")
    lines.append("\nReply 0 to cancel.")
    return "\n".join(lines)


def _format_doctors(items: list[DoctorProfile]) -> str:
    lines = ["Select a doctor (reply with number):"]
    for i, d in enumerate(items, start=1):
        lines.append(f"{i}. Dr. {d.full_name} ({d.session_time} min)")
    lines.append("\nReply 0 to cancel.")
    return "\n".join(lines)


def _format_appointments(patient: PatientProfile) -> str:
    today = timezone.localdate()
    appts = (
        Appointment.objects.filter(
            patient=patient,
            status=Appointment.Status.UPCOMING,
            token_date__gte=today,
        )
        .select_related("doctor")
        .order_by("token_date", "token_number")[:10]
    )
    if not appts:
        return "No upcoming appointments."

    lines = ["Your upcoming appointments:"]
    for a in appts:
        when = a.token_date.strftime("%d %b %Y")
        lines.append(f"• Token #{a.token_number} — Dr. {a.doctor.full_name} — {when}")
    return "\n".join(lines)


def _book_today_token(patient: PatientProfile, doctor: DoctorProfile) -> Appointment:
    today = timezone.localdate()
    now = timezone.now()

    with transaction.atomic():
        existing = (
            Appointment.objects.select_for_update()
            .filter(
                patient=patient,
                doctor=doctor,
                token_date=today,
                status=Appointment.Status.UPCOMING,
            )
            .first()
        )
        if existing:
            raise ValueError(
                f"You already have Token #{existing.token_number} "
                f"with Dr. {doctor.full_name} today."
            )

        locked = (
            Appointment.objects.select_for_update()
            .filter(doctor=doctor, token_date=today)
            .aggregate(m=Max("token_number"))
        )
        next_token = (locked["m"] or 0) + 1
        scheduled_at = now + timedelta(minutes=doctor.session_time * (next_token - 1))

        return Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            scheduled_at=scheduled_at,
            token_date=today,
            token_number=next_token,
            status=Appointment.Status.UPCOMING,
            notes="Booked via WhatsApp",
        )


def _reset_to_menu(session: WhatsAppSession) -> None:
    session.state = WhatsAppSession.State.MENU
    session.context = {}
    session.save(update_fields=["state", "context", "updated_at"])


def _start_booking(session: WhatsAppSession, client, phone: str) -> None:
    specialities = _active_specialities()
    if not specialities:
        client.send_text(phone, "No specialities available right now. Please try later.")
        _reset_to_menu(session)
        return
    session.state = WhatsAppSession.State.AWAITING_SPECIALITY
    session.context = {"speciality_ids": [s.id for s in specialities]}
    session.save(update_fields=["state", "context", "updated_at"])
    client.send_text(phone, _format_specialities(specialities))


def handle_inbound_message(msg: dict, client) -> None:
    phone = _normalize_phone(str(msg.get("from", "")))
    if not phone:
        return

    message_id = str(msg.get("id", ""))
    session = _get_or_create_session(phone)
    if message_id and session.last_message_id == message_id:
        return
    if message_id:
        session.last_message_id = message_id
        session.save(update_fields=["last_message_id", "updated_at"])

    text = _message_text(msg)
    if not text:
        return

    patient = PatientProfile.objects.filter(phone=phone).first()

    # New patient onboarding
    if not patient:
        if session.state == WhatsAppSession.State.AWAITING_NAME:
            name = text.strip()
            if len(name) < 2:
                client.send_text(phone, "Please send your full name (at least 2 characters).")
                return
            PatientProfile.objects.create(phone=phone, name=name)
            _reset_to_menu(session)
            client.send_text(
                phone,
                f"Thanks {name}! Your Telemed profile is ready.\n\n{MENU_TEXT}",
            )
            return

        session.state = WhatsAppSession.State.AWAITING_NAME
        session.save(update_fields=["state", "updated_at"])
        client.send_text(
            phone,
            "Welcome to Telemed! We don't have your profile yet.\n"
            "Please reply with your full name to create an account.",
        )
        return

    choice = text.strip().lower()

    # Speciality selection
    if session.state == WhatsAppSession.State.AWAITING_SPECIALITY:
        if choice in ("0", "cancel", "menu"):
            _reset_to_menu(session)
            client.send_text(phone, MENU_TEXT)
            return
        ids = session.context.get("speciality_ids") or []
        specialities = list(Speciality.objects.filter(id__in=ids, is_active=True))
        # Preserve listed order from context ids
        by_id = {s.id: s for s in specialities}
        ordered = [by_id[i] for i in ids if i in by_id]
        idx = _parse_choice_index(text, len(ordered))
        if idx is None:
            client.send_text(phone, "Invalid choice.\n\n" + _format_specialities(ordered))
            return
        speciality = ordered[idx]
        doctors = _active_doctors_for_speciality(speciality.id)
        if not doctors:
            client.send_text(
                phone,
                f"No doctors available for {speciality.name} right now.\n\n" + MENU_TEXT,
            )
            _reset_to_menu(session)
            return
        session.state = WhatsAppSession.State.AWAITING_DOCTOR
        session.context = {
            "speciality_id": speciality.id,
            "doctor_ids": [d.id for d in doctors],
        }
        session.save(update_fields=["state", "context", "updated_at"])
        client.send_text(
            phone,
            f"{speciality.name}\n\n" + _format_doctors(doctors),
        )
        return

    # Doctor selection → book token
    if session.state == WhatsAppSession.State.AWAITING_DOCTOR:
        if choice in ("0", "cancel", "menu"):
            _reset_to_menu(session)
            client.send_text(phone, MENU_TEXT)
            return
        ids = session.context.get("doctor_ids") or []
        doctors = list(DoctorProfile.objects.filter(id__in=ids, is_active=True))
        by_id = {d.id: d for d in doctors}
        ordered = [by_id[i] for i in ids if i in by_id]
        idx = _parse_choice_index(text, len(ordered))
        if idx is None:
            client.send_text(phone, "Invalid choice.\n\n" + _format_doctors(ordered))
            return
        doctor = ordered[idx]
        try:
            appt = _book_today_token(patient, doctor)
        except ValueError as exc:
            _reset_to_menu(session)
            client.send_text(phone, f"{exc}\n\n{MENU_TEXT}")
            return
        except Exception:
            logger.exception("Booking failed for %s / doctor %s", phone, doctor.id)
            _reset_to_menu(session)
            client.send_text(phone, "Booking failed. Please try again.\n\n" + MENU_TEXT)
            return

        when = appt.token_date.strftime("%d %b %Y")
        _reset_to_menu(session)
        client.send_text(
            phone,
            "Booked!\n"
            f"Doctor: Dr. {doctor.full_name}\n"
            f"Date: {when}\n"
            f"Your token: #{appt.token_number}\n"
            "Show this token at the clinic.\n\n"
            f"{MENU_TEXT}",
        )
        return

    if session.state == WhatsAppSession.State.AWAITING_OTP and choice not in (
        "1",
        "2",
        "3",
        "otp",
        "login",
        "book",
        "appointments",
        "appointment",
        "menu",
    ):
        cached = cache.get(f"otp:{phone}")
        if cached and text.strip() == str(cached):
            patient.is_verified = True
            patient.save(update_fields=["is_verified", "updated_at"])
            cache.delete(f"otp:{phone}")
            _reset_to_menu(session)
            client.send_text(phone, "Login successful. You are verified.\n\n" + MENU_TEXT)
        else:
            client.send_text(phone, "Invalid or expired OTP. Reply 1 to request a new OTP.")
            _reset_to_menu(session)
        return

    if choice in ("1", "otp", "login"):
        otp = _generate_otp()
        cache.set(f"otp:{phone}", otp, timeout=300)
        session.state = WhatsAppSession.State.AWAITING_OTP
        session.context = {}
        session.save(update_fields=["state", "context", "updated_at"])
        client.send_text(
            phone,
            f"Your Telemed login OTP is: {otp}\nIt expires in 5 minutes.\nReply with the OTP to verify.",
        )
        return

    if choice in ("2", "book"):
        _start_booking(session, client, phone)
        return

    if choice in ("3", "appointments", "appointment"):
        client.send_text(phone, _format_appointments(patient))
        _reset_to_menu(session)
        return

    _reset_to_menu(session)
    client.send_text(phone, f"Hi {patient.name}!\n\n{MENU_TEXT}")
