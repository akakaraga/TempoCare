import { Staff, Service, Appointment, BlockOut, ClinicSettings } from '@/lib/types';
import { createServerSupabase } from '@/lib/supabase/server';

// ==============================================================================
// In-Memory Seed Storage (Fallback when Supabase credentials are not supplied)
// ==============================================================================

const defaultClinicSettings: ClinicSettings = {
  id: 'clinic-default-01',
  name: 'TempoCare Clinic & Hospital',
  tagline: 'Klinik Pratama & Rumah Sakit Umum',
  phone: '021-555-8367',
  emergency_phone: '(021) 555-TEMPO',
  email: 'info@tempocare.clinic',
  address: 'Jl. Kesehatan No. 45, Jakarta Pusat',
  announcement: 'Pendaftaran Buka 24 Jam • Langsung Dapat Nomor Antrean',
  open_hour: '08:00',
  close_hour: '17:00',
  updated_at: new Date().toISOString(),
};

const initialServices: Service[] = [];

const initialStaff: Staff[] = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    user_id: 'd440d747-c10e-41b3-9cca-10f4ff5b3dbb',
    full_name: 'Admin Utama RS',
    role: 'admin',
    specialization: 'Manajemen RS & Mutu Klinis',
    email: 'admin.booking@gmail.com',
    phone: '081234567890',
    is_active: true,
    practice_days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
    practice_start_time: '08:00',
    practice_end_time: '17:00',
    assigned_service_ids: [],
  },
];

const initialStaffServices: { staff_id: string; service_id: string }[] = [];

function getTodayString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

const initialAppointments: Appointment[] = [];

const initialBlockOuts: BlockOut[] = [];

// Global in-memory cache to retain state across server invocations
declare global {
  var __tempocare_clinic_settings: ClinicSettings | undefined;
  var __tempocare_staff: Staff[] | undefined;
  var __tempocare_services: Service[] | undefined;
  var __tempocare_staff_services: { staff_id: string; service_id: string }[] | undefined;
  var __tempocare_appointments: Appointment[] | undefined;
  var __tempocare_blockouts: BlockOut[] | undefined;
}

if (!global.__tempocare_clinic_settings) global.__tempocare_clinic_settings = { ...defaultClinicSettings };
if (!global.__tempocare_staff) global.__tempocare_staff = [...initialStaff];
if (!global.__tempocare_services) global.__tempocare_services = [...initialServices];
if (!global.__tempocare_staff_services) global.__tempocare_staff_services = [...initialStaffServices];
if (!global.__tempocare_appointments) global.__tempocare_appointments = [...initialAppointments];
if (!global.__tempocare_blockouts) global.__tempocare_blockouts = [...initialBlockOuts];

export function normalizeTime(t: string): string {
  if (!t) return '';
  const parts = t.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return t;
}

function generateQueueNumber(serviceName: string, date: string): string {
  let prefix = 'P';
  if (serviceName.toLowerCase().includes('anak')) prefix = 'A';
  else if (serviceName.toLowerCase().includes('gigi')) prefix = 'G';
  else if (serviceName.toLowerCase().includes('dalam')) prefix = 'D';
  else if (serviceName.toLowerCase().includes('umum')) prefix = 'U';
  else if (serviceName.toLowerCase().includes('mata')) prefix = 'M';
  else if (serviceName.toLowerCase().includes('tht')) prefix = 'T';
  else if (serviceName.toLowerCase().includes('kandungan')) prefix = 'O';

  const countToday = (global.__tempocare_appointments || []).filter(
    (a) => a.appointment_date === date
  ).length;

  const number = (countToday + 1).toString().padStart(3, '0');
  return `${prefix}-${number}`;
}

// ==============================================================================
// Database Operations (Supabase + In-Memory Dynamic Store)
// ==============================================================================

