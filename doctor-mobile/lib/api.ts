import { storage } from "./storage";
import type {
  Appointment,
  ClinicalNote,
  DashboardStats,
  DoctorPatientDetail,
  DoctorPatientSummary,
  DoctorProfile,
  Prescription,
  UserInfo,
} from "./types";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const ACCESS_KEY = "telemed_doctor_access";
const REFRESH_KEY = "telemed_doctor_refresh";
const USER_KEY = "telemed_doctor_user";
const DOCTOR_KEY = "telemed_doctor_profile";

export async function getAccessToken() {
  return storage.getItem(ACCESS_KEY);
}

export async function getStoredUser(): Promise<UserInfo | null> {
  const raw = await storage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export async function getStoredDoctor(): Promise<DoctorProfile | null> {
  const raw = await storage.getItem(DOCTOR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DoctorProfile;
  } catch {
    return null;
  }
}

export async function clearAuth() {
  await storage.deleteItem(ACCESS_KEY);
  await storage.deleteItem(REFRESH_KEY);
  await storage.deleteItem(USER_KEY);
  await storage.deleteItem(DOCTOR_KEY);
}

export async function setAuth(
  access: string,
  refresh: string,
  user: UserInfo,
  doctor?: DoctorProfile,
) {
  await storage.setItem(ACCESS_KEY, access);
  await storage.setItem(REFRESH_KEY, refresh);
  await storage.setItem(USER_KEY, JSON.stringify(user));
  if (doctor) {
    await storage.setItem(DOCTOR_KEY, JSON.stringify(doctor));
  }
}

function unwrapList<T>(data: T[] | { results?: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return data.results;
  }
  return [];
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
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid API response (${res.status})`);
  }
  if (!res.ok) {
    const err = data as Record<string, unknown>;
    const statusField = err?.status;
    const statusMsg = Array.isArray(statusField) ? statusField[0] : undefined;
    const detail =
      err?.detail ||
      statusMsg ||
      (typeof data === "object" ? JSON.stringify(data) : "Request failed");
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return data as T;
}

export const api = {
  login: async (username: string, password: string) => {
    const data = await request<{
      access: string;
      refresh: string;
      user: UserInfo;
    }>(
      "/api/auth/login/",
      { method: "POST", body: JSON.stringify({ username, password }) },
      false,
    );
    if (data.user.role !== "doctor") {
      throw new Error("Doctor account required.");
    }
    await setAuth(data.access, data.refresh, data.user);
    const doctor = await request<DoctorProfile>("/api/doctor/me/");
    await setAuth(data.access, data.refresh, data.user, doctor);
    return { ...data, doctor };
  },

  me: () => request<DoctorProfile>("/api/doctor/me/"),

  dashboard: () => request<DashboardStats>("/api/doctor/dashboard/"),

  appointments: async (params?: {
    status?: string;
    today?: boolean;
    date_from?: string;
    date_to?: string;
    upcoming?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.today) qs.set("today", "1");
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    if (params?.upcoming === false) qs.set("upcoming", "0");
    const query = qs.toString();
    const data = await request<Appointment[] | { results: Appointment[] }>(
      query ? `/api/doctor/appointments/?${query}` : "/api/doctor/appointments/",
    );
    return unwrapList(data);
  },

  appointment: (id: number) =>
    request<Appointment>(`/api/doctor/appointments/${id}/`),

  updateAppointmentStatus: (
    id: number,
    payload: { status: "completed" | "rejected"; rejection_reason?: string },
  ) =>
    request<Appointment>(`/api/doctor/appointments/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  startVisit: (id: number) =>
    request<Appointment>(`/api/doctor/appointments/${id}/start/`, {
      method: "POST",
    }),

  endVisit: (id: number) =>
    request<Appointment>(`/api/doctor/appointments/${id}/end/`, {
      method: "POST",
    }),

  saveClinicalNote: (id: number, note: ClinicalNote) =>
    request<ClinicalNote>(`/api/doctor/appointments/${id}/clinical/`, {
      method: "PUT",
      body: JSON.stringify(note),
    }),

  savePrescription: (id: number, prescription: Prescription) =>
    request<Prescription>(`/api/doctor/appointments/${id}/prescription/`, {
      method: "PUT",
      body: JSON.stringify(prescription),
    }),

  patients: () => request<DoctorPatientSummary[]>("/api/doctor/patients/"),

  patient: (uuid: string) =>
    request<DoctorPatientDetail>(`/api/doctor/patients/${uuid}/`),
};
