import type { AppointmentStatus } from "./types";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function statusLabel(status: AppointmentStatus) {
  const map: Record<AppointmentStatus, string> = {
    upcoming: "Upcoming",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
  };
  return map[status] || status;
}

export function statusTone(
  status: AppointmentStatus,
): "neutral" | "success" | "warning" | "info" | "danger" {
  const map: Record<
    AppointmentStatus,
    "neutral" | "success" | "warning" | "info" | "danger"
  > = {
    upcoming: "info",
    completed: "success",
    rejected: "danger",
    cancelled: "warning",
  };
  return map[status] || "neutral";
}
