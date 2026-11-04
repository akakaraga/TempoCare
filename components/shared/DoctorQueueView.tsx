'use client';

import { useState } from 'react';
import { Appointment, Staff } from '@/lib/types';
import { updateMedicalNotesAction } from '@/actions';
import { logoutAction } from '@/actions/auth';
import {
  HeartPulse,
  LogOut,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  FileEdit,
  Stethoscope,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface DoctorQueueViewProps {
  doctor: Staff;
  initialAppointments: Appointment[];
  selectedDate: string;
}

export default function DoctorQueueView({
  doctor,
  initialAppointments,
  selectedDate,
}: DoctorQueueViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [dateFilter, setDateFilter] = useState<string>(selectedDate);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Medical notes modal state
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);

  // Filter appointments
  const filteredList = appointments.filter((a) => {
    const matchDate = !dateFilter || a.appointment_date === dateFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchDate && matchStatus;
  });

  // Daily statistics
  const totalToday = appointments.filter((a) => a.appointment_date === dateFilter).length;
  const completedToday = appointments.filter(
    (a) => a.appointment_date === dateFilter && a.status === 'completed'
  ).length;
  const pendingToday = appointments.filter(
    (a) => a.appointment_date === dateFilter && a.status === 'confirmed'
  ).length;

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

  return (
    <div className="min-h-screen bg-medical-bg">
      {/* Top Navbar */}
      <header className="bg-white border-b border-medical-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-medical-primary flex items-center justify-center text-white">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-medical-text">{doctor.full_name}</span>
                <span className="text-[10px] font-bold bg-medical-primary/10 text-medical-primary px-2 py-0.5 rounded-full">
                  Dokter Praktek
                </span>
              </div>
              <span className="text-xs text-medical-muted block">
                {doctor.specialization || 'Spesialis Medis'} • TempoCare
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-medical-muted block">Total Antrean Hari Ini</span>
              <span className="text-2xl font-extrabold text-medical-text mt-1 block">{totalToday} Pasien</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-medical-subtle text-medical-primary flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-medical-muted block">Menunggu Giliran</span>
              <span className="text-2xl font-extrabold text-amber-600 mt-1 block">{pendingToday} Pasien</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-medical-muted block">Selesai Ditangani</span>
              <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">{completedToday} Pasien</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-medical-border shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-medical-text">
              <CalendarIcon className="w-4 h-4 text-medical-primary" /> Tanggal:
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-medical-border text-xs font-semibold text-medical-text focus:ring-2 focus:ring-medical-primary outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-medical-muted font-medium">Filter Status:</span>
            {['all', 'confirmed', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-medical-primary text-white'
                    : 'bg-gray-100 text-medical-muted hover:bg-gray-200'
                }`}
              >
                {st === 'all' ? 'Semua' : st === 'confirmed' ? 'Menunggu' : st === 'completed' ? 'Selesai' : 'Batal'}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Queue Table */}
        <div className="bg-white rounded-2xl border border-medical-border shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-medical-border flex items-center justify-between bg-medical-subtle/30">
            <h3 className="text-base font-bold text-medical-text">
              Daftar Antrean Pasien Dokter ({filteredList.length} Jadwal)
            </h3>
            <span className="text-xs text-medical-muted">Diurutkan berdasarkan jam mulai</span>
          </div>

          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-medical-muted space-y-2">
              <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold">Tidak ada jadwal pasien pada filter tanggal ini.</p>
              <p className="text-xs">Pasien yang mendaftar online akan otomatis muncul di sini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-medical-muted uppercase tracking-wider text-[11px] border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">No. Antrean</th>
                    <th className="py-3 px-4">Jam</th>
                    <th className="py-3 px-4">Nama Pasien</th>
                    <th className="py-3 px-4">Kontak</th>
                    <th className="py-3 px-4">Layanan</th>
                    <th className="py-3 px-4">Keluhan Awal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredList.map((apt) => (
                    <tr key={apt.id} className="hover:bg-medical-subtle/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-sm text-medical-primary font-mono">
                          {apt.queue_number || 'A-001'}
                        </span>
                        {apt.is_walk_in && (
                          <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">
                            Walk-In
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-medical-text">
                        {apt.start_time} - {apt.end_time}
                      </td>
                      <td className="py-3 px-4 font-bold text-medical-text">
                        {apt.patient_name}
                      </td>
                      <td className="py-3 px-4 text-medical-muted">
                        <span className="block font-mono">{apt.patient_whatsapp}</span>
                        {apt.patient_email && <span className="text-[10px] text-gray-400 block">{apt.patient_email}</span>}
                      </td>
                      <td className="py-3 px-4 font-medium text-medical-text">
                        {apt.service?.name}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-medical-muted truncate" title={apt.initial_complaint || ''}>
                        {apt.initial_complaint || '-'}
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenNotes(apt)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-medical-primary text-white hover:bg-medical-primaryDark transition-colors shadow-xs"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          {apt.medical_notes ? 'Lihat/Edit Catatan' : 'Periksa & Catat Medis'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
              </div>
              <button
                type="button"
                onClick={() => setEditingAppointment(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
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
                  className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200"
                >
                  Tandai Batal / No-Show
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={savingNotes}
                    onClick={() => handleSaveNotes('confirmed')}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-medical-border text-medical-muted hover:text-medical-text"
                  >
                    Simpan Draf Saja
                  </button>

                  <button
                    type="button"
                    disabled={savingNotes || !notesInput.trim()}
                    onClick={() => handleSaveNotes('completed')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5"
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

