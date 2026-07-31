import { storage } from "./storage";
import type {
  ClinicDetail,
  ClinicInfo,
  Doctor,
  NearbyClinicsResponse,
  Patient,
  PatientHistory,
  Appointment,
  QueueInfo,
  Speciality,
  SymptomCheckResult,
} from "./types";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "https://zl5w76gd-8000.inc1.devtunnels.ms"
).replace(/\/+$/, "");

const ACCESS_KEY = "telemed_patient_access";
const REFRESH_KEY = "telemed_patient_refresh";
const PATIENT_KEY = "telemed_patient";

export async function getAccessToken() {
  return storage.getItem(ACCESS_KEY);
}

export async function getStoredPatient(): Promise<Patient | null> {
  const raw = await storage.getItem(PATIENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Patient;
  } catch {
    return null;
  }
}

export async function clearAuth() {
  await storage.deleteItem(ACCESS_KEY);
  await storage.deleteItem(REFRESH_KEY);
  await storage.deleteItem(PATIENT_KEY);
}

export async function setAuth(access: string, refresh: string, patient: Patient) {
  await storage.setItem(ACCESS_KEY, access);
  await storage.setItem(REFRESH_KEY, refresh);
  await storage.setItem(PATIENT_KEY, JSON.stringify(patient));
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(
      `Cannot reach server. Check your internet and that the API is online.\n(${API_URL})`,
    );
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid API response (${res.status})`);
  }
  if (!res.ok) {
    const detail =
      data?.detail ||
      data?.otp?.[0] ||
      data?.name?.[0] ||
      data?.token_date?.[0] ||
      data?.doctor_uuid?.[0] ||
      (typeof data === "object" ? JSON.stringify(data) : "Request failed");
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return data as T;
}

export const api = {
  clinic: () => request<ClinicInfo>("/api/patient/clinic/", {}, false),
  requestOtp: (phone: string) =>
    request<{
      detail: string;
      phone: string;
      needs_name: boolean;
      otp?: string;
    }>(
      "/api/patient/auth/request-otp/",
      { method: "POST", body: JSON.stringify({ phone }) },
      false,
    ),
  verifyOtp: (payload: { phone: string; otp: string; name?: string }) =>
    request<{
      access: string;
      refresh: string;
      patient: Patient;
    }>(
      "/api/patient/auth/verify-otp/",
      { method: "POST", body: JSON.stringify(payload) },
      false,
    ),
  me: () => request<Patient>("/api/patient/me/"),
  specialities: () => request<Speciality[]>("/api/patient/specialities/"),
  doctors: (speciality?: number) => {
    const qs = speciality ? `?speciality=${speciality}` : "";
    return request<Doctor[]>(`/api/patient/doctors/${qs}`);
  },
  doctorAvailability: (uuid: string) =>
    request<{
      doctor: Doctor;
      weekly: {
        id: number;
        weekday: number;
        weekday_display: string;
        start_time: string;
        end_time: string;
        is_active: boolean;
      }[];
      dates: {
        date: string;
        label: string;
        start: string;
        end: string;
        timing: string;
        booked_count?: number;
        booked_times?: string[];
      }[];
    }>(`/api/patient/doctors/${uuid}/availability/`),
  appointments: (status?: string) => {
    const qs = status ? `?status=${status}` : "";
    return request<Appointment[]>(`/api/patient/appointments/${qs}`);
  },
  appointmentDetail: (id: number) =>
    request<Appointment>(`/api/patient/appointments/${id}/`),
  history: () => request<PatientHistory>("/api/patient/history/"),
  book: (
    doctor_uuid: string,
    token_date: string,
    options?: { symptoms?: string; symptom_check_id?: number; slot_time?: string },
  ) =>
    request<{ appointment: Appointment; queue: QueueInfo }>(
      "/api/patient/appointments/",
      {
        method: "POST",
        body: JSON.stringify({
          doctor_uuid,
          token_date,
          ...(options?.slot_time ? { slot_time: options.slot_time } : {}),
          ...(options?.symptoms ? { symptoms: options.symptoms } : {}),
          ...(options?.symptom_check_id
            ? { symptom_check_id: options.symptom_check_id }
            : {}),
        }),
      },
    ),
  symptomsCheck: (symptoms: string) =>
    request<SymptomCheckResult>("/api/patient/symptoms/check/", {
      method: "POST",
      body: JSON.stringify({ symptoms }),
    }),
  nearbyClinics: (
    lat: number,
    lng: number,
    options: { radiusKm?: number; area?: string } = {},
  ) => {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius_km: String(options.radiusKm ?? 5),
    });
    if (options.area?.trim()) {
      params.set("area", options.area.trim());
    }
    return request<NearbyClinicsResponse>(
      `/api/patient/clinics/nearby/?${params}`,
    );
  },
  clinicDetail: (id: number) =>
    request<ClinicDetail>(`/api/patient/clinics/${id}/`),
  queue: (id: number) =>
    request<QueueInfo>(`/api/patient/appointments/${id}/queue/`),
  lookupToken: (q: string, today = true) => {
    const params = new URLSearchParams({
      q: q.trim(),
      today: today ? "1" : "0",
    });
    return request<QueueInfo>(`/api/patient/queue/lookup/?${params}`);
  },
};
