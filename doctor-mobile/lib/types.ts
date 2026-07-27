export type Speciality = {
  id: number;
  name: string;
  display_icon: string;
  is_active: boolean;
};

export type DoctorProfile = {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  specialities: Speciality[];
  session_time: number;
  is_active: boolean;
  created_at: string;
};

export type UserInfo = {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
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

export type Appointment = {
  id: number;
  patient: number;
  patient_uuid?: string;
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
  updated_at: string;
  clinical_note?: ClinicalNote | null;
  prescription?: Prescription | null;
};

export type DashboardStats = {
  today_upcoming: number;
  today_completed: number;
  today_rejected: number;
  future_bookings: number;
  total_patients_seen: number;
  upcoming_today: Appointment[];
};

export type DoctorPatientSummary = {
  uuid: string;
  name: string;
  phone: string;
  upcoming_count: number;
  total_visits: number;
  next_appointment: Appointment | null;
};

export type DoctorPatientDetail = {
  uuid: string;
  name: string;
  phone: string;
  total_visits: number;
  total_appointments: number;
  rejected_count: number;
  rejection_rate: number;
  last_visit_date: string | null;
  last_clinical_note: ClinicalNote | null;
  last_prescription: Prescription | null;
  next_appointment: Appointment | null;
  visit_history: Appointment[];
};
