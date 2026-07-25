import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class MetaWhatsAppClient:
    def __init__(self):
        self.token = settings.META_WA_TOKEN
        self.phone_number_id = settings.META_WA_PHONE_NUMBER_ID
        self.graph_base = "https://graph.facebook.com/v21.0"
        self.base_url = f"{self.graph_base}/{self.phone_number_id}/messages"

    def get_display_phone_digits(self) -> str:
        """Return clinic WhatsApp digits (E.164 without +) from Meta phone number id."""
        if not self.token or not self.phone_number_id:
            return ""
        url = f"{self.graph_base}/{self.phone_number_id}"
        headers = {"Authorization": f"Bearer {self.token}"}
        try:
            resp = requests.get(
                url,
                headers=headers,
                params={"fields": "display_phone_number,verified_name"},
                timeout=15,
            )
            if not resp.ok:
                logger.error(
                    "Meta WA phone lookup failed (%s): %s",
                    resp.status_code,
                    resp.text[:500],
                )
                return ""
            display = (resp.json() or {}).get("display_phone_number") or ""
            return "".join(ch for ch in display if ch.isdigit())
        except Exception:
            logger.exception("Failed fetching Meta WA display phone")
            return ""

    def send_text(self, to: str, body: str) -> dict[str, Any]:
        if not self.token or not self.phone_number_id:
            logger.warning("Meta WA credentials missing; skipping send to %s: %s", to, body)
            return {"skipped": True, "to": to, "body": body}

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body},
        }
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        try:
            resp = requests.post(self.base_url, json=payload, headers=headers, timeout=15)
            if not resp.ok:
                logger.error(
                    "Meta WA send failed (%s) to %s: %s",
                    resp.status_code,
                    to,
                    resp.text[:500],
                )
                resp.raise_for_status()
            return resp.json()
        except Exception:
            logger.exception("Failed to send WhatsApp message to %s", to)
            return {"error": True, "to": to}
