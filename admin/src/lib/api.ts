import type {
  Appointment,
  DashboardStats,
  Doctor,
  DoctorAvailability,
  Paginated,
  Patient,
  PatientDetail,
  Speciality,
  UserInfo,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "telemed_access";
const REFRESH_KEY = "telemed_refresh";
const USER_KEY = "telemed_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): UserInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setAuth(access: string, refresh: string, user: UserInfo) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
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
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const text = await res.text();
  if (text && (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html"))) {
    throw new Error(
      `API returned HTML instead of JSON (${res.status}). Check NEXT_PUBLIC_API_URL and backend.`,
    );
  }
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail =
      data?.detail ||
      (typeof data === "object" ? JSON.stringify(data) : "Request failed");
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return data as T;
}

export async function login(username: string, password: string) {
  const data = await request<{
    access: string;
    refresh: string;
    user: UserInfo;
  }>(
    "/api/auth/login/",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    false,
  );
  if (data.user.role !== "admin") {
    throw new Error("Only admin users can access this portal.");
  }
  setAuth(data.access, data.refresh, data.user);
  return data;
}

export const api = {
  dashboard: () => request<DashboardStats>("/api/admin/dashboard/"),
  specialities: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<Speciality> | Speciality[]>(
      `/api/admin/specialities/${qs ? `?${qs}` : ""}`,
    );
  },
  createSpeciality: (payload: { name: string; icon_url?: string; is_active?: boolean }) =>
    request<Speciality>("/api/admin/specialities/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateSpeciality: (
    id: number,
    payload: Partial<{ name: string; icon_url: string; is_active: boolean }>,
  ) =>
    request<Speciality>(`/api/admin/specialities/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteSpeciality: (id: number) =>
    request<void>(`/api/admin/specialities/${id}/`, { method: "DELETE" }),
  doctors: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<Doctor> | Doctor[]>(
      `/api/admin/doctors/${qs ? `?${qs}` : ""}`,
    );
  },
  onboardDoctor: (payload: {
    first_name: string;
    last_name: string;
    speciality_ids: number[];
    session_time: number;
    email: string;
    password: string;
  }) =>
    request<Doctor>("/api/admin/doctors/onboarding/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateDoctor: (
    uuid: string,
    payload: Partial<{
      first_name: string;
      last_name: string;
      speciality_ids: number[];
      session_time: number;
      is_active: boolean;
    }>,
  ) =>
    request<Doctor>(`/api/admin/doctors/${uuid}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteDoctor: (uuid: string) =>
    request<void>(`/api/admin/doctors/${uuid}/`, { method: "DELETE" }),
  doctor: (uuid: string) => request<Doctor>(`/api/admin/doctors/${uuid}/`),
  doctorAvailability: (uuid: string) =>
    request<Paginated<DoctorAvailability> | DoctorAvailability[]>(
      `/api/admin/doctors/${uuid}/availability/`,
    ),
  patients: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<Patient> | Patient[]>(
      `/api/admin/patients/${qs ? `?${qs}` : ""}`,
    );
  },
  patient: (uuid: string) => request<PatientDetail>(`/api/admin/patients/${uuid}/`),
  deletePatient: (uuid: string) =>
    request<void>(`/api/admin/patients/${uuid}/`, { method: "DELETE" }),
  appointments: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<Appointment> | Appointment[]>(
      `/api/admin/appointments/${qs ? `?${qs}` : ""}`,
    );
  },
  appointment: (id: number | string) =>
    request<Appointment>(`/api/admin/appointments/${id}/`),
  updateAppointment: (id: number, payload: Partial<{ status: string; notes: string }>) =>
    request<Appointment>(`/api/admin/appointments/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAppointment: (id: number) =>
    request<void>(`/api/admin/appointments/${id}/`, { method: "DELETE" }),
};

export function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export function unwrapCount<T>(data: Paginated<T> | T[]): number {
  return Array.isArray(data) ? data.length : data.count;
}
