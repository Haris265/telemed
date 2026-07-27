# Telemed Phase 01

Hospital admin portal (Next.js) + Django DRF backend + Meta WhatsApp patient chatbot.

## Stack

- **Backend:** Django 6 + DRF + SimpleJWT
- **Admin:** Next.js 15 + Tailwind (hospital portal UI)
- **Patient:** WhatsApp webhook (Meta Cloud API) with simulate endpoint for local testing

## Quick start (local)

### 1. Backend

```bash
cd /home/admin12/Documents/projects/telemed
source .venv/bin/activate
cd backend
python manage.py migrate
python manage.py seed_admin
python manage.py runserver 0.0.0.0:8000
```

Default admin: `admin` / `admin123`

### 2. Admin portal

```bash
cd admin
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → login → Dashboard.

### 3. WhatsApp simulate (no Meta credentials needed)

```bash
# New patient onboarding
curl -s -X POST http://localhost:8000/api/whatsapp/simulate/ \
  -H 'Content-Type: application/json' \
  -d '{"phone":"923001234567","text":"hi"}'

# Send name
curl -s -X POST http://localhost:8000/api/whatsapp/simulate/ \
  -H 'Content-Type: application/json' \
  -d '{"phone":"923001234567","text":"Ali Khan"}'

# Menu: OTP
curl -s -X POST http://localhost:8000/api/whatsapp/simulate/ \
  -H 'Content-Type: application/json' \
  -d '{"phone":"923001234567","text":"1"}'

# Menu: appointments
curl -s -X POST http://localhost:8000/api/whatsapp/simulate/ \
  -H 'Content-Type: application/json' \
  -d '{"phone":"923001234567","text":"2"}'
```

### Meta webhook

- Verify URL: `GET /api/whatsapp/webhook/` with `META_WA_VERIFY_TOKEN`
- Inbound: `POST /api/whatsapp/webhook/`
- Set `META_WA_TOKEN`, `META_WA_PHONE_NUMBER_ID`, `META_WA_APP_SECRET` in `.env`

## Key Admin routes

| Route | Purpose |
|---|---|
| `/login` | Admin sign-in |
| `/admin/dashboard` | KPI analytics |
| `/admin/specialities` | Speciality CRUD |
| `/admin/doctors` | Doctor directory |
| `/admin/doctors/onboarding` | Register doctor |
| `/admin/patients` | Patient list |
| `/admin/appointments` | Appointment ops |

## Doctor mobile app

```bash
cd doctor-mobile
npm install
npm start
```

Login with admin-created doctor credentials. See [doctor-mobile/README.md](doctor-mobile/README.md).

## Doctor APIs

- `POST /api/auth/login/` (role=doctor)
- `GET /api/doctor/me/`
- `GET /api/doctor/dashboard/`
- `GET /api/doctor/appointments/` (`?status=`, `?today=1`, `?date_from=`, `?date_to=`)
- `GET/PATCH /api/doctor/appointments/<id>/`
- `GET/PUT /api/doctor/appointments/<id>/clinical/`
- `GET/PUT /api/doctor/appointments/<id>/prescription/`
- `GET /api/doctor/patients/`
- `GET /api/doctor/patients/<uuid>/`
- `GET/POST /api/doctor/availability/`

## Docker (optional)

```bash
# Use postgres URL in .env for compose
docker compose up --build
```
