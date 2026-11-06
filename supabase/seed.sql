-- ==============================================================================
-- TempoCare - Clean Initial Seed (Tanpa Data Dummy)
-- ==============================================================================
-- Skrip ini hanya menginisialisasi profil awal faskes dan akun Admin Utama RS.
-- Data dokter, poliklinik, dan jadwal janji temu diisi secara manual melalui CMS Admin.
-- ==============================================================================

-- 1. Insert Default Clinic Settings
INSERT INTO clinic_settings (
  id, name, tagline, phone, emergency_phone, email, address, announcement, open_hour, close_hour
) VALUES (
  'clinic-default-01',
  'TempoCare Clinic & Hospital',
  'Klinik Pratama & Rumah Sakit Umum',
  '021-555-8367',
  '(021) 555-TEMPO',
  'info@tempocare.clinic',
  'Jl. Kesehatan No. 45, Jakarta Pusat',
  'Pendaftaran Buka 24 Jam • Langsung Dapat Nomor Antrean',
  '08:00',
  '17:00'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  phone = EXCLUDED.phone,
  emergency_phone = EXCLUDED.emergency_phone,
  email = EXCLUDED.email,
  address = EXCLUDED.address,
  announcement = EXCLUDED.announcement;

-- 2. Insert Default Staff (Admin Utama RS)
INSERT INTO staff (
  id, full_name, role, specialization, email, phone, is_active,
  practice_days, practice_start_time, practice_end_time, assigned_service_ids
) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Admin Utama RS',
    'admin',
    'Manajemen RS & Mutu Klinis',
    'admin.booking@gmail.com',
    '081234567890',
    true,
    ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
    '08:00',
    '17:00',
    ARRAY[]::TEXT[]
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  specialization = EXCLUDED.specialization,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;
