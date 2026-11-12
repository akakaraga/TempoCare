'use client';

import { useMemo, useState } from 'react';
import { Appointment, Service, Staff } from '@/lib/types';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Printer,
  Search,
  Stethoscope,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportPanelProps {
  mode: 'admin' | 'staff';
  appointments: Appointment[];
  staffList?: Staff[];
  services?: Service[];
  currentStaff?: Staff;
  clinicName?: string;
}

type DatePreset = 'today' | '7d' | 'month' | 'all' | 'custom';

function getTodayJakarta(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getStatusLabel(status: string): string {
  if (status === 'completed') return 'Selesai';
  if (status === 'confirmed') return 'Menunggu';
  if (status === 'cancelled') return 'Dibatalkan';
  return 'Menunggu Konfirmasi';
}

export default function ReportPanel({
  mode,
  appointments,
  staffList = [],
  services = [],
  currentStaff,
  clinicName = 'TempoCare Clinic & Hospital',
}: ReportPanelProps) {
  const todayStr = useMemo(() => getTodayJakarta(), []);
  const monthStartStr = `${todayStr.slice(0, 7)}-01`;
  const sevenDaysAgoStr = useMemo(() => addDays(todayStr, -6), [todayStr]);

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>(monthStartStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const showDoctorDimension = mode === 'admin' || (currentStaff && currentStaff.role !== 'doctor');

  // Derive unique services & doctors from props + appointments fallback
  const availableServices = useMemo(() => {
    const map = new Map<string, { id: string; name: string; price: number }>();
    services.forEach((s) => map.set(s.id, { id: s.id, name: s.name, price: s.price || 0 }));
    appointments.forEach((a) => {
      if (a.service_id && !map.has(a.service_id)) {
        map.set(a.service_id, {
          id: a.service_id,
          name: a.service?.name || 'Poliklinik',
          price: a.service?.price || 0,
        });
      }
    });
    return Array.from(map.values());
  }, [services, appointments]);

  const availableDoctors = useMemo(() => {
    const map = new Map<string, { id: string; full_name: string; specialization?: string | null }>();
    staffList
      .filter((s) => s.role === 'doctor')
      .forEach((d) =>
        map.set(d.id, { id: d.id, full_name: d.full_name, specialization: d.specialization })
      );
    appointments.forEach((a) => {
      if (a.staff_id && !map.has(a.staff_id)) {
        map.set(a.staff_id, {
          id: a.staff_id,
          full_name: a.staff?.full_name || 'Dokter',
          specialization: a.staff?.specialization,
        });
      }
    });
    return Array.from(map.values());
  }, [staffList, appointments]);

  // Effective date range
  const { effectiveStart, effectiveEnd, periodLabel } = useMemo(() => {
    if (datePreset === 'today') {
      return { effectiveStart: todayStr, effectiveEnd: todayStr, periodLabel: `Hari Ini (${todayStr})` };
    }
    if (datePreset === '7d') {
      return {
        effectiveStart: sevenDaysAgoStr,
        effectiveEnd: todayStr,
        periodLabel: `7 Hari Terakhir (${sevenDaysAgoStr} s/d ${todayStr})`,
      };
    }
    if (datePreset === 'month') {
      return {
        effectiveStart: monthStartStr,
        effectiveEnd: todayStr,
        periodLabel: `Bulan Ini (${monthStartStr} s/d ${todayStr})`,
      };
    }
    if (datePreset === 'custom') {
      return {
        effectiveStart: startDate,
        effectiveEnd: endDate,
        periodLabel: `Periode ${startDate || '...'} s/d ${endDate || '...'}`,
      };
    }
    return { effectiveStart: '', effectiveEnd: '', periodLabel: 'Semua Periode' };
  }, [datePreset, todayStr, sevenDaysAgoStr, monthStartStr, startDate, endDate]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments
      .filter((apt) => {
        if (effectiveStart && apt.appointment_date < effectiveStart) return false;
        if (effectiveEnd && apt.appointment_date > effectiveEnd) return false;
        if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
        if (showDoctorDimension && doctorFilter !== 'all' && apt.staff_id !== doctorFilter) {
          return false;
        }
        if (serviceFilter !== 'all' && apt.service_id !== serviceFilter) return false;
        if (q) {
          const matchPatient = apt.patient_name.toLowerCase().includes(q);
          const matchQueue = (apt.queue_number || '').toLowerCase().includes(q);
          const matchComplaint = (apt.initial_complaint || '').toLowerCase().includes(q);
          const matchNotes = (apt.medical_notes || '').toLowerCase().includes(q);
          if (!matchPatient && !matchQueue && !matchComplaint && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dCmp = b.appointment_date.localeCompare(a.appointment_date);
        if (dCmp !== 0) return dCmp;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
  }, [
    appointments,
    effectiveStart,
    effectiveEnd,
    statusFilter,
    showDoctorDimension,
    doctorFilter,
    serviceFilter,
    searchQuery,
  ]);

  // Helper to resolve price
  const getServicePrice = (apt: Appointment): number => {
    if (apt.service?.price) return apt.service.price;
    const found = availableServices.find((s) => s.id === apt.service_id);
    return found?.price || 0;
  };

  // Summary metrics
  const summary = useMemo(() => {
    const total = filteredAppointments.length;
    const completed = filteredAppointments.filter((a) => a.status === 'completed').length;
    const confirmed = filteredAppointments.filter((a) => a.status === 'confirmed').length;
    const cancelled = filteredAppointments.filter((a) => a.status === 'cancelled').length;
    const walkInCount = filteredAppointments.filter((a) => a.is_walk_in).length;
    const onlineCount = total - walkInCount;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const revenue = filteredAppointments
      .filter((a) => a.status === 'completed')
      .reduce((acc, a) => acc + getServicePrice(a), 0);

    return {
      total,
      completed,
      confirmed,
      cancelled,
      walkInCount,
      onlineCount,
      completionRate,
      revenue,
    };
  }, [filteredAppointments, availableServices]);

  // Breakdown per Service / Polyclinic
  const serviceBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { name: string; total: number; completed: number; confirmed: number; cancelled: number; revenue: number }
    >();
    filteredAppointments.forEach((apt) => {
      const key = apt.service_id || 'unknown';
      const srvName =
        apt.service?.name || availableServices.find((s) => s.id === key)?.name || 'Layanan Umum';
      const entry = map.get(key) || {
        name: srvName,
        total: 0,
        completed: 0,
        confirmed: 0,
        cancelled: 0,
        revenue: 0,
      };
      entry.total += 1;
      if (apt.status === 'completed') {
        entry.completed += 1;
        entry.revenue += getServicePrice(apt);
      } else if (apt.status === 'confirmed') {
        entry.confirmed += 1;
      } else if (apt.status === 'cancelled') {
        entry.cancelled += 1;
      }
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredAppointments, availableServices]);

  // Breakdown per Doctor (Admin / Non-Doctor staff)
  const doctorBreakdown = useMemo(() => {
    if (!showDoctorDimension) return [];
    const map = new Map<
      string,
      {
        name: string;
        specialization: string;
        total: number;
        completed: number;
        confirmed: number;
        cancelled: number;
        revenue: number;
      }
    >();
    filteredAppointments.forEach((apt) => {
      const key = apt.staff_id || 'unknown';
      const docObj = apt.staff || availableDoctors.find((d) => d.id === key);
      const entry = map.get(key) || {
        name: docObj?.full_name || 'Dokter',
        specialization: docObj?.specialization || '-',
        total: 0,
        completed: 0,
        confirmed: 0,
        cancelled: 0,
        revenue: 0,
      };
      entry.total += 1;
      if (apt.status === 'completed') {
        entry.completed += 1;
        entry.revenue += getServicePrice(apt);
      } else if (apt.status === 'confirmed') {
        entry.confirmed += 1;
      } else if (apt.status === 'cancelled') {
        entry.cancelled += 1;
      }
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [showDoctorDimension, filteredAppointments, availableDoctors, availableServices]);

  const handleExportCsv = () => {
    if (filteredAppointments.length === 0) {
      toast.error('Tidak ada data laporan untuk diekspor.');
      return;
    }

    const headers = [
      'No. Antrean',
      'Tanggal',
      'Jam Mulai',
      'Jam Selesai',
      'Nama Pasien',
      'WhatsApp',
      'Poliklinik / Layanan',
      'Dokter Bertugas',
      'Keluhan Awal',
      'Catatan Medis Dokter',
      'Status',
      'Tipe Pendaftaran',
      'Tarif Layanan (IDR)',
    ];

    const rows = filteredAppointments.map((apt) => [
      apt.queue_number || '-',
      apt.appointment_date,
      apt.start_time,
      apt.end_time,
      apt.patient_name,
      apt.patient_whatsapp || '-',
      apt.service?.name || availableServices.find((s) => s.id === apt.service_id)?.name || '-',
      apt.staff?.full_name || availableDoctors.find((d) => d.id === apt.staff_id)?.full_name || '-',
      apt.initial_complaint || '-',
      apt.medical_notes || '-',
      getStatusLabel(apt.status),
      apt.is_walk_in ? 'Walk-In' : 'Online',
      apt.status === 'completed' ? getServicePrice(apt) : 0,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const roleTag = mode === 'admin' ? 'admin' : currentStaff?.role || 'staff';
    link.href = url;
    link.download = `laporan-${roleTag}-${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('File laporan CSV berhasil diunduh!');
  };

  const handlePrint = () => {
    window.print();
  };

  const roleTitle =
    mode === 'admin'
      ? 'Laporan Operasional & Pelayanan Klinik (Admin)'
      : currentStaff?.role === 'doctor'
      ? `Laporan Pelayanan & Pemeriksaan — ${currentStaff.full_name}`
      : `Laporan Pelayanan Tenaga Medis — ${currentStaff?.full_name || 'Staf Klinik'}`;

  return (
    <div className="space-y-6">
      {/* Header Laporan & Aksi Ekspor */}
      <div className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-medical-subtle text-medical-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-medical-text">{roleTitle}</h2>
            <p className="text-xs text-medical-muted mt-0.5">
              {clinicName} • Periode: <strong className="text-medical-text">{periodLabel}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV (Excel)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-medical-primary text-white hover:bg-medical-primaryDark transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-medical-border shadow-soft space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-medical-muted flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Periode:
            </span>
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'today', label: 'Hari Ini' },
                { id: '7d', label: '7 Hari' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'custom', label: 'Kustom' },
              ] as { id: DatePreset; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-medical-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-medical-border text-xs outline-none focus:ring-2 focus:ring-medical-primary"
              />
              <span className="text-medical-muted">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-medical-border text-xs outline-none focus:ring-2 focus:ring-medical-primary"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-medical-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari pasien, antrean, catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-medical-border outline-none focus:ring-2 focus:ring-medical-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-medical-muted shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs border border-medical-border rounded-lg px-2.5 py-1.5 bg-white outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="completed">Selesai Ditangani</option>
              <option value="confirmed">Menunggu / Terjadwal</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-medical-muted shrink-0" />
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full text-xs border border-medical-border rounded-lg px-2.5 py-1.5 bg-white outline-none"
            >
              <option value="all">Semua Poliklinik</option>
              {availableServices.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name}
                </option>
              ))}
            </select>
          </div>

          {showDoctorDimension && (
            <div className="flex items-center gap-1.5 text-xs">
              <Stethoscope className="w-3.5 h-3.5 text-medical-muted shrink-0" />
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="w-full text-xs border border-medical-border rounded-lg px-2.5 py-1.5 bg-white outline-none"
              >
                <option value="all">Semua Dokter</option>
                {availableDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-medical-muted block">Total Kunjungan</span>
              <span className="text-2xl font-extrabold text-medical-text mt-1 block">
                {summary.total} Pasien
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-medical-subtle text-medical-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[11px] text-medical-muted mt-2 block">
            Online: <strong>{summary.onlineCount}</strong> • Walk-In:{' '}
            <strong>{summary.walkInCount}</strong>
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-medical-muted block">Selesai Ditangani</span>
              <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
                {summary.completed} Pasien
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[11px] text-emerald-700 mt-2 block font-medium">
            Tingkat penyelesaian: {summary.completionRate}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-medical-muted block">
                Menunggu & Dibatalkan
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-amber-600">{summary.confirmed}</span>
                <span className="text-xs text-medical-muted">/</span>
                <span className="text-lg font-bold text-rose-600">{summary.cancelled} Batal</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              {summary.cancelled > summary.confirmed ? (
                <XCircle className="w-5 h-5 text-rose-500" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
          </div>
          <span className="text-[11px] text-medical-muted mt-2 block">
            Antrean aktif vs pembatalan
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-medical-muted block">
                Estimasi Nilai Layanan
              </span>
              <span className="text-xl font-extrabold text-medical-primary mt-1 block">
                {formatRupiah(summary.revenue)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[11px] text-medical-muted mt-2 block">
            Berdasarkan layanan berstatus Selesai
          </span>
        </div>
      </div>

      {/* Breakdown Tables: Poliklinik & Dokter */}
      <div
        className={`grid grid-cols-1 ${
          showDoctorDimension ? 'lg:grid-cols-2' : ''
        } gap-6`}
      >
        {/* Rekap per Poliklinik */}
        <div className="bg-white rounded-2xl border border-medical-border shadow-soft overflow-hidden">
          <div className="px-5 py-3.5 border-b border-medical-border bg-gray-50/70">
            <h3 className="text-xs font-bold text-medical-text uppercase tracking-wider">
              Rekapitulasi per Poliklinik & Layanan
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-medical-border text-[11px] text-medical-muted uppercase">
                  <th className="py-2.5 px-4">Poliklinik</th>
                  <th className="py-2.5 px-3 text-center">Total</th>
                  <th className="py-2.5 px-3 text-center">Selesai</th>
                  <th className="py-2.5 px-3 text-center">Menunggu</th>
                  <th className="py-2.5 px-3 text-center">Batal</th>
                  <th className="py-2.5 px-4 text-right">Nilai Layanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-medical-border/50">
                {serviceBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-medical-muted">
                      Belum ada data pada periode ini.
                    </td>
                  </tr>
                ) : (
                  serviceBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 font-bold text-medical-text">{row.name}</td>
                      <td className="py-2.5 px-3 text-center font-semibold">{row.total}</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">
                        {row.completed}
                      </td>
                      <td className="py-2.5 px-3 text-center text-amber-700">{row.confirmed}</td>
                      <td className="py-2.5 px-3 text-center text-rose-600">{row.cancelled}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-medical-primary">
                        {formatRupiah(row.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rekap per Dokter (Admin & Non-Dokter) */}
        {showDoctorDimension && (
          <div className="bg-white rounded-2xl border border-medical-border shadow-soft overflow-hidden">
            <div className="px-5 py-3.5 border-b border-medical-border bg-gray-50/70">
              <h3 className="text-xs font-bold text-medical-text uppercase tracking-wider">
                Rekapitulasi per Dokter / Tenaga Medis
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-medical-border text-[11px] text-medical-muted uppercase">
                    <th className="py-2.5 px-4">Dokter</th>
                    <th className="py-2.5 px-3 text-center">Total</th>
                    <th className="py-2.5 px-3 text-center">Selesai</th>
                    <th className="py-2.5 px-3 text-center">Menunggu</th>
                    <th className="py-2.5 px-3 text-center">Batal</th>
                    <th className="py-2.5 px-4 text-right">Nilai Layanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-medical-border/50">
                  {doctorBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-medical-muted">
                        Belum ada data pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    doctorBreakdown.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-medical-text block">{row.name}</span>
                          <span className="text-[10px] text-medical-muted">{row.specialization}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">{row.total}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">
                          {row.completed}
                        </td>
                        <td className="py-2.5 px-3 text-center text-amber-700">{row.confirmed}</td>
                        <td className="py-2.5 px-3 text-center text-rose-600">{row.cancelled}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-medical-primary">
                          {formatRupiah(row.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tabel Detail Rincian Laporan */}
      <div className="bg-white rounded-2xl border border-medical-border shadow-soft overflow-hidden">
        <div className="px-5 py-3.5 border-b border-medical-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-medical-text">
            Rincian Data Laporan ({filteredAppointments.length} Kunjungan)
          </h3>
          <span className="text-[11px] text-medical-muted">
            Diurutkan dari tanggal terbaru
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-medical-border text-[11px] font-bold text-medical-muted uppercase tracking-wider">
                <th className="py-3 px-4">Antrean</th>
                <th className="py-3 px-4">Tanggal & Jam</th>
                <th className="py-3 px-4">Pasien</th>
                <th className="py-3 px-4">Poliklinik</th>
                {showDoctorDimension && <th className="py-3 px-4">Dokter</th>}
                <th className="py-3 px-4">Catatan Medis / Keluhan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Tarif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-medical-border/50">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={showDoctorDimension ? 8 : 7}
                    className="py-12 text-center text-medical-muted"
                  >
                    Tidak ada data kunjungan yang sesuai dengan filter laporan saat ini.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => {
                  const srvName =
                    apt.service?.name ||
                    availableServices.find((s) => s.id === apt.service_id)?.name ||
                    '-';
                  const docName =
                    apt.staff?.full_name ||
                    availableDoctors.find((d) => d.id === apt.staff_id)?.full_name ||
                    '-';
                  const price = apt.status === 'completed' ? getServicePrice(apt) : 0;

                  return (
                    <tr key={apt.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-medical-primary block">
                          {apt.queue_number || '-'}
                        </span>
                        <span className="text-[10px] text-medical-muted">
                          {apt.is_walk_in ? 'Walk-In' : 'Online'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-medical-text block">
                          {apt.appointment_date}
                        </span>
                        <span className="text-[11px] text-medical-muted">
                          {apt.start_time} - {apt.end_time}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-medical-text block">{apt.patient_name}</span>
                        <span className="text-[11px] text-medical-muted font-mono">
                          {apt.patient_whatsapp || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-medical-text">{srvName}</td>
                      {showDoctorDimension && (
                        <td className="py-3 px-4 font-medium text-medical-text">{docName}</td>
                      )}
                      <td className="py-3 px-4 max-w-[240px]">
                        {apt.medical_notes ? (
                          <p className="text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[11px] line-clamp-2">
                            {apt.medical_notes}
                          </p>
                        ) : (
                          <span className="text-[11px] text-medical-muted italic">
                            Keluhan: {apt.initial_complaint || '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                            apt.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.status === 'confirmed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {getStatusLabel(apt.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-medical-text whitespace-nowrap">
                        {price > 0 ? formatRupiah(price) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

