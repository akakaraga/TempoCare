# TempoCare — Medical Grade Reservation & Clinic/Hospital Schedule Management 

**TempoCare** adalah sistem manajemen jadwal (*booking*) tingkat medis untuk Klinik atau Rumah Sakit. Sistem ini mengotomatiskan pendaftaran pasien 24/7 dengan menyediakan rekam jejak jadwal bagi tenaga medis dan juga dapat berfungsi sebagai dashboard admin untuk mengelola jadwal dokter.

---

## Panduan Menjalankan Proyek

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

## Panduan Navigasi Halaman & Akun Demo

| Halaman | URL | Keterangan & Akses |
| :--- | :--- | :--- |
| **Portal Pasien (Landing)** | `/` | Pendaftaran 24/7 (Pilih Poliklinik, Dokter, Slot Waktu Dinamis, Form Pasien, No. Antrean). |
| **Kelola Jadwal Pasien** | `/manage` | Self-service reschedule & pembatalan dengan validasi H-1 Time-Bound. |
| **Portal Login Staf** | `/login` | Tombol Cepat 1-Klik: **Masuk sbg Dokter** atau **Masuk sbg Admin RS**. |
| **Dasbor Dokter** | `/dashboard/doctor` | Antrean harian dokter login, indikator status, modal rekam medis singkat & diagnosis sementara. |
| **Dasbor Resepsionis / Admin** | `/dashboard/admin` | *Helicopter View* semua dokter, pendaftaran Walk-in/IGD, blokir jam dokter (*block-outs*), master data CRUD. |

