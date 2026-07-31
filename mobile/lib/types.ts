export type Patient = {
  id: number;
  uuid: string;
  phone: string;
  name: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type Speciality = {
  id: number;
  name: string;
  display_icon: string;
  is_active: boolean;
};

export type Doctor = {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  full_name: string;
  specialities: Speciality[];
  session_time: number;
  is_active: boolean;
};

export type AvailabilitySlot = {
  id: number;
  weekday: number;
  weekday_display: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export type DateOption = {
  date: string;
  label: string;
  start: string;
  end: string;
  timing: string;
  booked_count?: number;
  booked_times?: string[];
};

export type Appointment = {
  id: number;
  patient: number;
  patient_name: string;
  patient_phone: string;
  doctor: number;
  doctor_name: string;
  scheduled_at: string;
  token_date: string;
  token_number: number;
  token_code: string;
  status: AppointmentStatus;
  notes: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  clinical_note?: ClinicalNote | null;
  prescription?: Prescription | null;
};

export type AppointmentStatus = "upcoming" | "completed" | "cancelled" | "rejected";

export type ClinicalNote = {
  id?: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  created_at?: string;
  updated_at?: string;
};

export type PrescriptionItem = {
  id?: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

export type Prescription = {
  id?: number;
  notes: string;
  items: PrescriptionItem[];
  created_at?: string;
  updated_at?: string;
};

export type DoctorSeen = {
  id: number;
  uuid: string;
  full_name: string;
  specialities: { id: number; name: string }[];
  visit_count: number;
  last_visit_date: string | null;
};

export type PatientHistory = {
  total_visits: number;
  total_appointments: number;
  doctors_seen_count: number;
  last_visit_date: string | null;
  last_clinical_note: ClinicalNote | null;
  last_prescription: Prescription | null;
  doctors_seen: DoctorSeen[];
  visit_history: Appointment[];
};

export type QueuePhase = "waiting" | "now" | "completed" | "cancelled";

export type QueueInfo = {
  appointment_id: number;
  token_code: string;
  token_number: number;
  token_date: string;
  is_today?: boolean;
  position: number;
  people_ahead: number;
  wait_minutes?: number;
  session_minutes?: number;
  now_serving_number?: number | null;
  now_serving_code?: string | null;
  completed_count?: number;
  upcoming_count?: number;
  phase?: QueuePhase;
  estimated_at: string;
  approx_time?: string;
  date_label?: string;
  doctor_name: string;
  doctor_id?: number;
  status: string;
  message: string;
  updated_at?: string;
};

export type ClinicInfo = {
  whatsapp_number: string;
  whatsapp_link: string;
  book_prefill: string;
  webhook_path?: string;
};

export type ClinicNearby = {
  id: number;
  name: string;
  address: string;
  city: string;
  area: string;
  phone: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  doctor_count?: number;
};

export type NearbyClinicsResponse = {
  lat: number;
  lng: number;
  radius_km: number;
  area: string;
  match_mode: "area" | "nearby";
  count: number;
  results: ClinicNearby[];
};

export type ClinicSpecialitySummary = {
  id: number;
  name: string;
  display_icon: string;
  is_active: boolean;
  doctor_count: number;
};

export type ClinicDetail = {
  id: number;
  name: string;
  address: string;
  city: string;
  phone: string;
  latitude: number;
  longitude: number;
  specialities: ClinicSpecialitySummary[];
  doctors: Doctor[];
};

export type SymptomUrgency = "routine" | "urgent" | "emergency";

export type SymptomCheckResult = {
  id: number;
  symptoms: string;
  urgency: SymptomUrgency;
  summary: string;
  disclaimer: string;
  recommended_specialities: Speciality[];
  created_at: string;
};
