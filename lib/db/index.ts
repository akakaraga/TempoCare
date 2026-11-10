import { Staff, Service, Appointment, BlockOut, ClinicSettings } from '@/lib/types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// ==============================================================================
// Persistent Local Store (Guarantees data is never lost across server reloads)
// ==============================================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

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

const defaultAdminStaff: Staff = {
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
};

interface LocalStore {
  clinic_settings: ClinicSettings;
  staff: Staff[];
  services: Service[];
  staff_services: { staff_id: string; service_id: string }[];
  appointments: Appointment[];
  block_outs: BlockOut[];
}

function loadLocalStore(): LocalStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        clinic_settings: parsed.clinic_settings || defaultClinicSettings,
        staff: parsed.staff && parsed.staff.length > 0 ? parsed.staff : [defaultAdminStaff],
        services: parsed.services || [],
        staff_services: parsed.staff_services || [],
        appointments: parsed.appointments || [],
        block_outs: parsed.block_outs || [],
      };
    }
  } catch (err) {
    console.error('Gagal membaca store lokal:', err);
  }
  return {
    clinic_settings: { ...defaultClinicSettings },
    staff: [defaultAdminStaff],
    services: [],
    staff_services: [],
    appointments: [],
    block_outs: [],
  };
}

function saveLocalStore(store: LocalStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Gagal menyimpan store lokal:', err);
  }
}

// ==============================================================================
// Supabase Administrative Client (Bypasses RLS issues on server-side)
// ==============================================================================

let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (_supabaseAdmin) return _supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  try {
    _supabaseAdmin = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return _supabaseAdmin;
  } catch (err) {
    console.error('Gagal inisialisasi Supabase client:', err);
    return null;
  }
}

export function normalizeTime(t: string): string {
  if (!t) return '';
  const parts = t.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return t;
}

function generateQueueNumber(serviceName: string, date: string, appointments: Appointment[]): string {
  let prefix = 'P';
  if (serviceName.toLowerCase().includes('anak')) prefix = 'A';
  else if (serviceName.toLowerCase().includes('gigi')) prefix = 'G';
  else if (serviceName.toLowerCase().includes('dalam')) prefix = 'D';
  else if (serviceName.toLowerCase().includes('umum')) prefix = 'U';
  else if (serviceName.toLowerCase().includes('mata')) prefix = 'M';
  else if (serviceName.toLowerCase().includes('tht')) prefix = 'T';
  else if (serviceName.toLowerCase().includes('kandungan')) prefix = 'O';

  const countToday = (appointments || []).filter((a) => a.appointment_date === date).length;
  const number = (countToday + 1).toString().padStart(3, '0');
  return `${prefix}-${number}`;
}

// ==============================================================================
// Database Operations (Dual-Layer: Supabase PostgreSQL + Persistent Local Backup)
// ==============================================================================