export const db = {
  // 1. CLINIC SETTINGS CMS
  async getClinicSettings(): Promise<ClinicSettings> {
    const supabase = createServerSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('clinic_settings').select('*').limit(1).single();
      if (!error && data) return data as ClinicSettings;
    }
    return global.__tempocare_clinic_settings || defaultClinicSettings;
  },

  async updateClinicSettings(data: Partial<ClinicSettings>): Promise<ClinicSettings> {
    const updated: ClinicSettings = {
      ...(global.__tempocare_clinic_settings || defaultClinicSettings),
      ...data,
      updated_at: new Date().toISOString(),
    };

    global.__tempocare_clinic_settings = updated;

    const supabase = createServerSupabase();
    if (supabase) {
      await supabase.from('clinic_settings').upsert(updated);
    }

    return updated;
  },

  // 2. STAFF / DOCTORS CMS
  async getStaffList(role?: string): Promise<Staff[]> {
    const supabase = createServerSupabase();
    if (supabase) {
      let query = supabase.from('staff').select('*').order('full_name');
      if (role) query = query.eq('role', role);
      const { data, error } = await query;
      if (!error && data) return data as Staff[];
    }

    let list = global.__tempocare_staff || [];
    if (role) list = list.filter((s) => s.role === role);
    return list;
  },

  async getStaffById(id: string): Promise<Staff | null> {
    const supabase = createServerSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('staff').select('*').eq('id', id).single();
      if (!error && data) return data as Staff;
    }
    return (global.__tempocare_staff || []).find((s) => s.id === id) || null;
  },

  async createStaff(staffData: Omit<Staff, 'id' | 'created_at'>): Promise<Staff> {
    const newStaff: Staff = {
      ...staffData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      practice_days: staffData.practice_days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      practice_start_time: staffData.practice_start_time || '08:00',
      practice_end_time: staffData.practice_end_time || '17:00',
      assigned_service_ids: staffData.assigned_service_ids || [],
    };

    const supabase = createServerSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('staff').insert(newStaff).select().single();
      if (!error && data) {
        newStaff.id = data.id;
      }
    }

    global.__tempocare_staff = [newStaff, ...(global.__tempocare_staff || [])];

    // Also update staff_services relations
    if (newStaff.assigned_service_ids && newStaff.assigned_service_ids.length > 0) {
      await this.assignStaffServices(newStaff.id, newStaff.assigned_service_ids);
    }

    return newStaff;
  },

  async updateStaff(id: string, updates: Partial<Staff>): Promise<Staff | null> {
    const list = global.__tempocare_staff || [];
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    global.__tempocare_staff = list;

    if (updates.assigned_service_ids) {
      await this.assignStaffServices(id, updates.assigned_service_ids);
    }

    const supabase = createServerSupabase();
    if (supabase) {
      await supabase.from('staff').update(updates).eq('id', id);
    }

    return updated;
  },

  async deleteStaff(id: string): Promise<boolean> {
    global.__tempocare_staff = (global.__tempocare_staff || []).filter((s) => s.id !== id);
    global.__tempocare_staff_services = (global.__tempocare_staff_services || []).filter(
      (r) => r.staff_id !== id
    );

    const supabase = createServerSupabase();
    if (supabase) {
      await supabase.from('staff').delete().eq('id', id);
    }

    return true;
  },

  // 3. SERVICES / POLIKLINIK CMS
  async getServices(activeOnly = false): Promise<Service[]> {
    const supabase = createServerSupabase();
    if (supabase) {
      let query = supabase.from('services').select('*').order('name');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (!error && data) return data as Service[];
    }

    let list = global.__tempocare_services || [];
    if (activeOnly) list = list.filter((s) => s.is_active);
    return list;
  },

  async getServiceById(id: string): Promise<Service | null> {
    const supabase = createServerSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
      if (!error && data) return data as Service;
    }
    return (global.__tempocare_services || []).find((s) => s.id === id) || null;
  },

  async createService(serviceData: Omit<Service, 'id' | 'created_at'>): Promise<Service> {
    const newService: Service = {
      ...serviceData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const supabase = createServerSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('services').insert(newService).select().single();
      if (!error && data) {
        newService.id = data.id;
      }
    }

    global.__tempocare_services = [newService, ...(global.__tempocare_services || [])];
    return newService;
  },

  async updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
    const list = global.__tempocare_services || [];
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    global.__tempocare_services = list;

    const supabase = createServerSupabase();
    if (supabase) {
      await supabase.from('services').update(updates).eq('id', id);
    }

    return updated;
  },

  async deleteService(id: string): Promise<boolean> {
    global.__tempocare_services = (global.__tempocare_services || []).filter((s) => s.id !== id);
    global.__tempocare_staff_services = (global.__tempocare_staff_services || []).filter(
      (r) => r.service_id !== id
    );

    const supabase = createServerSupabase();
    if (supabase) {
      await supabase.from('services').delete().eq('id', id);
    }

    return true;
  },

  // 4. MAPPING DOKTER KE LAYANAN (STAFF_SERVICES)
  async getDoctorsForService(serviceId: string): Promise<Staff[]> {
    const allStaff = global.__tempocare_staff || [];
    const doctors = allStaff.filter((s) => s.role === 'doctor' && s.is_active);

    // Direct mapping via staff.assigned_service_ids
    const mapped = doctors.filter(
      (d) => d.assigned_service_ids && d.assigned_service_ids.includes(serviceId)
    );

    if (mapped.length > 0) return mapped;

    // Fallback to staff_services table relations
    const rels = (global.__tempocare_staff_services || []).filter((r) => r.service_id === serviceId);
    if (rels.length > 0) {
      const doctorIds = new Set(rels.map((r) => r.staff_id));
      return doctors.filter((s) => doctorIds.has(s.id));
    }

    // Fallback: return all active doctors so patient can still book
    return doctors;
  },

  async assignStaffServices(staffId: string, serviceIds: string[]): Promise<void> {
    // Remove existing relations for this staff
    global.__tempocare_staff_services = (global.__tempocare_staff_services || []).filter(
      (r) => r.staff_id !== staffId
    );

    // Add new relations
    const newRels = serviceIds.map((sId) => ({ staff_id: staffId, service_id: sId }));
    global.__tempocare_staff_services = [...(global.__tempocare_staff_services || []), ...newRels];

    // Update staff record
    const staff = (global.__tempocare_staff || []).find((s) => s.id === staffId);
    if (staff) {
      staff.assigned_service_ids = serviceIds;
    }
  },

  // 5. BLOCK OUTS CMS
  async getBlockOuts(staffId?: string, date?: string): Promise<BlockOut[]> {
    let items = global.__tempocare_blockouts || [];
    if (staffId) items = items.filter((b) => b.staff_id === staffId);
    if (date) items = items.filter((b) => b.block_date === date);

    return items.map((b) => ({
      ...b,
      staff: (global.__tempocare_staff || []).find((s) => s.id === b.staff_id),
    }));
  },

  async createBlockOut(data: Omit<BlockOut, 'id' | 'created_at'>): Promise<BlockOut> {
    const newBlock: BlockOut = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const supabase = createServerSupabase();
    if (supabase) {
      const { data: result, error } = await supabase.from('block_outs').insert(newBlock).select().single();
      if (!error && result) {
        newBlock.id = result.id;
      }
    }

    global.__tempocare_blockouts = [newBlock, ...(global.__tempocare_blockouts || [])];
    return {
      ...newBlock,
      staff: (global.__tempocare_staff || []).find((s) => s.id === newBlock.staff_id),
    };
  },

  async deleteBlockOut(id: string): Promise<boolean> {
    global.__tempocare_blockouts = (global.__tempocare_blockouts || []).filter((b) => b.id !== id);
    const supabase = createServerSupabase();
    if (supabase) {
      await supabase.from('block_outs').delete().eq('id', id);
    }
    return true;
  },

  // 6. APPOINTMENTS
  async getAppointments(filters?: {
    staffId?: string;
    date?: string;
    status?: string;
  }): Promise<Appointment[]> {
    let list = global.__tempocare_appointments || [];
    if (filters?.staffId) list = list.filter((a) => a.staff_id === filters.staffId);
    if (filters?.date) list = list.filter((a) => a.appointment_date === filters.date);
    if (filters?.status) list = list.filter((a) => a.status === filters.status);

    return list.map((a) => ({
      ...a,
      staff: (global.__tempocare_staff || []).find((s) => s.id === a.staff_id),
      service: (global.__tempocare_services || []).find((svc) => svc.id === a.service_id),
    }));
  },

  async getAppointmentByToken(token: string): Promise<Appointment | null> {
    const found = (global.__tempocare_appointments || []).find((a) => a.reschedule_token === token);
    if (!found) return null;

    return {
      ...found,
      staff: (global.__tempocare_staff || []).find((s) => s.id === found.staff_id),
      service: (global.__tempocare_services || []).find((svc) => svc.id === found.service_id),
    };
  },

  async createAppointment(input: {
    patient_name: string;
    patient_whatsapp: string;
    patient_email?: string | null;
    service_id: string;
    staff_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    initial_complaint?: string;
    is_walk_in?: boolean;
  }): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    const normStartTime = normalizeTime(input.start_time);
    const normEndTime = normalizeTime(input.end_time);

    // 1. Strict Anti Double-Booking Check
    const existing = (global.__tempocare_appointments || []).find(
      (a) =>
        a.staff_id === input.staff_id &&
        a.appointment_date === input.appointment_date &&
        normalizeTime(a.start_time) === normStartTime &&
        a.status !== 'cancelled'
    );

    if (existing) {
      return {
        success: false,
        error:
          'DOUBLE_BOOKING_PREVENTED: Dokter yang Anda pilih telah memiliki jadwal janji temu aktif pada jam tersebut. Silakan pilih slot waktu lain.',
      };
    }

    // Check block-outs
    const isBlocked = (global.__tempocare_blockouts || []).some(
      (b) =>
        b.staff_id === input.staff_id &&
        b.block_date === input.appointment_date &&
        normStartTime >= normalizeTime(b.start_time) &&
        normStartTime < normalizeTime(b.end_time)
    );

    if (isBlocked) {
      return {
        success: false,
        error: 'Dokter berhalangan hadir pada jam tersebut (jadwal blokir/operasi cito/cuti). Silakan pilih slot lain.',
      };
    }

    const service = (global.__tempocare_services || []).find((s) => s.id === input.service_id);
    const queueNumber = generateQueueNumber(service?.name || 'Umum', input.appointment_date);
    
    const aptDateTime = new Date(`${input.appointment_date}T${normStartTime}:00`);
    const tokenExpiresAt = new Date(aptDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      patient_name: input.patient_name.trim(),
      patient_whatsapp: input.patient_whatsapp.trim(),
      patient_email: input.patient_email?.trim() || null,
      service_id: input.service_id,
      staff_id: input.staff_id,
      appointment_date: input.appointment_date,
      start_time: normStartTime,
      end_time: normEndTime,
      status: 'confirmed',
      initial_complaint: input.initial_complaint?.trim() || null,
      medical_notes: null,
      queue_number: queueNumber,
      reschedule_token: crypto.randomUUID(),
      token_expires_at: tokenExpiresAt,
      is_walk_in: Boolean(input.is_walk_in),
      created_at: new Date().toISOString(),
    };

    const supabase = createServerSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .insert(newAppointment)
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.message.includes('unique_doctor_schedule')) {
          return {
            success: false,
            error:
              'DOUBLE_BOOKING_PREVENTED: Terjadi bentrok jadwal secara simultan. Slot waktu ini baru saja dipesan oleh pasien lain.',
          };
        }
        return { success: false, error: error.message };
      }

      if (data) {
        newAppointment.id = data.id;
      }
    }

    global.__tempocare_appointments = [newAppointment, ...(global.__tempocare_appointments || [])];

    return {
      success: true,
      appointment: {
        ...newAppointment,
        staff: (global.__tempocare_staff || []).find((s) => s.id === newAppointment.staff_id),
        service,
      },
    };
  },

  async rescheduleAppointment(
    token: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ): Promise<{ success: boolean; error?: string; appointment?: Appointment }> {
    const list = global.__tempocare_appointments || [];
    const index = list.findIndex((a) => a.reschedule_token === token);

    if (index === -1) {
      return { success: false, error: 'Token tidak valid atau tautan reschedule telah hangus/kedaluwarsa.' };
    }

    const appt = list[index];

    const currentAppointmentTime = new Date(`${appt.appointment_date}T${appt.start_time}:00`);
    const now = new Date();
    const hoursDifference = (currentAppointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      return {
        success: false,
        error:
          'Batas waktu pindah jadwal telah lewat (Maksimal H-1 sebelum jadwal konsultasi). Silakan hubungi resepsionis RS.',
      };
    }

    const normStart = normalizeTime(newStartTime);
    const normEnd = normalizeTime(newEndTime);

    const collision = list.find(
      (a) =>
        a.id !== appt.id &&
        a.staff_id === appt.staff_id &&
        a.appointment_date === newDate &&
        normalizeTime(a.start_time) === normStart &&
        a.status !== 'cancelled'
    );

    if (collision) {
      return {
        success: false,
        error: 'Slot baru yang Anda pilih baru saja dipesan oleh pasien lain. Silakan pilih slot lain.',
      };
    }

    const updated: Appointment = {
      ...appt,
      appointment_date: newDate,
      start_time: normStart,
      end_time: normEnd,
      reschedule_token: crypto.randomUUID(),
      status: 'confirmed',
    };

    list[index] = updated;
    global.__tempocare_appointments = list;

    const supabase = createServerSupabase();
    if (supabase) {
      await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          start_time: normStart,
          end_time: normEnd,
          reschedule_token: updated.reschedule_token,
          status: 'confirmed',
        })
        .eq('id', appt.id);
    }

    return {
      success: true,
      appointment: {
        ...updated,
        staff: (global.__tempocare_staff || []).find((s) => s.id === updated.staff_id),
        service: (global.__tempocare_services || []).find((s) => s.id === updated.service_id),
      },
    };
  },

  async cancelAppointment(token: string): Promise<{ success: boolean; error?: string }> {
    const list = global.__tempocare_appointments || [];
    const index = list.findIndex((a) => a.reschedule_token === token);

    if (index === -1) {
      return { success: false, error: 'Token pembatalan tidak ditemukan atau sudah dibatalkan.' };
    }

    list[index].status = 'cancelled';
    global.__tempocare_appointments = list;

    const supabase = createServerSupabase();
    if (supabase) {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('reschedule_token', token);
    }

    return { success: true };
  },

  // Admin Reschedule & Cancel without token
  async adminUpdateAppointment(
    id: string,
    updates: Partial<Appointment>
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    const list = global.__tempocare_appointments || [];
    const index = list.findIndex((a) => a.id === id);

    if (index === -1) {
      return { success: false, error: 'Jadwal pasien tidak ditemukan.' };
    }

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    global.__tempocare_appointments = list;

    const supabase = createServerSupabase();
    if (supabase) {
      await supabase.from('appointments').update(updates).eq('id', id);
    }

    return {
      success: true,
      appointment: {
        ...updated,
        staff: (global.__tempocare_staff || []).find((s) => s.id === updated.staff_id),
        service: (global.__tempocare_services || []).find((s) => s.id === updated.service_id),
      },
    };
  },

  async updateMedicalNotes(
    id: string,
    notes: string,
    status: 'completed' | 'cancelled' | 'confirmed'
  ): Promise<{ success: boolean; error?: string }> {
    const list = global.__tempocare_appointments || [];
    const appt = list.find((a) => a.id === id);

    if (!appt) {
      return { success: false, error: 'Jadwal pasien tidak ditemukan.' };
    }

    appt.medical_notes = notes;
    appt.status = status;

    const supabase = createServerSupabase();
    if (supabase) {
      await supabase
        .from('appointments')
        .update({
          medical_notes: notes,
          status,
        })
        .eq('id', id);
    }

    return { success: true };
  },
};
