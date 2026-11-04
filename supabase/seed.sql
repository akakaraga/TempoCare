-- ==============================================================================
-- TempoCare - Seed Data (Contoh Faskes: RS/Klinik TempoCare)
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

-- 2. Insert Staff (Dokter & Staf Medis)
INSERT INTO staff (
  id, full_name, role, specialization, email, phone, is_active,
  practice_days, practice_start_time, practice_end_time, assigned_service_ids
) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Dr. Sarah Danastri',
    'admin',
    'Manajemen RS & Mutu Klinis',
    'admin@tempocare.clinic',
    '08111222333',
    true,
    ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
    '08:00',
    '17:00',
    ARRAY[]::TEXT[]
  ),
  (
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Dr. Budi Santoso, Sp.A',
    'doctor',
    'Spesialis Anak (Pediatri)',
    'dr.budi@tempocare.clinic',
    '081234567891',
    true,
    ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    '08:00',
    '16:00',
    ARRAY['e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', '16eebc99-9c0b-4ef8-bb6d-6bb9bd380a77']
  ),
  (
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Drg. Citra Lestari',
    'doctor',
    'Dokter Gigi & Konservasi',
    'drg.citra@tempocare.clinic',
    '081345678912',
    true,
    ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
    '09:00',
    '17:00',
    ARRAY['f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66']
  ),
  (
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'Dr. Hendra Gunawan, Sp.PD',
    'doctor',
    'Spesialis Penyakit Dalam',
    'dr.hendra@tempocare.clinic',
    '081456789123',
    true,
    ARRAY['Senin', 'Rabu', 'Jumat', 'Sabtu'],
    '08:00',
    '15:00',
    ARRAY['27eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', '16eebc99-9c0b-4ef8-bb6d-6bb9bd380a77']
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  specialization = EXCLUDED.specialization,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  practice_days = EXCLUDED.practice_days,
  practice_start_time = EXCLUDED.practice_start_time,
  practice_end_time = EXCLUDED.practice_end_time,
  assigned_service_ids = EXCLUDED.assigned_service_ids;

-- 3. Insert Services (Poliklinik)
INSERT INTO services (id, name, description, duration_minutes, price, is_active) VALUES
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Konsultasi Spesialis Anak', 'Pemeriksaan tumbuh kembang, imunisasi, dan penanganan demam/batuk pada anak.', 30, 250000, true),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Cabut Gigi & Scaling', 'Tindakan pencabutan gigi sulung/tetap serta pembersihan karang gigi profesional.', 45, 350000, true),
  ('16eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'Konsultasi Dokter Umum', 'Pemeriksaan kesehatan dasar, tensi darah, dan resep obat awal.', 20, 120000, true),
  ('27eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'Konsultasi Penyakit Dalam', 'Evaluasi metabolik, hipertensi, diabetes, dan konsultasi organ dalam.', 30, 300000, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  price = EXCLUDED.price;

-- 4. Insert Staff Services (Relasi Many-to-Many)
INSERT INTO staff_services (staff_id, service_id) VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '27eebc99-9c0b-4ef8-bb6d-6bb9bd380a88'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '16eebc99-9c0b-4ef8-bb6d-6bb9bd380a77'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '16eebc99-9c0b-4ef8-bb6d-6bb9bd380a77')
ON CONFLICT (staff_id, service_id) DO NOTHING;

-- 5. Insert Sample Block-outs
INSERT INTO block_outs (id, staff_id, block_date, start_time, end_time, reason) VALUES
  ('38eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', CURRENT_DATE + INTERVAL '1 day', '12:00:00', '13:00:00', 'Istirahat & Visit Rawat Inap'),
  ('49eebc99-9c0b-4ef8-bb6d-6bb9bd380a00', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', CURRENT_DATE + INTERVAL '2 day', '14:00:00', '16:00:00', 'Sterilisasi Unit Dental & Rapat Mutu')
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Sample Appointments
INSERT INTO appointments (
  id, patient_name, patient_whatsapp, patient_email,
  service_id, staff_id, appointment_date, start_time, end_time,
  status, initial_complaint, medical_notes, queue_number,
  reschedule_token, token_expires_at
) VALUES
  (
    '5aeebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
    'Ananda Rizky (Ibu Maya)',
    '081234567890',
    'maya.rizky@example.com',
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    CURRENT_DATE,
    '09:00:00',
    '09:30:00',
    'confirmed',
    'Demam 3 hari naik turun disertai batuk berdahak',
    'Suhu 38.2C, faring hiperemis ringan. Diberikan Paracetamol sirup 3x1 cth dan ambroxol.',
    'A-001',
    '6beebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    NOW() + INTERVAL '1 day'
  ),
  (
    '7ceebc99-9c0b-4ef8-bb6d-6bb9bd380b33',
    'Pak Joko Widodo',
    '081987654321',
    'joko.w@example.com',
    'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    CURRENT_DATE,
    '10:00:00',
    '10:45:00',
    'confirmed',
    'Gigi geraham belakang ngilu saat minum dingin',
    NULL,
    'G-002',
    '8deebc99-9c0b-4ef8-bb6d-6bb9bd380b44',
    NOW() + INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;
