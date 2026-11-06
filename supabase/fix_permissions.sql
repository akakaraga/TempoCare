-- ==============================================================================
-- TempoCare - Fix Permissions & Register Admin Account
-- Jalankan skrip ini di Supabase SQL Editor (1x RUN)
-- ==============================================================================

-- 1. BERIKAN HAK AKSES TABEL KE ROLE SUPABASE (postgres, anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- 2. DAFTARKAN / PERBARUI AKUN ADMIN ANDA (admin.booking@gmail.com) KE TABEL STAFF
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
  'Admin Utama RS',
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

UPDATE public.staff 
SET role = 'admin', user_id = 'd440d747-c10e-41b3-9cca-10f4ff5b3dbb'
WHERE email = 'admin.booking@gmail.com';

-- 3. PASTIKAN ROW LEVEL SECURITY (RLS) MENGIZINKAN SERVICE ROLE & PUBLIC
-- Staff
DROP POLICY IF EXISTS "Public read active staff" ON public.staff;
CREATE POLICY "Public read active staff" ON public.staff FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated full staff" ON public.staff;
CREATE POLICY "Authenticated full staff" ON public.staff FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full staff" ON public.staff;
CREATE POLICY "Service role full staff" ON public.staff FOR ALL TO service_role USING (true);

-- Services
DROP POLICY IF EXISTS "Public read active services" ON public.services;
CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated full services" ON public.services;
CREATE POLICY "Authenticated full services" ON public.services FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full services" ON public.services;
CREATE POLICY "Service role full services" ON public.services FOR ALL TO service_role USING (true);

-- Appointments
DROP POLICY IF EXISTS "Public read own appointment" ON public.appointments;
CREATE POLICY "Public read own appointment" ON public.appointments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert appointment" ON public.appointments;
CREATE POLICY "Public can insert appointment" ON public.appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full appointments" ON public.appointments;
CREATE POLICY "Authenticated full appointments" ON public.appointments FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full appointments" ON public.appointments;
CREATE POLICY "Service role full appointments" ON public.appointments FOR ALL TO service_role USING (true);

-- Clinic Settings
DROP POLICY IF EXISTS "Public read clinic settings" ON public.clinic_settings;
CREATE POLICY "Public read clinic settings" ON public.clinic_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated full clinic settings" ON public.clinic_settings;
CREATE POLICY "Authenticated full clinic settings" ON public.clinic_settings FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full clinic settings" ON public.clinic_settings;
CREATE POLICY "Service role full clinic settings" ON public.clinic_settings FOR ALL TO service_role USING (true);

-- Block Outs
DROP POLICY IF EXISTS "Public read block_outs" ON public.block_outs;
CREATE POLICY "Public read block_outs" ON public.block_outs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated full block_outs" ON public.block_outs;
CREATE POLICY "Authenticated full block_outs" ON public.block_outs FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full block_outs" ON public.block_outs;
CREATE POLICY "Service role full block_outs" ON public.block_outs FOR ALL TO service_role USING (true);

-- Staff Services
DROP POLICY IF EXISTS "Public read staff_services" ON public.staff_services;
CREATE POLICY "Public read staff_services" ON public.staff_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated full staff_services" ON public.staff_services;
CREATE POLICY "Authenticated full staff_services" ON public.staff_services FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full staff_services" ON public.staff_services;
CREATE POLICY "Service role full staff_services" ON public.staff_services FOR ALL TO service_role USING (true);

-- 4. Verifikasi Status Akses
SELECT table_name, grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' AND grantee IN ('anon', 'service_role')
LIMIT 10;
