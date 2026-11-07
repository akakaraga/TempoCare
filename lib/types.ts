export type StaffRole = 'admin' | 'doctor' | 'nurse' | 'receptionist';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Staff {
  id: string;
  user_id?: string | null;
  full_name: string;
  role: StaffRole;
  specialization?: string | null;
  email: string;
  password?: string | null;
  phone?: string | null;
  is_active: boolean;
  practice_days?: string[]; // e.g. ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
  practice_start_time?: string; // e.g. '08:00'
  practice_end_time?: string;   // e.g. '16:00'
  assigned_service_ids?: string[]; // IDs of services assigned to this staff
  created_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at?: string;
}

export interface StaffService {
  staff_id: string;
  service_id: string;
}

export interface ClinicSettings {
  id: string;
  name: string;
  tagline: string;
  phone: string;
  emergency_phone: string;
  email: string;
  address: string;
  announcement: string;
  open_hour: string; // e.g. '08:00'
  close_hour: string; // e.g. '17:00'
  updated_at?: string;
}

export interface Appointment {
  id: string;
  patient_name: string;
  patient_whatsapp: string;
  patient_email?: string | null;
  service_id: string;
  staff_id: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  status: AppointmentStatus;
  initial_complaint?: string | null;
  medical_notes?: string | null;
  queue_number?: string | null;
  reschedule_token: string;
  token_expires_at?: string | null;
  is_walk_in?: boolean;
  created_at?: string;
  
  // Joined fields for display
  staff?: Staff;
  service?: Service;
}

export interface BlockOut {
  id: string;
  staff_id: string;
  block_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  reason: string;
  created_at?: string;
  staff?: Staff;
}

export interface TimeSlot {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isAvailable: boolean;
  reasonUnavailable?: 'booked' | 'blocked' | 'past' | 'break';
}
