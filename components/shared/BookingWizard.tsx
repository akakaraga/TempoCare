'use client';

import { useState, useEffect } from 'react';
import { Service, Staff, TimeSlot, Appointment } from '@/lib/types';
import { getAvailableSlotsAction, bookAppointmentAction } from '@/actions';
import { formatRupiah } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  FileText,
  Copy,
  ExternalLink,
  Info,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface BookingWizardProps {
  services: Service[];
  staffList: Staff[];
}

const dayNamesIndonesian = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export default function BookingWizard({ services, staffList }: BookingWizardProps) {
  const activeServices = services.filter((s) => s.is_active);

  // Stepper: 1: Layanan, 2: Dokter, 3: Tanggal & Jam, 4: Data Pasien
  const [step, setStep] = useState<number>(1);

  // Form selections
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  
  // Date default tomorrow
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTomorrowString());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Patient inputs
  const [patientName, setPatientName] = useState<string>('');
  const [patientWhatsapp, setPatientWhatsapp] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [initialComplaint, setInitialComplaint] = useState<string>('');

  // Slots loading state
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Booking Result Modal
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  // Selected service and doctor objects
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedDoctor = staffList.find((s) => s.id === selectedDoctorId);

  // Filter doctors assigned to the chosen service
  const availableDoctors = staffList.filter((s) => {
    if (s.role !== 'doctor' || !s.is_active) return false;
    if (selectedServiceId && s.assigned_service_ids && s.assigned_service_ids.length > 0) {
      return s.assigned_service_ids.includes(selectedServiceId);
    }
    return true;
  });

  // Calculate day name
  const selectedDayName = (() => {
    try {
      const d = new Date(selectedDate + 'T00:00:00');
      return dayNamesIndonesian[d.getDay()];
    } catch {
      return '';
    }
  })();

  const isDoctorOffToday = (() => {
    if (!selectedDoctor || !selectedDoctor.practice_days || selectedDoctor.practice_days.length === 0) {
      return false;
    }
    return !selectedDoctor.practice_days.includes(selectedDayName);
  })();

  // Load slots whenever doctor or date changes
  useEffect(() => {
    if (selectedDoctorId && selectedDate && selectedServiceId) {
      fetchSlots(selectedDoctorId, selectedDate, selectedServiceId);
    }
  }, [selectedDoctorId, selectedDate, selectedServiceId]);

  const fetchSlots = async (docId: string, date: string, srvId: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await getAvailableSlotsAction(docId, date, srvId);
      if (res.success && res.slots) {
        setSlots(res.slots);
      } else {
        toast.error(res.error || 'Gagal memuat slot jadwal');
        setSlots([]);
      }
    } catch {
      toast.error('Gagal mengambil jadwal dokter');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectService = (service: Service) => {
    setSelectedServiceId(service.id);

    // Auto-select doctor matching this service if exists
    const matchingDocs = staffList.filter(
      (s) =>
        s.role === 'doctor' &&
        s.is_active &&
        (!s.assigned_service_ids || s.assigned_service_ids.length === 0 || s.assigned_service_ids.includes(service.id))
    );

    if (matchingDocs.length > 0) {
      setSelectedDoctorId(matchingDocs[0].id);
    } else {
      setSelectedDoctorId('');
    }
    setStep(2);
  };

  const handleSelectDoctor = (doctor: Staff) => {
    setSelectedDoctorId(doctor.id);
    setStep(3);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error('Silakan pilih jam kunjungan yang tersedia.');
      return;
    }
    if (!patientName.trim() || !patientWhatsapp.trim()) {
      toast.error('Mohon isi nama pasien dan nomor WhatsApp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bookAppointmentAction({
        patient_name: patientName,
        patient_whatsapp: patientWhatsapp,
        patient_email: patientEmail,
        service_id: selectedServiceId,
        staff_id: selectedDoctorId,
        appointment_date: selectedDate,
        start_time: selectedSlot.startTime,
        end_time: selectedSlot.endTime,
        initial_complaint: initialComplaint,
      });

      if (res.success && res.appointment) {
        setConfirmedBooking(res.appointment);
        toast.success(`Pendaftaran Berhasil! Nomor Antrean: ${res.appointment.queue_number}`);
      } else {
        toast.error(res.error || 'Jam tersebut baru saja dipilih pasien lain. Silakan pilih jam lain.');
        fetchSlots(selectedDoctorId, selectedDate, selectedServiceId);
      }
    } catch {
      toast.error('Terjadi gangguan jaringan saat memproses pendaftaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setConfirmedBooking(null);
    setStep(1);
    setSelectedSlot(null);
    setPatientName('');
    setPatientWhatsapp('');
    setPatientEmail('');
    setInitialComplaint('');
  };

  return (
    <div id="booking" className="w-full max-w-5xl mx-auto py-6 px-4 sm:px-6">
      {/* Wizard Card Container */}
      <div className="bg-white rounded-3xl border border-medical-border shadow-soft overflow-hidden">
        {/* Wizard Header & Stepper */}
        <div className="bg-medical-subtle/70 border-b border-medical-border px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-medical-border/80 text-medical-primary mb-1.5">
               Formulir Pendaftaran Pasien
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-medical-text">
                Pendaftaran Janji Temu Dokter
              </h2>
              <p className="text-xs sm:text-sm text-medical-muted mt-0.5">
                Ikuti 4 langkah untuk memilih dokter dan mendapatkan nomor antrean.
              </p>
            </div>

            {/* Stepper Tabs - Clean & Legible */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold overflow-x-auto pb-1">
              {[
                { num: 1, label: 'Pilih Poli' },
                { num: 2, label: 'Pilih Dokter' },
                { num: 3, label: 'Pilih Jam' },
                { num: 4, label: 'Data Pasien' },
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                    step === s.num
                      ? 'bg-medical-primary text-white shadow-xs font-bold'
                      : s.num < step
                      ? 'bg-white text-medical-primary border border-medical-primary/30 cursor-pointer hover:bg-medical-subtle'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold bg-white/20">
                    {s.num < step ? '✓' : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 sm:p-8">
          {/* STEP 1: PILIH POLIKLINIK / LAYANAN */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-medical-text">Langkah 1: Mau Berobat atau Periksa Apa?</h3>
                <p className="text-xs sm:text-sm text-medical-muted mt-0.5">
                  Silakan pilih poliklinik atau jenis konsultasi medis yang Anda butuhkan.
                </p>
              </div>

              {activeServices.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-medical-muted">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Belum ada poliklinik yang dibuka.</p>
                  <p className="text-xs mt-1">Layanan pendaftaran sedang disiapkan oleh pihak faskes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeServices.map((service) => {
                    const isSelected = selectedServiceId === service.id;
                    return (
                      <div
                        key={service.id}
                        onClick={() => handleSelectService(service)}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between ${
                          isSelected
                            ? 'border-medical-primary bg-medical-subtle/50 shadow-sm'
                            : 'border-medical-border bg-white hover:border-medical-primary/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="w-11 h-11 rounded-xl bg-medical-primary/10 text-medical-primary flex items-center justify-center font-bold">
                              <Stethoscope className="w-6 h-6" />
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-medical-primary bg-white px-3 py-1.5 rounded-xl border border-medical-border shadow-2xs">
                              {formatRupiah(service.price)}
                            </span>
                          </div>

                          <h4 className="font-bold text-medical-text text-base mt-4">{service.name}</h4>
                          <p className="text-xs text-medical-muted mt-1 leading-relaxed line-clamp-2">
                            {service.description || 'Pemeriksaan klinis dan konsultasi bersama dokter ahli.'}
                          </p>
                        </div>

                        <div className="mt-5 pt-3.5 border-t border-medical-border/60 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-medical-muted font-medium">
                            <Clock className="w-3.5 h-3.5 text-medical-primary" /> Sekitar {service.duration_minutes} menit
                          </span>
                          <span className="text-medical-accent font-bold flex items-center gap-1">
                            Pilih Poli Ini <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PILIH DOKTER */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-medical-text">Langkah 2: Pilih Dokter yang Anda Inginkan</h3>
                  <p className="text-xs sm:text-sm text-medical-muted mt-0.5">
                    Layanan terpilih: <strong className="text-medical-primary">{selectedService?.name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-medical-primary hover:underline"
                >
                  ← Ganti Poli
                </button>
              </div>

              {availableDoctors.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-medical-muted space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="font-semibold text-sm">Belum ada dokter yang bertugas di poliklinik ini.</p>
                  <p className="text-xs">Silakan pilih poliklinik lain atau hubungi bagian informasi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {availableDoctors.map((doc) => {
                    const isSelected = selectedDoctorId === doc.id;
                    const practiceDaysStr = doc.practice_days?.join(', ') || 'Senin s/d Jumat';

                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleSelectDoctor(doc)}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between ${
                          isSelected
                            ? 'border-medical-primary bg-medical-subtle/50 shadow-sm'
                            : 'border-medical-border bg-white hover:border-medical-primary/40'
                        }`}
                      >
                        <div>
                          <div className="w-12 h-12 rounded-full bg-medical-primary text-white flex items-center justify-center font-bold text-lg mb-3 shadow-inner">
                            {doc.full_name.replace('Dr. ', '').replace('Drg. ', '').charAt(0)}
                          </div>
                          <h4 className="font-bold text-medical-text text-sm sm:text-base leading-snug">
                            {doc.full_name}
                          </h4>
                          <span className="inline-block text-[11px] font-semibold text-medical-primary bg-medical-subtle px-2.5 py-0.5 rounded-md mt-1">
                            {doc.specialization || 'Dokter Spesialis'}
                          </span>

                          <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-medical-muted space-y-1.5 border border-gray-100">
                            <div>
                              <span className="text-gray-500 block text-[11px]">Hari Praktik:</span>
                              <strong className="text-medical-text">{practiceDaysStr}</strong>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[11px]">Jam Praktik:</span>
                              <strong className="text-medical-text">
                                {doc.practice_start_time || '08:00'} - {doc.practice_end_time || '17:00'} WIB
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-3.5 border-t border-medical-border/60 flex items-center justify-between text-xs">
                          <span className="text-emerald-700 font-semibold text-[11px]">● Siap Melayani</span>
                          <span className="text-medical-accent font-bold flex items-center gap-1">
                            Pilih Dokter <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PILIH TANGGAL & JAM DATANG */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-medical-text">Langkah 3: Tentukan Hari & Jam Konsultasi</h3>
                  <p className="text-xs sm:text-sm text-medical-muted mt-0.5">
                    Dokter: <strong className="text-medical-text">{selectedDoctor?.full_name}</strong> • Poli: <strong className="text-medical-primary">{selectedService?.name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold text-medical-primary hover:underline"
                >
                  ← Ganti Dokter
                </button>
              </div>

              {/* Date Input Card */}
              <div className="bg-medical-subtle/50 p-5 rounded-2xl border border-medical-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-medical-primary text-white flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-medical-muted block">
                      Pilih Tanggal Kunjungan (Hari: {selectedDayName})
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-white border border-medical-border text-medical-text text-sm font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-medical-primary mt-1 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="text-xs text-medical-muted text-left sm:text-right">
                  <span className="block font-medium">Jadwal Praktik Dokter:</span>
                  <strong className="text-medical-text block text-sm">
                    {selectedDoctor?.practice_days?.join(', ') || 'Senin s/d Jumat'}
                  </strong>
                  <span className="text-[11px] text-medical-primary font-semibold">
                    Pukul {selectedDoctor?.practice_start_time || '08:00'} - {selectedDoctor?.practice_end_time || '17:00'} WIB
                  </span>
                </div>
              </div>

              {/* Day off polite warning */}
              {isDoctorOffToday && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Dokter Tidak Berpraktik pada Hari {selectedDayName}:</strong>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      {selectedDoctor?.full_name} berpraktik pada hari: <strong>{selectedDoctor?.practice_days?.join(', ')}</strong>. Silakan ubah tanggal di atas ke hari praktik dokter yang cocok untuk Anda.
                    </p>
                  </div>
                </div>
              )}

              {/* Time Slots Grid */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <label className="text-sm font-bold text-medical-text">
                    Pilih Jam Konsultasi yang Masih Kosong:
                  </label>

                  {/* Friendly Legend */}
                  <div className="flex items-center gap-3 text-xs text-medical-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-white border-2 border-medical-primary"></span>
                      <span>Bisa Dipilih</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-gray-200"></span>
                      <span>Sudah Penuh</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-100"></span>
                      <span>Jam Istirahat</span>
                    </span>
                  </div>
                </div>

                {loadingSlots ? (
                  <div className="py-12 text-center text-medical-muted flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-medical-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-medium">Memeriksa ketersediaan jam dokter...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-medical-muted">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Tidak ada jam praktik yang dibuka pada tanggal ini.</p>
                    <p className="text-xs mt-1">Silakan pilih tanggal lain yang sesuai dengan jadwal dokter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {slots.map((slot, idx) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center border ${
                            isSelected
                              ? 'bg-medical-primary text-white border-medical-primary shadow-md scale-105'
                              : slot.isAvailable
                              ? 'bg-white text-medical-text border-medical-border hover:border-medical-primary hover:bg-medical-subtle/70'
                              : slot.reasonUnavailable === 'break'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 opacity-60 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-sm font-extrabold">{slot.startTime}</span>
                          <span className="text-[10px] font-normal opacity-90 mt-0.5">
                            {slot.isAvailable
                              ? 'Tersedia'
                              : slot.reasonUnavailable === 'booked'
                              ? 'Sudah Penuh'
                              : slot.reasonUnavailable === 'blocked'
                              ? 'Dokter Operasi'
                              : slot.reasonUnavailable === 'break'
                              ? 'Istirahat'
                              : 'Lewat'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Next Step Button */}
              <div className="flex justify-end pt-4 border-t border-medical-border">
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setStep(4)}
                  className={`px-7 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                    selectedSlot
                      ? 'bg-medical-accent text-white hover:bg-medical-accentHover shadow-sm'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Lanjut Isi Data Pasien <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ISI DATA PASIEN */}
          {step === 4 && (
            <form onSubmit={handleSubmitBooking} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-medical-text">Langkah 4: Data Pasien & Konfirmasi</h3>
                  <p className="text-xs sm:text-sm text-medical-muted mt-0.5">
                    Isi data diri untuk penerbitan nomor antrean klinik.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-semibold text-medical-primary hover:underline"
                >
                  ← Ganti Jam
                </button>
              </div>

              {/* Ringkasan Janji Temu */}
              <div className="bg-medical-subtle/60 p-5 rounded-2xl border border-medical-primary/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-medical-muted block text-[11px]">Poli & Biaya:</span>
                  <span className="font-bold text-medical-text text-sm block mt-0.5">{selectedService?.name}</span>
                  <span className="text-medical-primary font-bold">{formatRupiah(selectedService?.price || 0)}</span>
                </div>
                <div>
                  <span className="text-medical-muted block text-[11px]">Dokter Pemeriksa:</span>
                  <span className="font-bold text-medical-text text-sm block mt-0.5">{selectedDoctor?.full_name}</span>
                  <span className="text-medical-muted">{selectedDoctor?.specialization}</span>
                </div>
                <div>
                  <span className="text-medical-muted block text-[11px]">Waktu Kunjungan:</span>
                  <span className="font-bold text-medical-primary text-sm block mt-0.5">
                    {selectedDate} ({selectedSlot?.startTime} - {selectedSlot?.endTime} WIB)
                  </span>
                </div>
              </div>

              {/* Input Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-medical-text block mb-1">
                    Nama Lengkap Pasien <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-medical-muted absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Budi Santoso"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-medical-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-medical-primary bg-white text-medical-text shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-medical-text block mb-1">
                    Nomor WhatsApp Pasien / Wali <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-medical-muted absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={patientWhatsapp}
                      onChange={(e) => setPatientWhatsapp(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-medical-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-medical-primary bg-white text-medical-text shadow-2xs"
                    />
                  </div>
                  <span className="text-[10px] text-medical-muted mt-1 block">
                    *Nomor antrean dan konfirmasi akan dikirimkan ke nomor ini.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-medical-text block mb-1">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-medical-muted absolute left-3.5 top-3" />
                    <input
                      type="email"
                      placeholder="emailanda@gmail.com"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-medical-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-medical-primary bg-white text-medical-text shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-medical-text block mb-1">
                    Konsultasi Apa?
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-medical-muted absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Contoh: Demam 3 hari, batuk, cek gigi rutin"
                      value={initialComplaint}
                      onChange={(e) => setInitialComplaint(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-medical-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-medical-primary bg-white text-medical-text shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Friendly Tips Box */}
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold">Tips Nyaman Berobat:</strong>
                  <p className="text-emerald-800 leading-relaxed">
                    • Harap datang 15 menit sebelum jam pemeriksaan untuk verifikasi kedatangan di meja resepsionis.<br />
                    • Jika berhalangan hadir, Anda dapat <strong>memindahkan tanggal</strong> atau membatalkan janji temu secara mandiri melalui tautan yang dikirimkan paling lambat <strong>H-1 (24 jam)</strong> sebelum jam periksa.
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-medical-border">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-medical-muted hover:text-medical-text border border-medical-border"
                >
                  Kembali
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-xl font-bold text-sm bg-medical-accent hover:bg-medical-accentHover text-white shadow-soft transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Menerbitkan Nomor Antrean...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Daftar & Ambil Nomor Antrean
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* CONFIRMATION SUCCESS MODAL */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-medical-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-medical-primary text-white p-6 text-center relative">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-white">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold">Pendaftaran Berhasil!</h3>
              <p className="text-xs text-white/90 mt-1">
                Jadwal Anda telah tercatat rapi di sistem faskes kami.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Big Queue Box */}
              <div className="bg-medical-subtle border-2 border-dashed border-medical-primary rounded-2xl p-5 text-center">
                <span className="text-xs uppercase tracking-wider font-bold text-medical-muted block">
                  Nomor Antrean Anda
                </span>
                <div className="text-4xl font-extrabold text-medical-primary tracking-tight my-1 font-mono">
                  {confirmedBooking.queue_number}
                </div>
                <span className="text-xs text-medical-text font-medium block">
                  Tunjukkan nomor ini ke meja pendaftaran saat Anda tiba di klinik.
                </span>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-medical-muted">Nama Pasien:</span>
                  <span className="font-bold text-medical-text">{confirmedBooking.patient_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-muted">Dokter:</span>
                  <span className="font-bold text-medical-text">{confirmedBooking.staff?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-muted">Poliklinik:</span>
                  <span className="font-bold text-medical-text">{confirmedBooking.service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medical-muted">Hari & Jam Datang:</span>
                  <span className="font-bold text-medical-primary">
                    {confirmedBooking.appointment_date} • {confirmedBooking.start_time} - {confirmedBooking.end_time} WIB
                  </span>
                </div>
              </div>

              {/* Tautan Ganti Jadwal */}
              <div className="border border-medical-border rounded-2xl p-4 bg-white space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-medical-text flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-medical-primary" /> Tautan Pribadi untuk Ganti Jadwal:
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    Bisa Ganti Sendiri
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/manage?token=${confirmedBooking.reschedule_token}`}
                    className="w-full text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 font-mono text-gray-600 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/manage?token=${confirmedBooking.reschedule_token}`
                        );
                        toast.success('Tautan berhasil disalin ke clipboard');
                      }
                    }}
                    className="p-2 rounded-lg border border-medical-border hover:bg-medical-subtle text-medical-text shrink-0"
                    title="Salin Tautan"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-medical-muted leading-relaxed">
                  *Simpan tautan ini. Jika nanti berhalangan datang, Anda bisa klik tautan ini untuk pindah hari atau membatalkan tanpa perlu repot menelepon klinik.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <a
                  href={`/manage?token=${confirmedBooking.reschedule_token}`}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-medical-subtle text-medical-primary hover:bg-medical-primary/10 transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Buka Halaman Jadwal Saya
                </a>
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-medical-primary text-white hover:bg-medical-primaryDark transition-colors text-center"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
