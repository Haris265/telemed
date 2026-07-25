# Telemed patient app (Expo)

## Setup
```bash
cd mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your Django API (use your LAN IP for a physical device, e.g. `http://192.168.1.10:8000`).

Backend must be running. In DEBUG, OTP is returned in the request-otp response for local testing.

Configure `CLINIC_WHATSAPP_NUMBER` in the repo root `.env` for the “Book on WhatsApp” deep link.
