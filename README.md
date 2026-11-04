# 🩺 TempoCare — Medical-Grade Reservation & Clinic/Hospital Schedule Management MVP

**TempoCare** adalah *Minimum Viable Product* (MVP) sistem manajemen jadwal (*booking*) tingkat medis untuk Klinik atau Rumah Sakit. Sistem ini mengotomatiskan pendaftaran pasien 24/7, mencegah *double-booking* secara mutlak di tingkat database, mengurangi angka *no-show*, dan menyediakan rekam jejak jadwal bagi tenaga medis.

---

## 🎨 Identitas Visual (Medical Serene Theme)

* **Primary:** Sage Green / Soft Teal (`#5E8B7E`) — Memberikan efek psikologis penenang dan higienis (warna seragam operasi medis).
* **Background:** Warm Pearl / Off-White (`#FBFBF9`) — Bersih seperti rumah sakit, lembut dan tidak menyilaukan mata pasien & staf.
* **Accent:** Muted Peach / Soft Terracotta (`#E29578`) — Kontras ramah untuk tombol aksi pendaftaran janji temu.
* **Text:** Charcoal Gray (`#2D3748`) — Keterbacaan optimal untuk rekam medis & jadwal harian.

---

## 🛡️ Arsitektur Keamanan Medis (Medical-Grade Security)

1. **Anti Double-Booking (Database & Application Level):**
   * *Unique Constraint* PostgreSQL: `CONSTRAINT unique_doctor_schedule UNIQUE (staff_id, appointment_date, start_time)`.
   * Tidak mungkin ada dua pasien yang menjadwalkan konsultasi dengan dokter yang sama di menit yang sama, bahkan saat terjadi *race condition* pendaftaran online simultan.
2. **Keamanan Reschedule (UUID Token Time-Bound H-1):**
   * Pasien menerima tautan unik via email konfirmasi (Resend API) berformat `/manage?token=<uuid>`.
   * **Time-Bound:** Otomatis terkunci pada **H-1 (24 jam)** sebelum waktu jadwal periksa untuk mencegah pembatalan/pemindahan mendadak (*empty slots*).
   * **One-Time Use:** Token otomatis dirotasi (*burned*) setelah berhasil dipakai untuk pindah jadwal.
3. **Isolasi Data (Supabase RLS & RBAC):**
   * Pasien publik hanya dapat melakukan `INSERT` jadwal dan membaca jadwal sendiri via token.
   * Dokter hanya melihat antrean pasien hariannya sendiri (`/dashboard/doctor`).
   * Resepsionis / Admin RS memiliki akses *Helicopter View* (`/dashboard/admin`) untuk mengelola seluruh jadwal dokter, pendaftaran walk-in, dan blokir jadwal dokter (*block-outs*).

---

## 🗄️ Database Schema & Seed Data

Skema lengkap tersedia pada berkas:
* `supabase/schema.sql` (Tabel `staff`, `services`, `staff_services`, `appointments`, `block_outs` + Constraints & RLS).
* `supabase/seed.sql` (Data awal: Dr. Sarah, Dr. Budi Sp.A, Drg. Citra, Dr. Hendra Sp.PD, poli anak, dental, dll).

---

## 🚀 Panduan Menjalankan Proyek

### 1. Salin Pengaturan Lingkungan
```bash
cp .env.example .env.local
```
*(Opsional: Isi `NEXT_PUBLIC_SUPABASE_URL` dan `RESEND_API_KEY`. Jika belum diisi, TempoCare secara otomatis menggunakan in-memory persistence repository dengan data awal siap pakai).*

### 2. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🧭 Panduan Navigasi Halaman & Akun Demo

| Halaman | URL | Keterangan & Akses |
| :--- | :--- | :--- |
| **Portal Pasien (Landing)** | `/` | Pendaftaran 24/7 (Pilih Poliklinik, Dokter, Slot Waktu Dinamis via `date-fns`, Form Pasien, No. Antrean). |
| **Kelola Jadwal Pasien** | `/manage` | Self-service reschedule & pembatalan dengan validasi H-1 Time-Bound. |
| **Portal Login Staf** | `/login` | Tombol Cepat 1-Klik: **Masuk sbg Dokter** atau **Masuk sbg Admin RS**. |
| **Dasbor Dokter** | `/dashboard/doctor` | Antrean harian dokter login, indikator status, modal rekam medis singkat & diagnosis sementara. |
| **Dasbor Resepsionis / Admin** | `/dashboard/admin` | *Helicopter View* semua dokter, pendaftaran Walk-in/IGD, blokir jam dokter (*block-outs*), master data CRUD. |

