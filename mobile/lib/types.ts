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
};

export type QueueInfo = {
  appointment_id: number;
  token_code: string;
  token_number: number;
  token_date: string;
  position: number;
  people_ahead: number;
  estimated_at: string;
  doctor_name: string;
  status: string;
  message: string;
};

export type ClinicInfo = {
  whatsapp_number: string;
  whatsapp_link: string;
  book_prefill: string;
  webhook_path?: string;
};
