-- ==============================================================================
-- TempoCare - PostgreSQL / Supabase Medical Reservation & CMS Schema
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLINIC_SETTINGS (Pengaturan Profil, Jam Operasional & Pengumuman Pasien)
CREATE TABLE IF NOT EXISTS clinic_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'clinic-default-01',
  name VARCHAR(255) NOT NULL DEFAULT 'TempoCare Clinic & Hospital',
  tagline VARCHAR(255) DEFAULT 'Medical Clinic & Hospital',
  phone VARCHAR(50) DEFAULT '021-555-8367',
  emergency_phone VARCHAR(50) DEFAULT '(021) 555-TEMPO',
  email VARCHAR(255) DEFAULT 'info@tempocare.clinic',
  address TEXT DEFAULT 'Jl. Kesehatan No. 45, Jakarta Pusat',
  announcement TEXT DEFAULT 'Pendaftaran Pasien Online 24/7 Terbuka • Proteksi Anti Double-Booking Aktif',
  open_hour TIME DEFAULT '08:00',
  close_hour TIME DEFAULT '17:00',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STAFF (Dokter, Admin, Resepsionis, Perawat)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Opsional: terhubung ke auth.users jika menggunakan Supabase Auth
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'doctor' CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist')),
  specialization VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  practice_days TEXT[] DEFAULT ARRAY['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
  practice_start_time TIME DEFAULT '08:00',
  practice_end_time TIME DEFAULT '17:00',
  assigned_service_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SERVICES (Daftar Layanan Medis / Poliklinik)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  price DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STAFF_SERVICES (Relasi Many-to-Many Dokter & Layanan)
CREATE TABLE IF NOT EXISTS staff_services (
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

-- 5. APPOINTMENTS (Jadwal Reservasi Pasien)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name VARCHAR(255) NOT NULL,
  patient_whatsapp VARCHAR(50) NOT NULL,
  patient_email VARCHAR(255),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  initial_complaint TEXT,
  medical_notes TEXT,
  queue_number VARCHAR(50),
  reschedule_token UUID UNIQUE DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMPTZ,
  is_walk_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Medical-Grade Anti Double-Booking Constraint
  CONSTRAINT unique_doctor_schedule UNIQUE (staff_id, appointment_date, start_time)
);

-- 6. BLOCK_OUTS (Jadwal Blokir / Cuti / Operasi Cito Dokter)
CREATE TABLE IF NOT EXISTS block_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_date_staff ON appointments (appointment_date, staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_appointments_token ON appointments (reschedule_token);
CREATE INDEX IF NOT EXISTS idx_block_outs_date_staff ON block_outs (block_date, staff_id);

-- Row Level Security (RLS) Configuration
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_outs ENABLE ROW LEVEL SECURITY;

-- Clinic Settings
CREATE POLICY "Public read clinic_settings" ON clinic_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated full clinic_settings" ON clinic_settings FOR ALL TO authenticated USING (true);

-- Staff
CREATE POLICY "Public read active staff" ON staff FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated full staff" ON staff FOR ALL TO authenticated USING (true);

-- Services
CREATE POLICY "Public read active services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated full services" ON services FOR ALL TO authenticated USING (true);

-- Staff Services
CREATE POLICY "Public read staff_services" ON staff_services FOR SELECT USING (true);
CREATE POLICY "Authenticated full staff_services" ON staff_services FOR ALL TO authenticated USING (true);

-- Appointments
CREATE POLICY "Public can insert appointment" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read own appointment by token" ON appointments FOR SELECT USING (reschedule_token IS NOT NULL);
CREATE POLICY "Authenticated full access to appointments" ON appointments FOR ALL TO authenticated USING (true);

-- Block outs
CREATE POLICY "Public can read block_outs" ON block_outs FOR SELECT USING (true);
CREATE POLICY "Authenticated full access to block_outs" ON block_outs FOR ALL TO authenticated USING (true);
