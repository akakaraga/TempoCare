import Navbar from '@/components/shared/Navbar';
import BookingWizard from '@/components/shared/BookingWizard';
import { db } from '@/lib/db';
import { HeartPulse, CheckCircle2, Clock, Calendar, Sparkles, Phone, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Dynamic server rendering

export default async function HomePage() {
  const [services, staffList, clinicSettings] = await Promise.all([
    db.getServices(),
    db.getStaffList(),
    db.getClinicSettings(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-medical-bg overflow-x-hidden">
      <Navbar clinicSettings={clinicSettings} />

      {/* Hero Section: Warm, Reassuring, and Patient-Centric */}
      <section className="relative overflow-hidden pt-7 pb-8 sm:pt-10 sm:pb-12 border-b border-medical-border/60 bg-gradient-to-b from-medical-subtle/70 via-medical-bg to-medical-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3.5 sm:space-y-4">
            {/* Friendly Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-white border border-medical-border shadow-xs text-medical-primary">
              <span>Layanan Pendaftaran Pasien Online 24 Jam</span>
            </div>

            {/* Clear, Human Headline */}
            <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-medical-text leading-snug sm:leading-tight">
              Daftar Berobat Jadi Lebih Mudah, <br className="hidden sm:inline" />
              <span className="text-medical-primary">Tanpa Perlu Antre Sejak Pagi.</span>
            </h1>

            {/* Reassuring Subtitle */}
            <p className="text-xs sm:text-base text-medical-muted leading-relaxed max-w-2xl mx-auto">
              Pilih dokter spesialis dan jam periksa yang cocok dari rumah. Dapatkan nomor antrean seketika dan jadwal Anda dijamin pasti dan tidak akan bersamaan dengan pasien lain.
            </p>

            {/* 3 Simple Value Pillars for Patients */}
            <div className="pt-1 sm:pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-medical-border text-medical-text font-semibold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Nomor Antrean Langsung Jadi
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-medical-border text-medical-text font-semibold shadow-2xs">
                <Clock className="w-4 h-4 text-medical-primary" />
                Jam Periksa Dijamin Pasti
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-medical-border text-medical-text font-semibold shadow-2xs">
                <Calendar className="w-4 h-4 text-amber-600" />
                Bisa Ganti Hari (Maksimal H-1)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Booking Wizard Section */}
      <main className="flex-1">
        <BookingWizard services={services} staffList={staffList} />

        {/* 3 Easy Steps Guide for Laypeople */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-medical-border/60">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-medical-primary block mb-1">
              Panduan Praktis
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-medical-text">
              Cara Mudah Berobat di {clinicSettings.name}
            </h2>
            <p className="text-xs sm:text-sm text-medical-muted mt-2">
              Tiga langkah sederhana dari rumah hingga masuk ke ruang dokter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 Card */}
            <div className="p-6 rounded-2xl bg-white border border-medical-border shadow-soft space-y-3">
              <div className="w-10 h-10 rounded-xl bg-medical-subtle text-medical-primary flex items-center justify-center font-bold text-base">
                1
              </div>
              <h3 className="text-base font-bold text-medical-text">Pilih Poliklinik & Dokter</h3>
              <p className="text-xs text-medical-muted leading-relaxed">
                Tentukan keluhan Anda, pilih layanan (misal: Poli Anak, Dokter Gigi, atau Penyakit Dalam), lalu pilih dokter spesialis yang Anda percaya.
              </p>
            </div>

            {/* Step 2 Card */}
            <div className="p-6 rounded-2xl bg-white border border-medical-border shadow-soft space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-medical-accent flex items-center justify-center font-bold text-base">
                2
              </div>
              <h3 className="text-base font-bold text-medical-text">Tentukan Hari & Jam Datang</h3>
              <p className="text-xs text-medical-muted leading-relaxed">
                Lihat jam yang masih kosong. Jam yang sudah dipesan pasien lain otomatis tertutup sehingga Anda tidak perlu khawatir jadwal bertumpuk.
              </p>
            </div>

            {/* Step 3 Card */}
            <div className="p-6 rounded-2xl bg-white border border-medical-border shadow-soft space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base">
                3
              </div>
              <h3 className="text-base font-bold text-medical-text">Dapatkan Bukti & Datang Tepat Waktu</h3>
              <p className="text-xs text-medical-muted leading-relaxed">
                Nomor antrean langsung terbit. Simpan buktinya di HP dan cukup hadir 15 menit sebelum waktu konsultasi untuk verifikasi singkat.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer: Helpful & Empathetic */}
      <footer className="border-t border-medical-border bg-white py-10 text-xs text-medical-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-medical-border/60">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HeartPulse className="w-5 h-5 text-medical-primary" />
                <span className="text-base font-bold text-medical-text">{clinicSettings.name}</span>
              </div>
              <p className="text-xs text-medical-muted">{clinicSettings.address}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
              <div className="flex items-center gap-2 p-3 bg-medical-subtle rounded-xl text-medical-text">
                <Phone className="w-4 h-4 text-medical-primary" />
                <span>Hotline Info: <strong>{clinicSettings.phone}</strong></span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <span>Darurat / IGD: <strong>{clinicSettings.emergency_phone}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span>&copy; {new Date().getFullYear()} {clinicSettings.name}. Seluruh Hak Cipta Dilindungi.</span>

            <div className="flex items-center gap-4">
              <Link href="/manage" className="hover:text-medical-primary underline">
                Cek / Ganti Jadwal Saya
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
