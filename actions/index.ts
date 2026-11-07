'use server';

import { db } from '@/lib/db';
import { generateAvailableSlots } from '@/lib/time-slots';
import { sendAppointmentEmail } from '@/lib/email';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Staff, Service, ClinicSettings } from '@/lib/types';

/**
 * Keamanan RBAC: Verifikasi sesi Staf (Dokter atau Admin)
 */
async function verifyStaffSession() {
  const cookieStore = cookies();
  const role = cookieStore.get('tempocare_role')?.value;
  if (!role || (role !== 'doctor' && role !== 'admin')) {
    throw new Error('Akses ditolak: Anda harus login sebagai Tenaga Medis atau Staf RS.');
  }
  return { role, staffId: cookieStore.get('tempocare_staff_id')?.value };
}

/**
 * Keamanan RBAC: Verifikasi sesi Admin penuh
 */
async function verifyAdminSession() {
  const cookieStore = cookies();
  const role = cookieStore.get('tempocare_role')?.value;
  if (role !== 'admin') {
    throw new Error('Akses ditolak: Operasi ini hanya diizinkan untuk Admin / Resepsionis RS.');
  }
  return { role, staffId: cookieStore.get('tempocare_staff_id')?.value };
}

export async function getAvailableSlotsAction(staffId: string, date: string, serviceId: string) {
  try {
    const service = await db.getServiceById(serviceId);
    if (!service) {
      return { success: false, error: 'Layanan tidak ditemukan' };
    }

    const doctor = await db.getStaffById(staffId);
    const appointments = await db.getAppointments({ staffId, date });
    const blockOuts = await db.getBlockOuts(staffId, date);

    const slots = generateAvailableSlots({
      date,
      durationMinutes: service.duration_minutes,
      appointments,
      blockOuts,
      doctor,
    });

    return { success: true, slots };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat jadwal' };
  }
}

export async function getDoctorsForServiceAction(serviceId: string) {
  try {
    const doctors = await db.getDoctorsForService(serviceId);
    return { success: true, doctors };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat dokter' };
  }
}

