-- ==============================================================================
-- TempoCare - Fix Permissions & Register Admin Account
-- Jalankan skrip ini di Supabase SQL Editor (1x RUN)
-- ==============================================================================

-- 1. BERIKAN HAK AKSES TABEL KE ROLE SUPABASE (anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. DAFTARKAN AKUN ADMIN ANDA (admin.booking@gmail.com) KE TABEL STAFF
INSERT INTO public.staff (
  id,
  user_id,
  full_name,
  role,
  specialization,
  email,
  phone,
  is_active
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'd440d747-c10e-41b3-9cca-10f4ff5b3dbb', -- UID Supabase Auth Anda
  'Admin Utama RS (TempoCare)',
  'admin',
  'Manajemen & Operasional RS',
  'admin.booking@gmail.com',
  '081234567890',
  true
)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  email = EXCLUDED.email,
  role = 'admin',
  full_name = EXCLUDED.full_name;

-- Juga pastikan email unik diupdate jika ada konflik email
UPDATE public.staff 
SET role = 'admin', user_id = 'd440d747-c10e-41b3-9cca-10f4ff5b3dbb'
WHERE email = 'admin.booking@gmail.com';

-- 3. PASTIKAN ROW LEVEL SECURITY (RLS) MENGIZINKAN SERVICE ROLE & PUBLIC
DROP POLICY IF EXISTS "Public read active staff" ON public.staff;
CREATE POLICY "Public read active staff" ON public.staff
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated full staff" ON public.staff;
CREATE POLICY "Authenticated full staff" ON public.staff
  FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full staff" ON public.staff;
CREATE POLICY "Service role full staff" ON public.staff
  FOR ALL TO service_role USING (true);

-- Services
DROP POLICY IF EXISTS "Public read active services" ON public.services;
CREATE POLICY "Public read active services" ON public.services
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full services" ON public.services;
CREATE POLICY "Service role full services" ON public.services
  FOR ALL TO service_role USING (true);

-- Appointments
DROP POLICY IF EXISTS "Public read own appointment" ON public.appointments;
CREATE POLICY "Public read own appointment" ON public.appointments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full appointments" ON public.appointments;
CREATE POLICY "Service role full appointments" ON public.appointments
  FOR ALL TO service_role USING (true);

-- Clinic Settings
DROP POLICY IF EXISTS "Public read clinic settings" ON public.clinic_settings;
CREATE POLICY "Public read clinic settings" ON public.clinic_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full clinic settings" ON public.clinic_settings;
CREATE POLICY "Service role full clinic settings" ON public.clinic_settings
  FOR ALL TO service_role USING (true);

