'use client';

import { useState, useEffect } from 'react';
import { Appointment, TimeSlot } from '@/lib/types';
import { getAvailableSlotsAction, rescheduleAppointmentAction, cancelAppointmentAction, findAppointmentAction } from '@/actions';
import {
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  User,
  Stethoscope,
  Info,
  CalendarCheck,
  Search,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ManageAppointmentViewProps {
  initialAppointment: Appointment | null;
  initialToken?: string;
  initialNotFound?: boolean;
}

export default function ManageAppointmentView({
  initialAppointment,
  initialToken = '',
  initialNotFound = false,
}: ManageAppointmentViewProps) {
  const [tokenInput, setTokenInput] = useState<string>(initialToken);
  const [appointment, setAppointment] = useState<Appointment | null>(initialAppointment);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(
    initialNotFound
      ? `Jadwal pasien tidak ditemukan untuk "${initialToken}". Mohon periksa kembali input serta data yang Anda masukkan.`
      : null
  );

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [newDate, setNewDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Check if current time is within H-1 (less than 24h)
  const isTimeLocked = () => {
    if (!appointment || !appointment.appointment_date || !appointment.start_time) return false;
    const aptTime = new Date(`${appointment.appointment_date}T${appointment.start_time}:00`);
    const now = new Date();
    const diffHours = (aptTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  const hoursRemaining = () => {
    if (!appointment || !appointment.appointment_date || !appointment.start_time) return 0;
    const aptTime = new Date(`${appointment.appointment_date}T${appointment.start_time}:00`);
    const now = new Date();
    return Math.max(0, Math.round((aptTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
  };

  useEffect(() => {
    if (isRescheduling && appointment && !newDate) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      setNewDate(d.toISOString().split('T')[0]);
    }
  }, [isRescheduling, appointment, newDate]);

  useEffect(() => {
    if (isRescheduling && appointment && newDate) {
      fetchNewSlots(appointment.staff_id, newDate, appointment.service_id);
    }
  }, [isRescheduling, appointment, newDate]);

  const fetchNewSlots = async (docId: string, date: string, srvId: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await getAvailableSlotsAction(docId, date, srvId);
      if (res.success && res.slots) {
        setAvailableSlots(res.slots);
      } else {
        toast.error('Gagal memuat jadwal baru dokter');
      }
    } catch {
      toast.error('Gagal mengambil ketersediaan dokter');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!appointment || !selectedSlot || !newDate) {
      toast.error('Silakan pilih jam kunjungan baru.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await rescheduleAppointmentAction(
        appointment.reschedule_token,
        newDate,
        selectedSlot.startTime,
        selectedSlot.endTime
      );

      if (res.success && res.appointment) {
        setAppointment(res.appointment);
        setIsRescheduling(false);
        toast.success('Jadwal kunjungan Anda berhasil dipindahkan!');
      } else {
        toast.error(res.error || 'Gagal memindahkan jadwal.');
      }
    } catch {
      toast.error('Terjadi gangguan jaringan.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!appointment) return;
    if (!confirm('Apakah Anda yakin ingin membatalkan jadwal konsultasi ini?')) return;

    setSubmittingAction(true);
    try {
      const res = await cancelAppointmentAction(appointment.reschedule_token);
      if (res.success) {
        setAppointment({ ...appointment, status: 'cancelled' });
        toast.success('Jadwal konsultasi Anda telah dibatalkan.');
      } else {
        toast.error(res.error || 'Gagal membatalkan jadwal.');
      }
    } catch {
      toast.error('Terjadi gangguan.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = tokenInput.trim();
    if (!query) {
      toast.error('Silakan masukkan nomor antrean, nomor WhatsApp, atau kode jadwal Anda.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const res = await findAppointmentAction(query);
      if (res.success && res.appointment) {
        setAppointment(res.appointment);
        toast.success(`Jadwal pasien ${res.appointment.patient_name} ditemukan!`);
      } else {
        setSearchError(res.error || 'Jadwal pasien tidak ditemukan. Periksa kembali nomor antrean atau nomor WhatsApp Anda.');
        toast.error(res.error || 'Jadwal tidak ditemukan');
      }
    } catch {
      setSearchError('Terjadi gangguan jaringan saat mencari jadwal.');
      toast.error('Gagal mencari jadwal pasien');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-medical-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Halaman Utama
        </Link>

        {appointment && (
          <button
            type="button"
            onClick={() => {
              setAppointment(null);
              setTokenInput('');
              setSearchError(null);
            }}
            className="text-xs font-semibold text-medical-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" /> Cari Jadwal Lain
          </button>
        )}
      </div>

      {!appointment ? (
        /* Token Search Form */
        <div className="bg-white rounded-3xl border border-medical-border p-8 text-center shadow-soft space-y-4">
          <div className="w-14 h-14 bg-medical-subtle text-medical-primary rounded-2xl flex items-center justify-center mx-auto">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-medical-text">
            Cek Jadwal & Nomor Antrean Anda
          </h2>
          <p className="text-xs sm:text-sm text-medical-muted max-w-md mx-auto leading-relaxed">
            Masukkan <strong>Nomor Antrean</strong> (contoh: <code>U-002</code>), <strong>Nomor WhatsApp</strong> yang digunakan saat mendaftar, atau kode pendaftaran.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto pt-2"
          >
            <input
              type="text"
              required
              placeholder="Contoh: U-002 atau 08123456789"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full text-xs px-4 py-3 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none text-medical-text"
            />
            <button
              type="submit"
              disabled={searching}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-medical-primary text-white hover:bg-medical-primaryDark transition-colors shrink-0 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {searching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mencari...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" /> Lihat Jadwal
                </>
              )}
            </button>
          </form>

          {searchError && (
            <div className="p-5 bg-rose-50/90 border-2 border-rose-200 rounded-3xl text-xs text-rose-950 max-w-lg mx-auto text-left space-y-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5 pb-2 border-b border-rose-200">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-rose-900">
                    Pencarian Ditolak: Data Tidak Ditemukan
                  </h4>
                  <span className="text-[11px] text-rose-700">
                    Sistem tidak menemukan jadwal yang cocok di database faskes
                  </span>
                </div>
              </div>

              <p className="text-xs text-rose-800 leading-relaxed font-medium">
                {searchError}
              </p>

              <div className="bg-white/80 p-3.5 rounded-2xl border border-rose-200 space-y-2 text-[11px]">
                <strong className="text-rose-900 block font-bold">
                  Silakan periksa dan verifikasi kembali input serta data Anda:
                </strong>
                <ul className="space-y-1.5 text-rose-800 list-disc list-inside">
                  <li>
                    <strong>Format Nomor Antrean:</strong> Pastikan format sesuai nomor antrean pendaftaran Anda (contoh: <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-bold text-rose-900">U-002</code>, <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-bold text-rose-900">G-001</code>).
                  </li>
                  <li>
                    <strong>Nomor WhatsApp:</strong> Pastikan nomor yang dimasukkan sama persis dengan nomor aktif yang digunakan saat mendaftar berobat.
                  </li>
                  <li>
                    <strong>Belum Pernah Mendaftar?</strong> Jika belum pernah reservasi, data Anda belum tersimpan di database faskes. Silakan lakukan pendaftaran baru terlebih dahulu.
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTokenInput('');
                    setSearchError(null);
                  }}
                  className="w-full sm:w-auto text-xs font-semibold text-rose-700 hover:underline cursor-pointer py-1"
                >
                  ← Bersihkan & Coba Input Ulang
                </button>

                <Link
                  href="/#booking"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-medical-primary text-white hover:bg-medical-primaryDark transition-all text-center shadow-xs"
                >
                  Daftar Janji Temu Baru →
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Appointment Card */
        <div className="bg-white rounded-3xl border border-medical-border shadow-soft overflow-hidden">
          {/* Header */}
          <div className="bg-medical-subtle/70 p-6 border-b border-medical-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-medical-muted">
                  Nomor Antrean Anda
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    appointment.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : appointment.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {appointment.status === 'confirmed'
                    ? 'Jadwal Aktif'
                    : appointment.status === 'completed'
                    ? 'Sudah Selesai'
                    : 'Dibatalkan'}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-medical-primary mt-1 font-mono">
                {appointment.queue_number || 'A-001'}
              </h2>
            </div>

            <div className="text-left sm:text-right text-xs text-medical-muted">
              <span className="block font-medium">Status Kehadiran:</span>
              <strong className="text-medical-text text-sm">
                {appointment.status === 'confirmed'
                  ? 'Menunggu Kedatangan'
                  : appointment.status === 'completed'
                  ? 'Pemeriksaan Selesai'
                  : 'Telah Dibatalkan'}
              </strong>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl space-y-1 border border-gray-100">
                <span className="text-medical-muted block flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5 text-medical-primary" /> Nama Pasien
                </span>
                <span className="font-bold text-medical-text text-sm block">
                  {appointment.patient_name}
                </span>
                <span className="text-gray-500">WhatsApp: {appointment.patient_whatsapp}</span>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl space-y-1 border border-gray-100">
                <span className="text-medical-muted block flex items-center gap-1.5 font-medium">
                  <Stethoscope className="w-3.5 h-3.5 text-medical-primary" /> Dokter & Poliklinik
                </span>
                <span className="font-bold text-medical-text text-sm block">
                  {appointment.staff?.full_name}
                </span>
                <span className="text-medical-primary font-bold">{appointment.service?.name}</span>
              </div>

              <div className="p-4 bg-medical-subtle/50 rounded-2xl space-y-1 border border-medical-primary/20">
                <span className="text-medical-muted block flex items-center gap-1.5 font-medium">
                  <CalendarIcon className="w-3.5 h-3.5 text-medical-primary" /> Hari & Tanggal Datang
                </span>
                <span className="font-bold text-medical-text text-sm block">
                  {appointment.appointment_date}
                </span>
              </div>

              <div className="p-4 bg-medical-subtle/50 rounded-2xl space-y-1 border border-medical-primary/20">
                <span className="text-medical-muted block flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-medical-primary" /> Jam Konsultasi
                </span>
                <span className="font-bold text-medical-text text-sm block">
                  {appointment.start_time} - {appointment.end_time} WIB
                </span>
              </div>
            </div>

            {/* Medical notes if completed */}
            {appointment.medical_notes && (
              <div className="p-5 bg-teal-50 border border-teal-200 rounded-2xl text-xs space-y-1.5">
                <span className="font-bold text-teal-900 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" /> Catatan Pemeriksaan Dokter:
                </span>
                <p className="text-teal-900 leading-relaxed font-medium">{appointment.medical_notes}</p>
              </div>
            )}

            {/* Reschedule section */}
            {appointment.status === 'confirmed' && (
              <>
                {isRescheduling ? (
                  /* Reschedule Form */
                  <div className="border-t border-medical-border pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-medical-text flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-medical-accent" /> Pilih Hari & Jam Pengganti
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsRescheduling(false)}
                        className="text-xs text-medical-muted hover:underline font-semibold"
                      >
                        Batal
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-medical-muted block mb-1">
                        Pilih Tanggal Baru
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="bg-white border border-medical-border text-medical-text text-xs font-bold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-medical-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-medical-muted block mb-2">
                        Pilih Jam Baru yang Masih Kosong:
                      </label>
                      {loadingSlots ? (
                        <div className="py-6 text-center text-xs text-medical-muted">
                          Memeriksa jadwal dokter...
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {availableSlots.map((slot, idx) => {
                            const isSelected = selectedSlot?.startTime === slot.startTime;
                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={!slot.isAvailable}
                                onClick={() => setSelectedSlot(slot)}
                                className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                                  isSelected
                                    ? 'bg-medical-primary text-white border-medical-primary shadow-sm'
                                    : slot.isAvailable
                                    ? 'bg-white text-medical-text border-medical-border hover:border-medical-primary'
                                    : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed'
                                }`}
                              >
                                {slot.startTime}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsRescheduling(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold border border-medical-border text-medical-muted"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={!selectedSlot || submittingAction}
                        onClick={handleRescheduleSubmit}
                        className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all ${
                          selectedSlot
                            ? 'bg-medical-accent hover:bg-medical-accentHover shadow-sm'
                            : 'bg-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {submittingAction ? 'Menyimpan...' : 'Simpan Tanggal Baru'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Mode */
                  <div className="border-t border-medical-border pt-6 space-y-4">
                    {/* Time lock indicator */}
                    {isTimeLocked() ? (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Batas Waktu Pindah Hari Telah Berakhir (Kurang dari 24 Jam):</strong>
                          <p className="mt-0.5 text-rose-800 leading-relaxed">
                            Untuk menjaga ketertiban ruang praktik dan dokter, pemindahan hari kunjungan secara mandiri hanya dapat dilakukan paling lambat <strong>H-1 (24 jam sebelum jadwal)</strong>. Untuk bantuan darurat, silakan langsung hubungi petugas kami.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Anda Bisa Memindahkan Hari Kunjungan:</strong>
                          <p className="mt-0.5 text-emerald-800 leading-relaxed">
                            Masih ada waktu sekitar <strong>{hoursRemaining()} jam</strong> sebelum batas akhir perubahan jadwal mandiri.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={submittingAction}
                        onClick={handleCancelSubmit}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
                      >
                        Batalkan Janji Temu
                      </button>

                      <button
                        type="button"
                        disabled={isTimeLocked() || submittingAction}
                        onClick={() => setIsRescheduling(true)}
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isTimeLocked()
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                            : 'bg-medical-accent text-white hover:bg-medical-accentHover shadow-sm'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Pindah Hari / Jam Kunjungan
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
