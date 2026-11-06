-- ==============================================================================
-- TempoCare - Script Pembersihan Data Dummy / Seeder
-- ==============================================================================
-- Jalankan skrip ini pada Supabase SQL Editor untuk menghapus data demo/seeder
-- agar database bersih dan siap untuk Anda isi secara manual dari CMS Admin.
-- ==============================================================================

-- 1. Bersihkan seluruh janji temu dan antrean pasien dummy
TRUNCATE TABLE appointments CASCADE;

-- 2. Bersihkan seluruh jadwal blokir jam & cuti dokter demo
TRUNCATE TABLE block_outs CASCADE;

-- 3. Bersihkan relasi many-to-many dokter dengan poliklinik
TRUNCATE TABLE staff_services CASCADE;

-- 4. Bersihkan seluruh data poliklinik / layanan demo
TRUNCATE TABLE services CASCADE;

-- 5. Hapus dokter demo dari tabel staff
-- PENTING: Role 'admin' sengaja DIPERTAHANKAN agar Anda tetap bisa login
-- ke sistem via /login dan mengelola CMS (/dashboard/admin) untuk input data manual.
DELETE FROM staff WHERE role != 'admin';

-- 6. Bersihkan admin demo bawaan (jika ada), mempertahankan admin asli Anda:
DELETE FROM staff WHERE email = 'admin@tempocare.clinic';

-- Verifikasi hasil pembersihan:
SELECT 'appointments' AS tabel, COUNT(*) AS sisa_data FROM appointments
UNION ALL
SELECT 'block_outs' AS tabel, COUNT(*) AS sisa_data FROM block_outs
UNION ALL
SELECT 'services' AS tabel, COUNT(*) AS sisa_data FROM services
UNION ALL
SELECT 'staff_services' AS tabel, COUNT(*) AS sisa_data FROM staff_services
UNION ALL
SELECT 'staff (Dokter)', COUNT(*) FROM staff WHERE role = 'doctor'
UNION ALL
SELECT 'staff (Admin Aktif)', COUNT(*) FROM staff WHERE role = 'admin';

