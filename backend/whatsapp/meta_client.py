import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class MetaWhatsAppClient:
    def __init__(self):
        self.token = settings.META_WA_TOKEN
        self.phone_number_id = settings.META_WA_PHONE_NUMBER_ID
        self.base_url = f"https://graph.facebook.com/v21.0/{self.phone_number_id}/messages"

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
            resp.raise_for_status()
            return resp.json()
        except Exception:
            logger.exception("Failed to send WhatsApp message to %s", to)
            return {"error": True, "to": to}
