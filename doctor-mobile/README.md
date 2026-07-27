# Telemed Doctor App

Expo mobile app for doctors to manage clinic visits, SOAP notes, and prescriptions.

## Setup

```bash
cd doctor-mobile
npm install
cp .env.example .env   # or edit .env
npm start
```

Set `EXPO_PUBLIC_API_URL` in `.env` to your Django backend (e.g. `http://localhost:8000`).

## Login

Use the email and password created by admin at **Admin → Doctors → Onboarding**.

## Features

- Dashboard with today's queue and analytics
- Today / future / completed / rejected appointments
- SOAP notes + prescription per visit
- Complete or reject appointments
- Patient visit history and reports
