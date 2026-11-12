'use client';

import { useState } from 'react';
import { Appointment, Service, Staff } from '@/lib/types';
import { updateMedicalNotesAction } from '@/actions';
import { logoutAction } from '@/actions/auth';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  FileEdit,
  Stethoscope,
  Check,
  AlertCircle,
  LogOut,
  CalendarDays,
  ListFilter,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import ReportPanel from './ReportPanel';

interface DoctorQueueViewProps {
  doctor: Staff;
  initialAppointments: Appointment[];
  selectedDate: string;
  services?: Service[];
  staffList?: Staff[];
  clinicName?: string;
}

export default function DoctorQueueView({
  doctor,
  initialAppointments,
  selectedDate,
  services = [],
  staffList = [],
  clinicName = 'TempoCare',
}: DoctorQueueViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [activeTab, setActiveTab] = useState<'queue' | 'reports'>('queue');
  const [viewMode, setViewMode] = useState<'today' | 'upcoming' | 'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Medical notes modal state
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);

  const todayStr = selectedDate || new Date().toISOString().split('T')[0];

  // Helper date calculations
  const totalToday = appointments.filter((a) => a.appointment_date === todayStr).length;
  const pendingToday = appointments.filter(
    (a) => a.appointment_date === todayStr && a.status === 'confirmed'
  ).length;
  const completedToday = appointments.filter(
    (a) => a.appointment_date === todayStr && a.status === 'completed'
  ).length;
  const upcomingAppointments = appointments.filter(
    (a) => a.appointment_date > todayStr && a.status !== 'cancelled'
  );
  const upcomingCount = upcomingAppointments.length;

  // Filter list based on view mode and status
  const filteredList = appointments.filter((a) => {
    // 1. Date match
    let matchDate = true;
    if (viewMode === 'today') {
      matchDate = a.appointment_date === todayStr;
    } else if (viewMode === 'upcoming') {
      matchDate = a.appointment_date > todayStr;
    } else if (viewMode === 'custom') {
      matchDate = !customDate || a.appointment_date === customDate;
    } else if (viewMode === 'all') {
      matchDate = true;
    }

    // 2. Status match
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;

    return matchDate && matchStatus;
  });

  const handleOpenNotes = (apt: Appointment) => {
    setEditingAppointment(apt);
    setNotesInput(apt.medical_notes || '');
  };

  const handleSaveNotes = async (newStatus: 'completed' | 'confirmed' | 'cancelled') => {
    if (!editingAppointment) return;

    setSavingNotes(true);
    try {
      const res = await updateMedicalNotesAction(editingAppointment.id, notesInput, newStatus);
      if (res.success) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === editingAppointment.id
              ? { ...a, medical_notes: notesInput, status: newStatus }
              : a
          )
        );
        toast.success(
          newStatus === 'completed'
            ? 'Konsultasi selesai & rekam medis tersimpan!'
            : 'Status janji temu diperbarui'
        );
        setEditingAppointment(null);
      } else {
        toast.error(res.error || 'Gagal menyimpan catatan medis');
      }
    } catch {
      toast.error('Terjadi gangguan jaringan');
    } finally {
      setSavingNotes(false);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-medical-bg">
      {/* Top Navbar */}
      <header className="bg-white border-b border-medical-border sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-medical-primary flex items-center justify-center text-white shrink-0">
              <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-medical-text truncate">{doctor.full_name}</span>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-medical-primary/10 text-medical-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                  {doctor.role === 'doctor'
                    ? 'Dokter Praktik'
                    : doctor.role === 'nurse'
                    ? 'Perawat / Tenaga Medis'
                    : 'Resepsionis / Front Office'}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-medical-muted block truncate">
                {doctor.specialization || 'Tenaga Medis'} • {clinicName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" /> Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-medical-border pb-2 overflow-x-auto print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'queue'
                ? 'bg-medical-primary text-white shadow-xs'
                : 'text-medical-muted hover:text-medical-text hover:bg-medical-subtle'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Antrean & Jadwal Pasien ({appointments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'reports'
                ? 'bg-medical-primary text-white shadow-xs'
                : 'text-medical-muted hover:text-medical-text hover:bg-medical-subtle'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Laporan Pelayanan
          </button>
        </div>

        {activeTab === 'reports' ? (
          <ReportPanel
            mode={doctor.role === 'doctor' ? 'staff' : 'admin'}
            appointments={appointments}
            staffList={staffList}
            services={services}
            currentStaff={doctor}
            clinicName={clinicName}
          />
        ) : (
          <>
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setViewMode('today')}
            className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer ${
              viewMode === 'today'
                ? 'border-medical-primary ring-2 ring-medical-primary/20 shadow-md'
                : 'border-medical-border shadow-soft hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-medical-muted block">Total Antrean Hari Ini</span>
                <span className="text-2xl font-extrabold text-medical-text mt-1 block">{totalToday} Pasien</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-medical-subtle text-medical-primary flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
            </div>
            <span className="text-[11px] text-medical-primary mt-2 block font-medium">
              Tanggal: {formatDisplayDate(todayStr)}
            </span>
          </div>

          <div
            onClick={() => {
              setViewMode('today');
              setStatusFilter('confirmed');
            }}
            className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft flex items-center justify-between hover:border-gray-300 transition-all cursor-pointer"
          >
            <div>
              <span className="text-xs font-semibold text-medical-muted block">Menunggu Giliran (Hari Ini)</span>
              <span className="text-2xl font-extrabold text-amber-600 mt-1 block">{pendingToday} Pasien</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => {
              setViewMode('today');
              setStatusFilter('completed');
            }}
            className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft flex items-center justify-between hover:border-gray-300 transition-all cursor-pointer"
          >
            <div>
              <span className="text-xs font-semibold text-medical-muted block">Selesai Ditangani</span>
              <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">{completedToday} Pasien</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setViewMode('upcoming')}
            className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer ${
              viewMode === 'upcoming'
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                : 'border-medical-border shadow-soft hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-medical-muted block">Jadwal Pasien Mendatang</span>
                <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">{upcomingCount} Pasien</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <CalendarDays className="w-5 h-5" />
              </div>
            </div>
            <span className="text-[11px] text-indigo-600 mt-2 block font-medium">
              {upcomingCount > 0 ? 'Ada booking tanggal berikutnya' : 'Belum ada reservasi baru'}
            </span>
          </div>
        </div>

        {/* Smart Notice if Today is empty but Upcoming has patients */}
        {totalToday === 0 && upcomingCount > 0 && viewMode === 'today' && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-sky-900">Jadwal Pasien Mendatang Ditemukan</h4>
                <p className="text-xs text-sky-700">
                  Tidak ada jadwal pasien hari ini ({formatDisplayDate(todayStr)}), namun terdapat{' '}
                  <strong>{upcomingCount} pasien terdaftar</strong> untuk tanggal mendatang.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('upcoming')}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              Buka Jadwal Mendatang ({upcomingCount}) →
            </button>
          </div>
        )}

        {/* View Switcher & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-medical-border shadow-soft flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setViewMode('all');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white text-medical-primary shadow-xs'
                  : 'text-medical-muted hover:text-medical-text'
              }`}
            >
              Semua Jadwal ({appointments.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('today');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'today'
                  ? 'bg-white text-medical-primary shadow-xs'
                  : 'text-medical-muted hover:text-medical-text'
              }`}
            >
              Hari Ini ({totalToday})
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('upcoming');
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'upcoming'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-medical-muted hover:text-medical-text'
              }`}
            >
              Mendatang ({upcomingCount})
            </button>
          </div>

          {/* Date Picker & Status Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-medical-muted flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-medical-primary" /> Tanggal:
              </span>
              <input
                type="date"
                value={viewMode === 'custom' ? customDate : viewMode === 'today' ? todayStr : ''}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setViewMode('custom');
                }}
                className="px-2.5 py-1.5 rounded-lg border border-medical-border text-xs font-semibold text-medical-text focus:ring-2 focus:ring-medical-primary outline-none"
              />
              {viewMode === 'custom' && customDate && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate('');
                    setViewMode('all');
                  }}
                  className="text-[11px] text-rose-600 hover:underline font-semibold"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
              <span className="text-xs font-semibold text-medical-muted flex items-center gap-1">
                <ListFilter className="w-3.5 h-3.5" /> Status:
              </span>
              {['all', 'confirmed', 'completed', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold capitalize transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-medical-primary text-white shadow-xs'
                      : 'bg-gray-100 text-medical-muted hover:bg-gray-200'
                  }`}
                >
                  {st === 'all'
                    ? 'Semua'
                    : st === 'confirmed'
                    ? 'Menunggu'
                    : st === 'completed'
                    ? 'Selesai'
                    : 'Batal'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Patient Queue Table */}
        <div className="bg-white rounded-2xl border border-medical-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-medical-border flex items-center justify-between bg-medical-subtle/30">
            <div>
              <h3 className="text-base font-bold text-medical-text">
                Daftar Antrean Pasien Dokter ({filteredList.length} Jadwal)
              </h3>
              <p className="text-xs text-medical-muted mt-0.5">
                {viewMode === 'all'
                  ? 'Menampilkan seluruh jadwal pasien yang terdaftar'
                  : viewMode === 'today'
                  ? `Jadwal pasien hari ini (${formatDisplayDate(todayStr)})`
                  : viewMode === 'upcoming'
                  ? 'Jadwal pasien untuk hari-hari mendatang'
                  : `Jadwal pasien pada tanggal ${formatDisplayDate(customDate)}`}
              </p>
            </div>
            <span className="text-xs font-semibold text-medical-muted bg-white px-2.5 py-1 rounded-lg border border-medical-border">
              Total Database: {appointments.length} Pasien
            </span>
          </div>

          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-medical-muted space-y-3">
              <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-medical-text">
                  Tidak ada jadwal pasien pada filter saat ini.
                </p>
                <p className="text-xs text-medical-muted mt-1">
                  {viewMode === 'today' && upcomingCount > 0
                    ? `Namun ada ${upcomingCount} jadwal di hari mendatang. Silakan klik tab "Mendatang" atau "Semua Jadwal".`
                    : 'Pasien yang mendaftar online atau walk-in dari admin akan otomatis tampil di sini.'}
                </p>
              </div>
              {upcomingCount > 0 && viewMode !== 'upcoming' && (
                <button
                  type="button"
                  onClick={() => setViewMode('upcoming')}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Lihat {upcomingCount} Jadwal Mendatang
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-medical-muted uppercase tracking-wider text-[11px] border-b border-gray-100">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">No. Antrean</th>
                    <th className="py-3.5 px-4 font-bold">Tanggal & Jam</th>
                    <th className="py-3.5 px-4 font-bold">Nama Pasien</th>
                    <th className="py-3.5 px-4 font-bold">Kontak</th>
                    <th className="py-3.5 px-4 font-bold">Layanan</th>
                    <th className="py-3.5 px-4 font-bold">Keluhan Awal</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Aksi Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredList.map((apt) => (
                    <tr key={apt.id} className="hover:bg-medical-subtle/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-sm text-medical-primary font-mono">
                          {apt.queue_number || 'A-001'}
                        </span>
                        {apt.is_walk_in && (
                          <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">
                            Walk-In
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-medical-text block">
                          {formatDisplayDate(apt.appointment_date)}
                        </span>
                        <span className="text-xs text-medical-muted flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-medical-primary" />
                          {apt.start_time} - {apt.end_time} WIB
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-medical-text">
                        {apt.patient_name}
                      </td>
                      <td className="py-3.5 px-4 text-medical-muted">
                        <span className="block font-mono text-medical-text">{apt.patient_whatsapp || '-'}</span>
                        {apt.patient_email && (
                          <span className="text-[10px] text-gray-400 block">{apt.patient_email}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-medical-text">
                        {apt.service?.name || 'Poliklinik'}
                      </td>
                      <td
                        className="py-3.5 px-4 max-w-xs text-medical-muted truncate"
                        title={apt.initial_complaint || ''}
                      >
                        {apt.initial_complaint || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            apt.status === 'confirmed'
                              ? 'bg-amber-100 text-amber-800'
                              : apt.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {apt.status === 'confirmed'
                            ? 'Menunggu'
                            : apt.status === 'completed'
                            ? 'Selesai'
                            : 'Batal'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenNotes(apt)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-medical-primary text-white hover:bg-medical-primaryDark transition-colors shadow-xs cursor-pointer"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          {apt.medical_notes ? 'Lihat/Edit Catatan' : 'Periksa & Catat'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </main>

      {/* MEDICAL NOTES & DIAGNOSIS MODAL */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-medical-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-medical-subtle p-5 border-b border-medical-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-medical-primary uppercase">
                  Pemeriksaan Pasien [Antrean: {editingAppointment.queue_number}]
                </span>
                <h3 className="text-base font-bold text-medical-text">
                  {editingAppointment.patient_name}
                </h3>
                <span className="text-xs text-medical-muted">
                  Tanggal: {formatDisplayDate(editingAppointment.appointment_date)} • {editingAppointment.start_time} WIB
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingAppointment(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                <span className="text-medical-muted block">Keluhan Awal Pasien:</span>
                <p className="font-medium text-medical-text">
                  {editingAppointment.initial_complaint || 'Tidak ada catatan keluhan awal.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-medical-text mb-1">
                  Catatan Pemeriksaan Medis / Diagnosis Singkat / Resep:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Contoh: Tekanan darah 120/80 mmHg, diagnosis faringitis akut, terapi amoxicillin 3x500mg dan edukasi istirahat cukup."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full p-3 text-xs border border-medical-border rounded-xl focus:ring-2 focus:ring-medical-primary outline-none text-medical-text"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-medical-border">
                <button
                  type="button"
                  disabled={savingNotes}
                  onClick={() => handleSaveNotes('cancelled')}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                >
                  Tandai Batal / No-Show
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={savingNotes}
                    onClick={() => handleSaveNotes('confirmed')}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-medical-border text-medical-muted hover:text-medical-text cursor-pointer"
                  >
                    Simpan Draf Saja
                  </button>

                  <button
                    type="button"
                    disabled={savingNotes || !notesInput.trim()}
                    onClick={() => handleSaveNotes('completed')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {savingNotes ? 'Menyimpan...' : 'Selesai & Tutup Sesi'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
