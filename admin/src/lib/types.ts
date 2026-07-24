export type UserInfo = {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
};

export type Speciality = {
  id: number;
  name: string;
  icon: string | null;
  icon_url: string;
  display_icon: string;
  is_active: boolean;
  created_at: string;
};

export type Doctor = {
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

export type Patient = {
  id: number;
  uuid: string;
  phone: string;
  name: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
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
  status: "upcoming" | "completed" | "cancelled";
  notes: string;
  created_at: string;
  updated_at: string;
};

export type PatientDetail = Patient & {
  appointments: Appointment[];
};

export type DoctorAvailability = {
  id: number;
  weekday: number;
  weekday_display: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
};

export type DashboardStats = {
  total_doctors: number;
  total_patients: number;
  total_appointments: number;
  upcoming_today: Appointment[];
  recent_appointments: Appointment[];
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