export const db = {
  // ----------------------------------------------------------------------------
  // 1. CLINIC SETTINGS
  // ----------------------------------------------------------------------------
  async getClinicSettings(): Promise<ClinicSettings> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('clinic_settings').select('*').limit(1).single();
        if (!error && data) {
          const store = loadLocalStore();
          store.clinic_settings = data as ClinicSettings;
          saveLocalStore(store);
          return data as ClinicSettings;
        }
      } catch (err) {
        console.warn('[Supabase getClinicSettings]', err);
      }
    }
    const store = loadLocalStore();
    return store.clinic_settings || defaultClinicSettings;
  },

  async updateClinicSettings(data: Partial<ClinicSettings>): Promise<ClinicSettings> {
    const store = loadLocalStore();
    const updated: ClinicSettings = {
      ...(store.clinic_settings || defaultClinicSettings),
      ...data,
      updated_at: new Date().toISOString(),
    };
    store.clinic_settings = updated;
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('clinic_settings').upsert(updated);
      } catch (err) {
        console.warn('[Supabase updateClinicSettings]', err);
      }
    }

    return updated;
  },

  // ----------------------------------------------------------------------------
  // 2. STAFF / DOCTORS CRUD
  // ----------------------------------------------------------------------------
  async getStaffList(role?: string): Promise<Staff[]> {
    const store = loadLocalStore();
    let localStaffList = store.staff || [];

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from('staff').select('*').order('full_name');
        if (role) query = query.eq('role', role);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          // Merge Supabase staff dengan local staff (mempertahankan password yang sudah tersimpan di lokal)
          const mergedStaff = (data as Staff[]).map((supaStaff) => {
            const existingLocal = localStaffList.find(
              (s) => s.id === supaStaff.id || (s.email && s.email.toLowerCase() === (supaStaff.email || '').toLowerCase())
            );
            return {
              ...supaStaff,
              password: existingLocal?.password || (supaStaff as any).password,
              assigned_service_ids: supaStaff.assigned_service_ids || existingLocal?.assigned_service_ids || [],
            };
          });

          const supaIds = new Set(data.map((d: any) => d.id));
          const supaEmails = new Set(data.map((d: any) => (d.email || '').toLowerCase()));
          const unsyncedLocal = localStaffList.filter(
            (l) => !supaIds.has(l.id) && !supaEmails.has((l.email || '').toLowerCase())
          );

          const finalList = [...mergedStaff, ...unsyncedLocal];
          if (!role) {
            store.staff = finalList;
            saveLocalStore(store);
          }
          localStaffList = finalList;
        }
      } catch (err) {
        console.warn('[Supabase getStaffList]', err);
      }
    }

    let list = localStaffList;
    if (role) list = list.filter((s) => s.role === role);
    return list;
  },

  async getStaffById(id: string): Promise<Staff | null> {
    const list = await this.getStaffList();
    return list.find((s) => s.id === id) || null;
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

    const supabase = getSupabaseClient();

    // 1. Buat akun login staf di Supabase Auth jika password disediakan
    if (supabase && staffData.password) {
      try {
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: staffData.email,
          password: staffData.password,
          email_confirm: true,
          user_metadata: {
            full_name: staffData.full_name,
            role: staffData.role,
          },
        });
        if (!authErr && authUser?.user) {
          newStaff.user_id = authUser.user.id;
        } else if (authErr) {
          console.warn('[Supabase Auth createUser]', authErr.message);
        }
      } catch (err) {
        console.warn('[Supabase Auth createUser Exception]', err);
      }
    }

    // 2. Simpan ke Supabase PostgreSQL tabel staff
    if (supabase) {
      try {
        const { password, ...staffDbRecord } = newStaff;
        const { data, error } = await supabase.from('staff').insert(staffDbRecord).select().single();
        if (!error && data) {
          newStaff.id = data.id;
        } else if (error) {
          console.warn('[Supabase createStaff Error]', error.message);
        }
      } catch (err) {
        console.warn('[Supabase createStaff Exception]', err);
      }
    }

    // 3. Simpan ke local store persisten
    const store = loadLocalStore();
    store.staff = [newStaff, ...(store.staff || []).filter((s) => s.id !== newStaff.id && s.email.toLowerCase() !== newStaff.email.toLowerCase())];
    saveLocalStore(store);

    // Perbarui relasi staff_services
    if (newStaff.assigned_service_ids && newStaff.assigned_service_ids.length > 0) {
      await this.assignStaffServices(newStaff.id, newStaff.assigned_service_ids);
    }

    return newStaff;
  },

  async updateStaff(id: string, updates: Partial<Staff>): Promise<Staff | null> {
    const store = loadLocalStore();
    const list = store.staff || [];
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updated = { ...existing, ...updates };
    list[index] = updated;
    store.staff = list;
    saveLocalStore(store);

    if (updates.assigned_service_ids) {
      await this.assignStaffServices(id, updates.assigned_service_ids);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      // Jika kata sandi baru diisi, sinkronkan ke Supabase Auth
      if (updates.password) {
        if (existing.user_id) {
          try {
            await supabase.auth.admin.updateUserById(existing.user_id, {
              password: updates.password,
              email: updates.email || existing.email,
            });
          } catch (err) {
            console.warn('[Supabase Auth updateUserById]', err);
          }
        } else {
          // Buat akun baru di Supabase Auth jika user_id belum ada
          try {
            const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
              email: updates.email || existing.email,
              password: updates.password,
              email_confirm: true,
              user_metadata: {
                full_name: updates.full_name || existing.full_name,
                role: updates.role || existing.role,
              },
            });
            if (!createErr && newUser?.user) {
              updated.user_id = newUser.user.id;
              list[index].user_id = newUser.user.id;
              store.staff = list;
              saveLocalStore(store);
            }
          } catch (err) {
            console.warn('[Supabase Auth createUser on updateStaff]', err);
          }
        }
      }

      try {
        const { password, ...staffUpdates } = updates;
        if (updated.user_id && !staffUpdates.user_id) {
          (staffUpdates as any).user_id = updated.user_id;
        }
        await supabase.from('staff').update(staffUpdates).eq('id', id);
      } catch (err) {
        console.warn('[Supabase updateStaff]', err);
      }
    }

    return updated;
  },

  async deleteStaff(id: string): Promise<boolean> {
    const store = loadLocalStore();
    store.staff = (store.staff || []).filter((s) => s.id !== id);
    store.staff_services = (store.staff_services || []).filter((r) => r.staff_id !== id);
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('staff').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase deleteStaff]', err);
      }
    }

    return true;
  },

  // ----------------------------------------------------------------------------
  // 3. SERVICES / POLIKLINIK CRUD
  // ----------------------------------------------------------------------------
  async getServices(activeOnly = false): Promise<Service[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from('services').select('*').order('name');
        if (activeOnly) query = query.eq('is_active', true);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const store = loadLocalStore();
          if (!activeOnly) {
            store.services = data as Service[];
            saveLocalStore(store);
          }
          return data as Service[];
        }
      } catch (err) {
        console.warn('[Supabase getServices]', err);
      }
    }

    const store = loadLocalStore();
    let list = store.services || [];
    if (activeOnly) list = list.filter((s) => s.is_active);
    return list;
  },

  async getServiceById(id: string): Promise<Service | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
        if (!error && data) return data as Service;
      } catch (err) {
        console.warn('[Supabase getServiceById]', err);
      }
    }
    const store = loadLocalStore();
    return (store.services || []).find((s) => s.id === id) || null;
  },

  async createService(serviceData: Omit<Service, 'id' | 'created_at'>): Promise<Service> {
    const newService: Service = {
      ...serviceData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    // 1. Simpan ke local store persisten terlebih dahulu (Dijamin Tidak Reset)
    const store = loadLocalStore();
    store.services = [newService, ...(store.services || []).filter((s) => s.id !== newService.id)];
    saveLocalStore(store);

    // 2. Simpan ke Supabase PostgreSQL
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('services').insert(newService).select().single();
        if (!error && data) {
          newService.id = data.id;
        } else if (error) {
          console.warn('[Supabase createService Error]', error.message);
        }
      } catch (err) {
        console.warn('[Supabase createService Exception]', err);
      }
    }

    return newService;
  },

  async updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
    const store = loadLocalStore();
    const list = store.services || [];
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updated = { ...list[index], ...updates };
    list[index] = updated;
    store.services = list;
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('services').update(updates).eq('id', id);
      } catch (err) {
        console.warn('[Supabase updateService]', err);
      }
    }

    return updated;
  },

  async deleteService(id: string): Promise<boolean> {
    const store = loadLocalStore();
    store.services = (store.services || []).filter((s) => s.id !== id);
    store.staff_services = (store.staff_services || []).filter((r) => r.service_id !== id);
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('services').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase deleteService]', err);
      }
    }

    return true;
  },

  // ----------------------------------------------------------------------------
  // 4. MAPPING DOKTER KE LAYANAN (STAFF_SERVICES)
  // ----------------------------------------------------------------------------
  async getDoctorsForService(serviceId: string): Promise<Staff[]> {
    const store = loadLocalStore();
    const doctors = (store.staff || []).filter((s) => s.role === 'doctor' && s.is_active);

    const mapped = doctors.filter(
      (d) => d.assigned_service_ids && d.assigned_service_ids.includes(serviceId)
    );
    if (mapped.length > 0) return mapped;

    const rels = (store.staff_services || []).filter((r) => r.service_id === serviceId);
    if (rels.length > 0) {
      const doctorIds = new Set(rels.map((r) => r.staff_id));
      return doctors.filter((s) => doctorIds.has(s.id));
    }

    return doctors;
  },

  async assignStaffServices(staffId: string, serviceIds: string[]): Promise<void> {
    const store = loadLocalStore();
    store.staff_services = (store.staff_services || []).filter((r) => r.staff_id !== staffId);
    const newRels = serviceIds.map((sId) => ({ staff_id: staffId, service_id: sId }));
    store.staff_services = [...store.staff_services, ...newRels];

    const staff = (store.staff || []).find((s) => s.id === staffId);
    if (staff) {
      staff.assigned_service_ids = serviceIds;
    }
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('staff_services').delete().eq('staff_id', staffId);
        if (newRels.length > 0) {
          await supabase.from('staff_services').insert(newRels);
        }
      } catch (err) {
        console.warn('[Supabase assignStaffServices]', err);
      }
    }
  },

  // ----------------------------------------------------------------------------
  // 5. BLOCK OUTS CMS
  // ----------------------------------------------------------------------------
  async getBlockOuts(staffId?: string, date?: string): Promise<BlockOut[]> {
    const store = loadLocalStore();
    let items = store.block_outs || [];
    if (staffId) items = items.filter((b) => b.staff_id === staffId);
    if (date) items = items.filter((b) => b.block_date === date);

    return items.map((b) => ({
      ...b,
      staff: (store.staff || []).find((s) => s.id === b.staff_id),
    }));
  },

  async createBlockOut(data: Omit<BlockOut, 'id' | 'created_at'>): Promise<BlockOut> {
    const newBlock: BlockOut = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const store = loadLocalStore();
    store.block_outs = [newBlock, ...(store.block_outs || []).filter((b) => b.id !== newBlock.id)];
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: res, error } = await supabase.from('block_outs').insert(newBlock).select().single();
        if (!error && res) {
          newBlock.id = res.id;
        } else if (error) {
          console.warn('[Supabase createBlockOut]', error.message);
        }
      } catch (err) {
        console.warn('[Supabase createBlockOut]', err);
      }
    }

    return {
      ...newBlock,
      staff: (store.staff || []).find((s) => s.id === newBlock.staff_id),
    };
  },

  async deleteBlockOut(id: string): Promise<boolean> {
    const store = loadLocalStore();
    store.block_outs = (store.block_outs || []).filter((b) => b.id !== id);
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('block_outs').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase deleteBlockOut]', err);
      }
    }

    return true;
  },

  // ----------------------------------------------------------------------------
  // 6. APPOINTMENTS (Anti Double-Booking Guaranteed)
  // ----------------------------------------------------------------------------
  async getAppointments(filters?: {
    staffId?: string;
    date?: string;
    status?: string;
  }): Promise<Appointment[]> {
    const store = loadLocalStore();
    let allAppointments: Appointment[] = [...(store.appointments || [])];

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('appointment_date')
          .order('start_time');

        if (!error && data && data.length > 0) {
          // Merge Supabase data dengan local store (menghindari data hilang jika salah satu layer tertinggal)
          const localIds = new Set(allAppointments.map((a) => a.id));
          const newFromSupabase = (data as Appointment[]).filter((d) => !localIds.has(d.id));
          allAppointments = [...allAppointments, ...newFromSupabase];
        }
      } catch (err) {
        console.warn('[Supabase getAppointments]', err);
      }
    }

    let list = allAppointments;

    if (filters?.staffId) {
      list = list.filter((a) => a.staff_id === filters.staffId);
    }
    if (filters?.date) {
      list = list.filter((a) => a.appointment_date === filters.date);
    }
    if (filters?.status) {
      list = list.filter((a) => a.status === filters.status);
    }

    // Urutkan berdasarkan tanggal & waktu mulai
    list.sort((a, b) => {
      const cmpDate = a.appointment_date.localeCompare(b.appointment_date);
      if (cmpDate !== 0) return cmpDate;
      return a.start_time.localeCompare(b.start_time);
    });

    return list.map((a) => ({
      ...a,
      staff: (store.staff || []).find((s) => s.id === a.staff_id),
      service: (store.services || []).find((svc) => svc.id === a.service_id),
    }));
  },

  async findAppointments(
    query: string,
    options?: { allowToken?: boolean }
  ): Promise<Appointment[]> {
    if (!query || !query.trim()) return [];

    let cleanQuery = query.trim();
    const allowToken = Boolean(options?.allowToken);

    // Jika query berupa URL (misal ".../manage?token=xxx") dan token diizinkan
    if (allowToken && cleanQuery.includes('token=')) {
      try {
        const url = new URL(cleanQuery, 'http://localhost');
        const tokenParam = url.searchParams.get('token');
        if (tokenParam) cleanQuery = tokenParam.trim();
      } catch {
        // Abaikan jika bukan format URL valid
      }
    }

    const lowerQuery = cleanQuery.toLowerCase();
    const isPhoneFormat = /^[+\d\s\-()]+$/.test(cleanQuery);
    const cleanNumeric = isPhoneFormat ? cleanQuery.replace(/\D/g, '') : '';
    const cleanQueueInput = cleanQuery.replace(/[\s\-_]/g, '').toLowerCase();

    // Normalisasi nomor telepon Indonesia (hilangkan awalan 62 atau 0 untuk pembanding)
    let phoneCore = cleanNumeric;
    if (phoneCore.startsWith('62')) phoneCore = phoneCore.slice(2);
    if (phoneCore.startsWith('0')) phoneCore = phoneCore.slice(1);

    const allAppointments = await this.getAppointments();

    const matched = allAppointments.filter((a) => {
      // 1. Token exact match (hanya jika dibuka melalui tautan ?token= dari konfirmasi booking/email)
      if (allowToken && a.reschedule_token && a.reschedule_token.toLowerCase() === lowerQuery) {
        return true;
      }

      // 2. Nomor Antrean exact match yang fleksibel terhadap huruf besar/kecil & tanda hubung (contoh: "U-002", "u-002", "U002")
      if (a.queue_number && cleanQueueInput.length >= 2) {
        const dbQueueLower = a.queue_number.toLowerCase();
        const dbQueueClean = a.queue_number.replace(/[\s\-_]/g, '').toLowerCase();

        if (dbQueueLower === lowerQuery || dbQueueClean === cleanQueueInput) {
          return true;
        }
      }

      // 3. Nomor WhatsApp exact match dengan normalisasi kode negara (+62 / 62 / 0)
      if (isPhoneFormat && phoneCore.length >= 7 && a.patient_whatsapp && a.patient_whatsapp !== '-') {
        const dbPhoneNumeric = a.patient_whatsapp.replace(/\D/g, '');
        let dbPhoneCore = dbPhoneNumeric;
        if (dbPhoneCore.startsWith('62')) dbPhoneCore = dbPhoneCore.slice(2);
        if (dbPhoneCore.startsWith('0')) dbPhoneCore = dbPhoneCore.slice(1);

        if (dbPhoneNumeric === cleanNumeric || dbPhoneCore === phoneCore) {
          return true;
        }
      }

      return false;
    });

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const isUpcoming = (apt: Appointment) => apt.status === 'confirmed' && apt.appointment_date >= todayStr;

    // Urutkan: jadwal aktif mendatang terlebih dahulu (terdekat ke terjauh), lalu riwayat (terbaru ke terlama)
    matched.sort((a, b) => {
      const aUp = isUpcoming(a);
      const bUp = isUpcoming(b);
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      if (aUp && bUp) {
        const dateCmp = a.appointment_date.localeCompare(b.appointment_date);
        if (dateCmp !== 0) return dateCmp;
        return (a.start_time || '').localeCompare(b.start_time || '');
      }
      const dateCmpDesc = b.appointment_date.localeCompare(a.appointment_date);
      if (dateCmpDesc !== 0) return dateCmpDesc;
      return (b.start_time || '').localeCompare(a.start_time || '');
    });

    return matched;
  },

  async getAppointmentByToken(token: string): Promise<Appointment | null> {
    const list = await this.findAppointments(token, { allowToken: true });
    return list.length > 0 ? list[0] : null;
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

    const store = loadLocalStore();

    // 1. Strict Anti Double-Booking Check
    const existing = (store.appointments || []).find(
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
    const isBlocked = (store.block_outs || []).some(
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

    const service = (store.services || []).find((s) => s.id === input.service_id);
    const queueNumber = generateQueueNumber(service?.name || 'Umum', input.appointment_date, store.appointments);

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

    // 1. Simpan ke local store persisten
    store.appointments = [newAppointment, ...(store.appointments || []).filter((a) => a.id !== newAppointment.id)];
    saveLocalStore(store);

    // 2. Simpan ke Supabase PostgreSQL
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('appointments').insert(newAppointment).select().single();
        if (error) {
          if (error.code === '23505') {
            return {
              success: false,
              error: 'DOUBLE_BOOKING_PREVENTED: Dokter telah memiliki jadwal aktif pada jam tersebut.',
            };
          }
          console.warn('[Supabase createAppointment]', error.message);
        } else if (data) {
          newAppointment.id = data.id;
          newAppointment.reschedule_token = data.reschedule_token;
        }
      } catch (err) {
        console.warn('[Supabase createAppointment]', err);
      }
    }

    const populated: Appointment = {
      ...newAppointment,
      staff: (store.staff || []).find((s) => s.id === newAppointment.staff_id),
      service: (store.services || []).find((svc) => svc.id === newAppointment.service_id),
    };

    return { success: true, appointment: populated };
  },

  async rescheduleAppointment(
    token: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    const store = loadLocalStore();
    const index = (store.appointments || []).findIndex((a) => a.reschedule_token === token);
    if (index === -1) {
      return { success: false, error: 'Token reservasi tidak valid atau telah kedaluwarsa.' };
    }

    const apt = store.appointments[index];
    const normStartTime = normalizeTime(newStartTime);
    const normEndTime = normalizeTime(newEndTime);

    // Lockout H-1 check
    const currentAptDateTime = new Date(`${apt.appointment_date}T${apt.start_time}:00`);
    const hoursRemaining = (currentAptDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining < 24) {
      return {
        success: false,
        error: 'LOCKOUT_TIME_EXPIRED: Perubahan jadwal hanya dapat dilakukan maksimal H-1 (24 jam sebelum pemeriksaan).',
      };
    }

    // Check conflict
    const conflict = (store.appointments || []).find(
      (a) =>
        a.id !== apt.id &&
        a.staff_id === apt.staff_id &&
        a.appointment_date === newDate &&
        normalizeTime(a.start_time) === normStartTime &&
        a.status !== 'cancelled'
    );
    if (conflict) {
      return { success: false, error: 'Jadwal dokter pada jam tersebut sudah terisi. Silakan pilih slot lain.' };
    }

    const newAptDateTime = new Date(`${newDate}T${normStartTime}:00`);
    const newTokenExpiresAt = new Date(newAptDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const updated: Appointment = {
      ...apt,
      appointment_date: newDate,
      start_time: normStartTime,
      end_time: normEndTime,
      reschedule_token: crypto.randomUUID(), // Rotasi token (One-time use)
      token_expires_at: newTokenExpiresAt,
    };

    store.appointments[index] = updated;
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('appointments')
          .update({
            appointment_date: newDate,
            start_time: normStartTime,
            end_time: normEndTime,
            reschedule_token: updated.reschedule_token,
            token_expires_at: newTokenExpiresAt,
          })
          .eq('id', apt.id);
      } catch (err) {
        console.warn('[Supabase rescheduleAppointment]', err);
      }
    }

    return {
      success: true,
      appointment: {
        ...updated,
        staff: (store.staff || []).find((s) => s.id === updated.staff_id),
        service: (store.services || []).find((svc) => svc.id === updated.service_id),
      },
    };
  },

  async cancelAppointment(token: string): Promise<{ success: boolean; error?: string }> {
    const store = loadLocalStore();
    const index = (store.appointments || []).findIndex((a) => a.reschedule_token === token);
    if (index === -1) {
      return { success: false, error: 'Token reservasi tidak ditemukan atau sudah dibatalkan.' };
    }

    const apt = store.appointments[index];
    const currentAptDateTime = new Date(`${apt.appointment_date}T${apt.start_time}:00`);
    const hoursRemaining = (currentAptDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursRemaining < 24) {
      return {
        success: false,
        error: 'LOCKOUT_TIME_EXPIRED: Pembatalan hanya dapat dilakukan maksimal H-1 (24 jam sebelum pemeriksaan).',
      };
    }

    apt.status = 'cancelled';
    store.appointments[index] = apt;
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', apt.id);
      } catch (err) {
        console.warn('[Supabase cancelAppointment]', err);
      }
    }

    return { success: true };
  },

  async updateMedicalNotes(
    appointmentId: string,
    notes: string,
    status: 'completed' | 'cancelled' | 'confirmed'
  ): Promise<{ success: boolean; error?: string }> {
    const store = loadLocalStore();
    const index = (store.appointments || []).findIndex((a) => a.id === appointmentId);
    if (index === -1) {
      return { success: false, error: 'Janji temu tidak ditemukan' };
    }

    store.appointments[index] = {
      ...store.appointments[index],
      medical_notes: notes,
      status,
    };
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('appointments')
          .update({
            medical_notes: notes,
            status,
          })
          .eq('id', appointmentId);
      } catch (err) {
        console.warn('[Supabase updateMedicalNotes]', err);
      }
    }

    return { success: true };
  },

  async adminUpdateAppointment(
    id: string,
    updates: {
      status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
      appointment_date?: string;
      start_time?: string;
      end_time?: string;
    }
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    const store = loadLocalStore();
    const index = (store.appointments || []).findIndex((a) => a.id === id);
    if (index === -1) {
      return { success: false, error: 'Janji temu tidak ditemukan' };
    }

    const updated = { ...store.appointments[index], ...updates };
    store.appointments[index] = updated;
    saveLocalStore(store);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('appointments').update(updates).eq('id', id);
      } catch (err) {
        console.warn('[Supabase adminUpdateAppointment]', err);
      }
    }

    return {
      success: true,
      appointment: {
        ...updated,
        staff: (store.staff || []).find((s) => s.id === updated.staff_id),
        service: (store.services || []).find((svc) => svc.id === updated.service_id),
      },
    };
  },
};
