# Telemed patient app (Expo)

## Setup
```bash
cd mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your Django API base URL (no trailing slash), e.g. a Dev Tunnel:

```
EXPO_PUBLIC_API_URL=https://xknm9jsn-8000.inc1.devtunnels.ms
```

After changing `.env`, restart Expo with cache clear: `npx expo start --clear`.

Backend must be running and reachable at that URL. In DEBUG, OTP is returned in the request-otp response for local testing.

## Build Android APK (EAS)

```bash
cd mobile
npm install
npx eas-cli login
npx eas-cli build:configure   # first time only (links Expo project)
npm run build:apk            # cloud APK build (preview profile)
```

When the build finishes, EAS prints a download URL for the `.apk`.

Optional local build (needs Docker):

```bash
npm run build:apk:local
```

Configure `CLINIC_WHATSAPP_NUMBER` in the repo root `.env` for the “Book on WhatsApp” deep link.
