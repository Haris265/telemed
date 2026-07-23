import logging
import random
import string
from django.core.cache import cache
from django.utils import timezone

from appointments.models import Appointment
from patients.models import PatientProfile

from .models import WhatsAppSession

logger = logging.getLogger(__name__)

MENU_TEXT = (
    "Welcome to Telemed.\n\n"
    "Reply with:\n"
    "1. Request OTP for Login\n"
    "2. View My Appointments"
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


def _format_appointments(patient: PatientProfile) -> str:
    now = timezone.now()
    appts = (
        Appointment.objects.filter(
            patient=patient,
            status=Appointment.Status.UPCOMING,
            scheduled_at__gte=now,
        )
        .select_related("doctor")
        .order_by("scheduled_at")[:10]
    )
    if not appts:
        return "No upcoming appointments."

    lines = ["Your upcoming appointments:"]
    for a in appts:
        when = timezone.localtime(a.scheduled_at).strftime("%d %b %Y, %I:%M %p")
        lines.append(f"• Dr. {a.doctor.full_name} — {when} ({a.status})")
    return "\n".join(lines)


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
            session.state = WhatsAppSession.State.MENU
            session.save(update_fields=["state", "updated_at"])
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

    # Existing patient
    choice = text.strip().lower()

    if session.state == WhatsAppSession.State.AWAITING_OTP and choice not in (
        "1",
        "2",
        "otp",
        "login",
        "appointments",
        "appointment",
        "menu",
    ):
        cached = cache.get(f"otp:{phone}")
        if cached and text.strip() == str(cached):
            patient.is_verified = True
            patient.save(update_fields=["is_verified", "updated_at"])
            cache.delete(f"otp:{phone}")
            session.state = WhatsAppSession.State.MENU
            session.save(update_fields=["state", "updated_at"])
            client.send_text(phone, "Login successful. You are verified.\n\n" + MENU_TEXT)
        else:
            client.send_text(phone, "Invalid or expired OTP. Reply 1 to request a new OTP.")
            session.state = WhatsAppSession.State.MENU
            session.save(update_fields=["state", "updated_at"])
        return

    if choice in ("1", "otp", "login"):
        otp = _generate_otp()
        cache.set(f"otp:{phone}", otp, timeout=300)
        session.state = WhatsAppSession.State.AWAITING_OTP
        session.save(update_fields=["state", "updated_at"])
        client.send_text(
            phone,
            f"Your Telemed login OTP is: {otp}\nIt expires in 5 minutes.\nReply with the OTP to verify.",
        )
        return

    if choice in ("2", "appointments", "appointment"):
        client.send_text(phone, _format_appointments(patient))
        session.state = WhatsAppSession.State.MENU
        session.save(update_fields=["state", "updated_at"])
        return

    session.state = WhatsAppSession.State.MENU
    session.save(update_fields=["state", "updated_at"])
    client.send_text(phone, f"Hi {patient.name}!\n\n{MENU_TEXT}")