export async function bookAppointmentAction(data: {
  patient_name: string;
  patient_whatsapp: string;
  patient_email?: string;
  service_id: string;
  staff_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  initial_complaint?: string;
}) {
  try {
    if (!data.patient_name || !data.patient_whatsapp || !data.service_id || !data.staff_id || !data.appointment_date || !data.start_time) {
      return { success: false, error: 'Mohon lengkapi semua kolom formulir yang wajib diisi.' };
    }

    const result = await db.createAppointment({
      patient_name: data.patient_name,
      patient_whatsapp: data.patient_whatsapp,
      patient_email: data.patient_email || null,
      service_id: data.service_id,
      staff_id: data.staff_id,
      appointment_date: data.appointment_date,
      start_time: data.start_time,
      end_time: data.end_time,
      initial_complaint: data.initial_complaint,
    });

    if (!result.success || !result.appointment) {
      return { success: false, error: result.error || 'Gagal membuat reservasi' };
    }

    try {
      await sendAppointmentEmail(result.appointment);
    } catch (e) {
      console.error('Email error:', e);
    }

    revalidatePath('/');
    revalidatePath('/dashboard/doctor');
    revalidatePath('/dashboard/admin');

    return {
      success: true,
      appointment: result.appointment,
      queueNumber: result.appointment.queue_number,
      token: result.appointment.reschedule_token,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem' };
  }
}

export async function rescheduleAppointmentAction(
  token: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string
) {
  try {
    const result = await db.rescheduleAppointment(token, newDate, newStartTime, newEndTime);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath('/manage');
    revalidatePath('/dashboard/doctor');
    revalidatePath('/dashboard/admin');

    return { success: true, appointment: result.appointment };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengubah jadwal' };
  }
}

export async function cancelAppointmentAction(token: string) {
  try {
    const result = await db.cancelAppointment(token);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath('/manage');
    revalidatePath('/dashboard/doctor');
    revalidatePath('/dashboard/admin');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membatalkan jadwal' };
  }
}

export async function updateMedicalNotesAction(
  appointmentId: string,
  notes: string,
  status: 'completed' | 'cancelled' | 'confirmed'
) {
  try {
    await verifyStaffSession();
    const result = await db.updateMedicalNotes(appointmentId, notes, status);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath('/dashboard/doctor');
    revalidatePath('/dashboard/admin');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan catatan medis' };
  }
}

export async function createBlockOutAction(data: {
  staff_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string;
}) {
  try {
    await verifyAdminSession();
    const block = await db.createBlockOut(data);
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    return { success: true, block };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuat blokir jadwal' };
  }
}

export async function deleteBlockOutAction(id: string) {
  try {
    await verifyAdminSession();
    await db.deleteBlockOut(id);
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus blokir jadwal' };
  }
}

export async function createWalkInAppointmentAction(data: {
  patient_name: string;
  patient_whatsapp: string;
  service_id: string;
  staff_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  initial_complaint?: string;
}) {
  try {
    await verifyAdminSession();
    const result = await db.createAppointment({
      ...data,
      is_walk_in: true,
    });

    if (!result.success || !result.appointment) {
      return { success: false, error: result.error };
    }

    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/doctor');
    return { success: true, appointment: result.appointment };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mendaftarkan pasien walk-in' };
  }
}

// ==============================================================================
// CMS ADMIN ACTIONS: STAFF / DOCTORS CRUD
// ==============================================================================

export async function createStaffAction(data: {
  full_name: string;
  role: 'doctor' | 'admin' | 'nurse' | 'receptionist';
  specialization?: string;
  email: string;
  password?: string;
  phone?: string;
  practice_days?: string[];
  practice_start_time?: string;
  practice_end_time?: string;
  assigned_service_ids?: string[];
}) {
  try {
    await verifyAdminSession();
    const staff = await db.createStaff({
      ...data,
      is_active: true,
    });
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    return { success: true, staff };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menambah staf' };
  }
}

export async function updateStaffAction(id: string, updates: Partial<Staff>) {
  try {
    await verifyAdminSession();
    const updated = await db.updateStaff(id, updates);
    if (!updated) return { success: false, error: 'Staf tidak ditemukan' };
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    return { success: true, staff: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memperbarui data staf' };
  }
}

export async function deleteStaffAction(id: string) {
  try {
    await verifyAdminSession();
    await db.deleteStaff(id);
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus staf' };
  }
}

// ==============================================================================
// CMS ADMIN ACTIONS: SERVICES / POLIKLINIK CRUD
// ==============================================================================

export async function createServiceAction(data: {
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
}) {
  try {
    await verifyAdminSession();
    const service = await db.createService({
      ...data,
      is_active: true,
    });
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    return { success: true, service };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menambah poliklinik/layanan' };
  }
}

export async function updateServiceAction(id: string, updates: Partial<Service>) {
  try {
    await verifyAdminSession();
    const updated = await db.updateService(id, updates);
    if (!updated) return { success: false, error: 'Layanan tidak ditemukan' };
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    return { success: true, service: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memperbarui layanan' };
  }
}

export async function deleteServiceAction(id: string) {
  try {
    await verifyAdminSession();
    await db.deleteService(id);
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus layanan' };
  }
}

// ==============================================================================
// CMS ADMIN ACTIONS: CLINIC PROFILE & SETTINGS
// ==============================================================================

export async function updateClinicSettingsAction(data: Partial<ClinicSettings>) {
  try {
    await verifyAdminSession();
    const updated = await db.updateClinicSettings(data);
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    return { success: true, settings: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan pengaturan faskes' };
  }
}

// ==============================================================================
// CMS ADMIN ACTIONS: APPOINTMENTS MANAGEMENT (Helicopter View controls)
// ==============================================================================

export async function adminUpdateAppointmentAction(
  id: string,
  updates: {
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    appointment_date?: string;
    start_time?: string;
    end_time?: string;
  }
) {
  try {
    await verifyAdminSession();
    const res = await db.adminUpdateAppointment(id, updates);
    if (!res.success) return { success: false, error: res.error };
    revalidatePath('/');
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/doctor');
    return { success: true, appointment: res.appointment };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memperbarui jadwal pasien' };
  }
}
