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
