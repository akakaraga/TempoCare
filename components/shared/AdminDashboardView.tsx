'use client';

import { useState } from 'react';
import { Appointment, Staff, Service, BlockOut, ClinicSettings } from '@/lib/types';
import {
  createWalkInAppointmentAction,
  createBlockOutAction,
  deleteBlockOutAction,
  createStaffAction,
  updateStaffAction,
  deleteStaffAction,
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  updateClinicSettingsAction,
  adminUpdateAppointmentAction
} from '@/actions';
import { logoutAction } from '@/actions/auth';
import { formatRupiah } from '@/lib/utils';
import {
  UserCog,
  LogOut,
  Calendar as CalendarIcon,
  Clock,
  UserPlus,
  Ban,
  Stethoscope,
  Plus,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Trash2,
  Edit,
  Sliders,
  Settings,
  Phone,
  Mail,
  MapPin,
  Check,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminDashboardViewProps {
  initialAppointments: Appointment[];
  staffList: Staff[];
  services: Service[];
  blockOuts: BlockOut[];
  clinicSettings: ClinicSettings;
}

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function AdminDashboardView({
  initialAppointments,
  staffList,
  services,
  blockOuts: initialBlockOuts,
  clinicSettings: initialSettings,
}: AdminDashboardViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [blockOuts, setBlockOuts] = useState<BlockOut[]>(initialBlockOuts);
  const [doctors, setDoctors] = useState<Staff[]>(staffList);
  const [serviceList, setServiceList] = useState<Service[]>(services);
  const [settings, setSettings] = useState<ClinicSettings>(initialSettings);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'appointments' | 'services' | 'doctors' | 'blockouts' | 'settings'
  >('appointments');

  // Filters for Appointments
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [showBlockOutModal, setShowBlockOutModal] = useState<boolean>(false);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState<boolean>(false);
  const [showEditDoctorModal, setShowEditDoctorModal] = useState<Staff | null>(null);
  const [showAddServiceModal, setShowAddServiceModal] = useState<boolean>(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState<Service | null>(null);

  // Walk-in form states
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInServiceId, setWalkInServiceId] = useState<string>(services[0]?.id || '');
  const [walkInDoctorId, setWalkInDoctorId] = useState<string>(
    staffList.find((s) => s.role === 'doctor')?.id || ''
  );
  const [walkInDate, setWalkInDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [walkInStartTime, setWalkInStartTime] = useState<string>('09:00');
  const [walkInComplaint, setWalkInComplaint] = useState<string>('');
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState<boolean>(false);

  // Block-out form states
  const [blockDoctorId, setBlockDoctorId] = useState<string>(
    staffList.find((s) => s.role === 'doctor')?.id || ''
  );
  const [blockDate, setBlockDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [blockStartTime, setBlockStartTime] = useState<string>('12:00');
  const [blockEndTime, setBlockEndTime] = useState<string>('14:00');
  const [blockReason, setBlockReason] = useState<string>('Operasi Cito / Rapat Mutu Medis');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState<boolean>(false);

  // Add Doctor Form States
  const [docName, setDocName] = useState<string>('');
  const [docSpecialization, setDocSpecialization] = useState<string>('');
  const [docEmail, setDocEmail] = useState<string>('');
  const [docPhone, setDocPhone] = useState<string>('');
  const [docRole, setDocRole] = useState<'doctor' | 'admin' | 'nurse'>('doctor');
  const [docPracticeDays, setDocPracticeDays] = useState<string[]>([
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
  ]);
  const [docStartTime, setDocStartTime] = useState<string>('08:00');
  const [docEndTime, setDocEndTime] = useState<string>('16:00');
  const [docAssignedServices, setDocAssignedServices] = useState<string[]>([]);

  // Add Service Form States
  const [srvName, setSrvName] = useState<string>('');
  const [srvDuration, setSrvDuration] = useState<number>(30);
  const [srvPrice, setSrvPrice] = useState<number>(200000);
  const [srvDesc, setSrvDesc] = useState<string>('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<ClinicSettings>(initialSettings);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Filtered Appointments
  const filteredAppointments = appointments.filter((a) => {
    const matchSearch =
      !searchTerm ||
      a.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.patient_whatsapp.includes(searchTerm) ||
      (a.queue_number && a.queue_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchDoctor = selectedDoctorFilter === 'all' || a.staff_id === selectedDoctorFilter;
    const matchDate = !selectedDateFilter || a.appointment_date === selectedDateFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;

    return matchSearch && matchDoctor && matchDate && matchStatus;
  });

  // ----------------------------------------------------------------------------
  // HANDLERS: WALK-IN
  // ----------------------------------------------------------------------------
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWalkIn(true);
    try {
      const selectedSrv = serviceList.find((s) => s.id === walkInServiceId);
      const duration = selectedSrv?.duration_minutes || 30;

      const [h, m] = walkInStartTime.split(':').map(Number);
      const endTotalMin = h * 60 + m + duration;
      const endH = Math.floor(endTotalMin / 60).toString().padStart(2, '0');
      const endM = (endTotalMin % 60).toString().padStart(2, '0');
      const calculatedEnd = `${endH}:${endM}`;

      const res = await createWalkInAppointmentAction({
        patient_name: walkInName,
        patient_whatsapp: walkInPhone,
        service_id: walkInServiceId,
        staff_id: walkInDoctorId,
        appointment_date: walkInDate,
        start_time: walkInStartTime,
        end_time: calculatedEnd,
        initial_complaint: walkInComplaint,
      });

      if (res.success && res.appointment) {
        setAppointments([res.appointment, ...appointments]);
        toast.success(`Pasien Walk-in berhasil didaftarkan! No. Antrean: ${res.appointment.queue_number}`);
        setShowWalkInModal(false);
        setWalkInName('');
        setWalkInPhone('');
        setWalkInComplaint('');
      } else {
        toast.error(res.error || 'Gagal mendaftarkan pasien walk-in');
      }
    } catch {
      toast.error('Terjadi gangguan jaringan');
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  // ----------------------------------------------------------------------------
  // HANDLERS: APPOINTMENT STATUS CHANGE (Admin Controls)
  // ----------------------------------------------------------------------------
  const handleUpdateAppointmentStatus = async (
    id: string,
    newStatus: 'confirmed' | 'completed' | 'cancelled'
  ) => {
    try {
      const res = await adminUpdateAppointmentAction(id, { status: newStatus });
      if (res.success) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
        );
        toast.success(`Status janji temu diperbarui menjadi ${newStatus.toUpperCase()}`);
      } else {
        toast.error(res.error || 'Gagal memperbarui status');
      }
    } catch {
      toast.error('Terjadi gangguan jaringan');
    }
  };

  // ----------------------------------------------------------------------------
  // HANDLERS: DOCTOR CRUD
  // ----------------------------------------------------------------------------
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createStaffAction({
        full_name: docName,
        role: docRole,
        specialization: docSpecialization,
        email: docEmail,
        phone: docPhone,
        practice_days: docPracticeDays,
        practice_start_time: docStartTime,
        practice_end_time: docEndTime,
        assigned_service_ids: docAssignedServices,
      });

      if (res.success && res.staff) {
        setDoctors([...doctors, res.staff]);
        toast.success(`Dokter ${res.staff.full_name} berhasil ditambahkan ke sistem!`);
        setShowAddDoctorModal(false);
        setDocName('');
        setDocSpecialization('');
        setDocEmail('');
        setDocPhone('');
        setDocAssignedServices([]);
      } else {
        toast.error(res.error || 'Gagal menambah dokter');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditDoctorModal) return;
    try {
      const res = await updateStaffAction(showEditDoctorModal.id, showEditDoctorModal);
      if (res.success && res.staff) {
        setDoctors(doctors.map((d) => (d.id === res.staff!.id ? res.staff! : d)));
        toast.success(`Data dokter ${res.staff.full_name} berhasil disimpan!`);
        setShowEditDoctorModal(null);
      } else {
        toast.error(res.error || 'Gagal mengupdate dokter');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDeleteDoctor = async (id: string, name: string) => {
    if (!confirm(`Hapus dokter "${name}" dari sistem faskes?`)) return;
    try {
      const res = await deleteStaffAction(id);
      if (res.success) {
        setDoctors(doctors.filter((d) => d.id !== id));
        toast.success(`Dokter ${name} berhasil dihapus.`);
      } else {
        toast.error('Gagal menghapus dokter');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleToggleDoctorStatus = async (doctor: Staff) => {
    const updatedStatus = !doctor.is_active;
    const res = await updateStaffAction(doctor.id, { is_active: updatedStatus });
    if (res.success) {
      setDoctors(doctors.map((d) => (d.id === doctor.id ? { ...d, is_active: updatedStatus } : d)));
      toast.success(
        `Status ${doctor.full_name} diubah menjadi ${updatedStatus ? 'AKTIF' : 'NONAKTIF'}`
      );
    }
  };

  // ----------------------------------------------------------------------------
  // HANDLERS: SERVICE CRUD
  // ----------------------------------------------------------------------------
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createServiceAction({
        name: srvName,
        duration_minutes: Number(srvDuration),
        price: Number(srvPrice),
        description: srvDesc,
      });

      if (res.success && res.service) {
        setServiceList([...serviceList, res.service]);
        toast.success(`Poliklinik/Layanan ${res.service.name} berhasil dibuat!`);
        setShowAddServiceModal(false);
        setSrvName('');
        setSrvDesc('');
      } else {
        toast.error(res.error || 'Gagal menambah layanan');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditServiceModal) return;
    try {
      const res = await updateServiceAction(showEditServiceModal.id, showEditServiceModal);
      if (res.success && res.service) {
        setServiceList(serviceList.map((s) => (s.id === res.service!.id ? res.service! : s)));
        toast.success(`Layanan ${res.service.name} berhasil diperbarui!`);
        setShowEditServiceModal(null);
      } else {
        toast.error(res.error || 'Gagal memperbarui layanan');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!confirm(`Hapus layanan poliklinik "${name}"? Pasien tidak akan bisa memilih layanan ini lagi.`))
      return;
    try {
      const res = await deleteServiceAction(id);
      if (res.success) {
        setServiceList(serviceList.filter((s) => s.id !== id));
        toast.success(`Layanan ${name} berhasil dihapus.`);
      } else {
        toast.error('Gagal menghapus layanan');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleToggleServiceStatus = async (service: Service) => {
    const updatedStatus = !service.is_active;
    const res = await updateServiceAction(service.id, { is_active: updatedStatus });
    if (res.success) {
      setServiceList(
        serviceList.map((s) => (s.id === service.id ? { ...s, is_active: updatedStatus } : s))
      );
      toast.success(
        `Poliklinik ${service.name} diubah menjadi ${updatedStatus ? 'AKTIF' : 'NONAKTIF'}`
      );
    }
  };

  // ----------------------------------------------------------------------------
  // HANDLERS: BLOCK OUT
  // ----------------------------------------------------------------------------
  const handleBlockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBlock(true);
    try {
      const res = await createBlockOutAction({
        staff_id: blockDoctorId,
        block_date: blockDate,
        start_time: blockStartTime,
        end_time: blockEndTime,
        reason: blockReason,
      });

      if (res.success && res.block) {
        setBlockOuts([res.block, ...blockOuts]);
        toast.success('Jadwal blokir / cuti dokter berhasil disimpan!');
        setShowBlockOutModal(false);
      } else {
        toast.error(res.error || 'Gagal membuat blokir jadwal');
      }
    } catch {
      toast.error('Terjadi gangguan');
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleDeleteBlockOut = async (id: string) => {
    if (!confirm('Buka kembali slot jadwal yang diblokir ini?')) return;
    try {
      const res = await deleteBlockOutAction(id);
      if (res.success) {
        setBlockOuts(blockOuts.filter((b) => b.id !== id));
        toast.success('Blokir jadwal berhasil dihapus. Slot kembali dibuka untuk pasien.');
      }
    } catch {
      toast.error('Gagal menghapus blokir');
    }
  };

  // ----------------------------------------------------------------------------
  // HANDLERS: CLINIC PROFILE SETTINGS
  // ----------------------------------------------------------------------------
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await updateClinicSettingsAction(settingsForm);
      if (res.success && res.settings) {
        setSettings(res.settings);
        toast.success('Informasi profil & pengumuman faskes berhasil diperbarui!');
      } else {
        toast.error(res.error || 'Gagal menyimpan pengaturan');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-medical-bg">
      {/* Top Navbar */}
      <header className="bg-white border-b border-medical-border sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-medical-primary flex items-center justify-center text-white shadow-xs">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-medical-text">CMS Admin RS</span>
                <span className="text-[10px] font-bold bg-medical-primary/10 text-medical-primary px-2 py-0.5 rounded-full">
                  Akses Penuh
                </span>
              </div>
              <span className="text-xs text-medical-muted block truncate max-w-xs">
                {settings.name} • Manajemen Master Data & Jadwal Faskes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowWalkInModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-medical-primary text-white hover:bg-medical-primaryDark transition-all shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" /> Pasien Walk-in
            </button>

            <button
              type="button"
              onClick={() => setShowBlockOutModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all shadow-xs"
            >
              <Ban className="w-3.5 h-3.5" /> Blokir Jam
            </button>

            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-medical-border pb-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'appointments'
                  ? 'bg-medical-primary text-white shadow-xs'
                  : 'text-medical-muted hover:text-medical-text hover:bg-medical-subtle'
              }`}
            >
              Jadwal Pasien ({appointments.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'services'
                  ? 'bg-medical-primary text-white shadow-xs'
                  : 'text-medical-muted hover:text-medical-text hover:bg-medical-subtle'
              }`}
            >
              Master Poliklinik & Layanan ({serviceList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('doctors')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'doctors'
                  ? 'bg-medical-primary text-white shadow-xs'
                  : 'text-medical-muted hover:text-medical-text hover:bg-medical-subtle'
              }`}
            >
              Master Dokter & Praktek ({doctors.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('blockouts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'blockouts'
                  ? 'bg-medical-primary text-white shadow-xs'
                  : 'text-medical-muted hover:text-medical-text hover:bg-medical-subtle'
              }`}
            >
              Blokir Jam / Cuti ({blockOuts.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-medical-primary text-white shadow-xs'
                  : 'text-medical-muted hover:text-medical-text hover:bg-medical-subtle'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Pengaturan Faskes
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: APPOINTMENTS MATRIX */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-medical-border shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-medical-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari pasien / no. antrean..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-medical-muted">Dokter:</span>
                  <select
                    value={selectedDoctorFilter}
                    onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-medical-border text-xs bg-white text-medical-text focus:ring-2 focus:ring-medical-primary outline-none"
                  >
                    <option value="all">Semua Dokter</option>
                    {doctors
                      .filter((d) => d.role === 'doctor')
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.full_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-medical-muted">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-medical-border text-xs bg-white text-medical-text focus:ring-2 focus:ring-medical-primary outline-none capitalize"
                  >
                    <option value="all">Semua Status</option>
                    <option value="confirmed">Terkonfirmasi</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Batal</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-medical-muted">Tanggal:</span>
                  <input
                    type="date"
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-medical-border text-xs bg-white text-medical-text focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                  {selectedDateFilter && (
                    <button
                      type="button"
                      onClick={() => setSelectedDateFilter('')}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-medical-border shadow-soft overflow-hidden">
              <div className="px-6 py-4 border-b border-medical-border bg-medical-subtle/30 flex items-center justify-between">
                <h3 className="text-base font-bold text-medical-text">
                  Helicopter View: Seluruh Jadwal Pasien RS ({filteredAppointments.length})
                </h3>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Proteksi Anti Double-Booking Aktif
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-medical-muted uppercase tracking-wider text-[11px] border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">No. Antrean</th>
                      <th className="py-3 px-4">Tanggal & Jam</th>
                      <th className="py-3 px-4">Nama Pasien</th>
                      <th className="py-3 px-4">WhatsApp</th>
                      <th className="py-3 px-4">Dokter Bertugas</th>
                      <th className="py-3 px-4">Layanan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-medical-muted">
                          Tidak ada data janji temu yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-medical-subtle/20 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-medical-primary text-sm">
                            {apt.queue_number || 'A-001'}
                            {apt.is_walk_in && (
                              <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">
                                Walk-In
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-medical-text block">
                              {apt.appointment_date}
                            </span>
                            <span className="text-medical-muted text-[11px]">
                              {apt.start_time} - {apt.end_time} WIB
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-medical-text">
                            {apt.patient_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-medical-muted">
                            {apt.patient_whatsapp}
                          </td>
                          <td className="py-3 px-4 font-medium text-medical-text">
                            {apt.staff?.full_name}
                          </td>
                          <td className="py-3 px-4 text-medical-muted">
                            {apt.service?.name}
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
                            <div className="flex items-center justify-end gap-1.5">
                              {apt.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAppointmentStatus(apt.id, 'completed')}
                                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                                  title="Tandai Selesai Konsultasi"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {apt.status !== 'cancelled' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAppointmentStatus(apt.id, 'cancelled')}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200"
                                  title="Batalkan Jadwal"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: CMS SERVICES / POLIKLINIK MASTER */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-medical-text">
                  CMS Manajemen Poliklinik & Layanan ({serviceList.length})
                </h3>
                <p className="text-xs text-medical-muted">
                  Kelola nama poliklinik, standar durasi tindakan medis, estimasi tarif, dan visibilitas pada portal pendaftaran pasien.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddServiceModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-medical-accent text-white hover:bg-medical-accentHover transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Tambah Poliklinik Baru
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceList.map((service) => {
                const assignedCount = doctors.filter(
                  (d) => d.assigned_service_ids && d.assigned_service_ids.includes(service.id)
                ).length;

                return (
                  <div
                    key={service.id}
                    className={`bg-white p-5 rounded-2xl border transition-all shadow-soft flex flex-col justify-between ${
                      service.is_active ? 'border-medical-border' : 'border-gray-200 opacity-70 bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            service.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {service.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>

                        <span className="text-xs font-bold text-medical-primary">
                          {formatRupiah(service.price)}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-medical-text mt-3">{service.name}</h4>
                      <p className="text-xs text-medical-muted mt-1 line-clamp-2">
                        {service.description || 'Tidak ada deskripsi layanan.'}
                      </p>

                      <div className="mt-4 pt-3 border-t border-medical-border/60 text-xs text-medical-muted space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-medical-primary" />
                          <span>Standar Durasi: <strong>{service.duration_minutes} Menit</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Stethoscope className="w-3.5 h-3.5 text-medical-primary" />
                          <span>Dokter Ditugaskan: <strong>{assignedCount} Dokter</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-medical-border/60 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleServiceStatus(service)}
                        className={`text-[11px] font-semibold underline ${
                          service.is_active ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {service.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowEditServiceModal(service)}
                          className="p-1.5 rounded-lg border border-medical-border hover:bg-medical-subtle text-medical-text"
                          title="Edit Layanan"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(service.id, service.name)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          title="Hapus Layanan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: CMS DOCTORS & STAFF MASTER */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'doctors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-medical-text">
                  CMS Manajemen Dokter & Tenaga Medis ({doctors.length})
                </h3>
                <p className="text-xs text-medical-muted">
                  Kelola staf dokter, spesialisasi, penugasan ke poliklinik, serta jadwal hari dan jam praktik masing-masing dokter.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDoctorModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-medical-primary text-white hover:bg-medical-primaryDark transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Tambah Dokter Baru
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => {
                const assignedNames = (doc.assigned_service_ids || [])
                  .map((sId) => serviceList.find((s) => s.id === sId)?.name)
                  .filter(Boolean);

                return (
                  <div
                    key={doc.id}
                    className={`bg-white p-5 rounded-2xl border transition-all shadow-soft flex flex-col justify-between ${
                      doc.is_active ? 'border-medical-border' : 'border-gray-200 opacity-70 bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-full bg-medical-primary text-white flex items-center justify-center font-bold text-base shadow-inner">
                          {doc.full_name.replace('Dr. ', '').replace('Drg. ', '').charAt(0)}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            doc.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {doc.is_active ? 'Praktek Aktif' : 'Cuti/Nonaktif'}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-medical-text mt-3">{doc.full_name}</h4>
                      <span className="inline-block text-[11px] font-semibold text-medical-primary bg-medical-subtle px-2 py-0.5 rounded mt-1">
                        {doc.specialization || 'Dokter Umum'}
                      </span>

                      {/* Contacts */}
                      <div className="mt-3 text-xs text-medical-muted space-y-1">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> <span className="font-mono text-[11px]">{doc.email}</span>
                        </div>
                        {doc.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> <span className="font-mono text-[11px]">{doc.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Practice Days & Hours */}
                      <div className="mt-3 p-2.5 bg-gray-50 rounded-xl text-[11px] text-gray-700 space-y-1 border border-gray-100">
                        <div>
                          <strong>📅 Hari Praktek:</strong>{' '}
                          <span>{doc.practice_days?.join(', ') || 'Senin - Jumat'}</span>
                        </div>
                        <div>
                          <strong>⏰ Jam Praktek:</strong>{' '}
                          <span>{doc.practice_start_time || '08:00'} - {doc.practice_end_time || '17:00'} WIB</span>
                        </div>
                      </div>

                      {/* Assigned Polyclinics */}
                      <div className="mt-3">
                        <span className="text-[10px] uppercase font-bold text-medical-muted block mb-1">
                          Poliklinik yang Ditangani:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {assignedNames.length > 0 ? (
                            assignedNames.map((name, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-medium bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded"
                              >
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Semua Poliklinik (Umum)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-medical-border/60 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleDoctorStatus(doc)}
                        className={`text-[11px] font-semibold underline ${
                          doc.is_active ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {doc.is_active ? 'Tandai Cuti' : 'Aktifkan Kembali'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowEditDoctorModal(doc)}
                          className="p-1.5 rounded-lg border border-medical-border hover:bg-medical-subtle text-medical-text"
                          title="Edit Data Dokter"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoctor(doc.id, doc.full_name)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          title="Hapus Dokter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: CMS BLOCK OUTS (Emergency surgery, leave, meetings) */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'blockouts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-medical-text">
                  Daftar Jadwal Blokir Dokter (Block-outs)
                </h3>
                <p className="text-xs text-medical-muted">
                  Jadwal dokter yang diblokir otomatis tidak akan muncul dan tidak dapat dipesan oleh pasien di portal publik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockOutModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Tambah Blokir Jadwal
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {blockOuts.map((block) => (
                <div
                  key={block.id}
                  className="bg-white p-5 rounded-2xl border border-medical-border shadow-soft space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        Jadwal Ditutup
                      </span>
                      <Ban className="w-5 h-5 text-amber-600" />
                    </div>

                    <h4 className="font-bold text-sm text-medical-text mt-3">{block.staff?.full_name}</h4>
                    <span className="text-xs text-medical-muted block mt-0.5">
                      Alasan: <strong className="text-medical-text">{block.reason}</strong>
                    </span>

                    <div className="pt-3 mt-3 border-t border-medical-border text-xs text-medical-muted space-y-1">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5 text-medical-primary" /> Tanggal: <strong>{block.block_date}</strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-medical-primary" /> Jam: <strong>{block.start_time} - {block.end_time} WIB</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-medical-border/60 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteBlockOut(block.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Buka Kembali Slot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: CMS CLINIC PROFILE & OPERATIONAL SETTINGS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-medical-border shadow-soft p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-medical-text flex items-center gap-2">
                <Settings className="w-5 h-5 text-medical-primary" />
                CMS Pengaturan Profil & Operasional Faskes
              </h3>
              <p className="text-xs text-medical-muted mt-0.5">
                Semua data di bawah ini bersifat dinamis dan akan otomatis muncul di Navbar, Header, Hero Section, dan Footer portal publik pasien.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-medical-text mb-1">
                    Nama Faskes (Klinik / Rumah Sakit) *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-medical-text mb-1">
                    Tagline Faskes
                  </label>
                  <input
                    type="text"
                    value={settingsForm.tagline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-medical-text mb-1">
                  Pesan Pengumuman / Running Banner Pasien (Tampil di Header & Hero)
                </label>
                <input
                  type="text"
                  value={settingsForm.announcement}
                  onChange={(e) => setSettingsForm({ ...settingsForm, announcement: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none text-emerald-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-medical-text mb-1">
                    Hotline Darurat / Ambulans
                  </label>
                  <input
                    type="text"
                    value={settingsForm.emergency_phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, emergency_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none text-rose-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-medical-text mb-1">
                    Nomor Telepon Faskes
                  </label>
                  <input
                    type="text"
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-medical-text mb-1">
                    Email Resmi
                  </label>
                  <input
                    type="email"
                    value={settingsForm.email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-medical-text mb-1">
                  Alamat Lengkap Faskes
                </label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-medical-text mb-1">
                    Jam Buka Operasional
                  </label>
                  <input
                    type="time"
                    value={settingsForm.open_hour}
                    onChange={(e) => setSettingsForm({ ...settingsForm, open_hour: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-medical-text mb-1">
                    Jam Tutup Operasional
                  </label>
                  <input
                    type="time"
                    value={settingsForm.close_hour}
                    onChange={(e) => setSettingsForm({ ...settingsForm, close_hour: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-medical-border">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 rounded-xl font-bold bg-medical-primary text-white hover:bg-medical-primaryDark transition-all shadow-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isSavingSettings ? 'Menyimpan...' : 'Simpan Perubahan Profil Faskes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: ADD DOCTOR */}
      {/* ------------------------------------------------------------------ */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-medical-border shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-medical-text">Tambah Dokter / Staf Medis Baru</h3>
            <form onSubmit={handleAddDoctor} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Nama Lengkap, Sp..."
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border outline-none focus:ring-2 focus:ring-medical-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Role / Peran</label>
                  <select
                    value={docRole}
                    onChange={(e) => setDocRole(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-xl border border-medical-border bg-white"
                  >
                    <option value="doctor">Dokter</option>
                    <option value="admin">Admin RS</option>
                    <option value="nurse">Perawat</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Spesialisasi</label>
                  <input
                    type="text"
                    placeholder="Sp.A, Gigi, Penyakit Dalam"
                    value={docSpecialization}
                    onChange={(e) => setDocSpecialization(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Email Staf *</label>
                  <input
                    type="email"
                    required
                    placeholder="dokter@tempocare.clinic"
                    value={docEmail}
                    onChange={(e) => setDocEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="081234..."
                    value={docPhone}
                    onChange={(e) => setDocPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border"
                  />
                </div>
              </div>

              {/* Practice Hours */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block font-semibold mb-1">Jam Praktek Mulai</label>
                  <input
                    type="time"
                    value={docStartTime}
                    onChange={(e) => setDocStartTime(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-medical-border"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Jam Praktek Selesai</label>
                  <input
                    type="time"
                    value={docEndTime}
                    onChange={(e) => setDocEndTime(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-medical-border"
                  />
                </div>
              </div>

              {/* Practice Days checkboxes */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block font-semibold mb-1.5">Hari Praktek Dokter:</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => {
                    const isChecked = docPracticeDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setDocPracticeDays(docPracticeDays.filter((d) => d !== day));
                          } else {
                            setDocPracticeDays([...docPracticeDays, day]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          isChecked
                            ? 'bg-medical-primary text-white border-medical-primary'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Polyclinics */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block font-semibold mb-1.5">
                  Tugaskan ke Poliklinik / Layanan:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {serviceList.map((srv) => {
                    const isAssigned = docAssignedServices.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDocAssignedServices([...docAssignedServices, srv.id]);
                            } else {
                              setDocAssignedServices(docAssignedServices.filter((id) => id !== srv.id));
                            }
                          }}
                          className="rounded text-medical-primary focus:ring-medical-primary"
                        />
                        <span className="text-[11px] font-medium text-gray-700">{srv.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-medical-border">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-medical-primary text-white rounded-xl font-bold"
                >
                  Simpan Dokter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: EDIT DOCTOR */}
      {/* ------------------------------------------------------------------ */}
      {showEditDoctorModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-medical-border shadow-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-medical-text">
              Edit Data: {showEditDoctorModal.full_name}
            </h3>
            <form onSubmit={handleUpdateDoctor} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={showEditDoctorModal.full_name}
                  onChange={(e) =>
                    setShowEditDoctorModal({ ...showEditDoctorModal, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-medical-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Spesialisasi</label>
                  <input
                    type="text"
                    value={showEditDoctorModal.specialization || ''}
                    onChange={(e) =>
                      setShowEditDoctorModal({
                        ...showEditDoctorModal,
                        specialization: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-medical-border"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    value={showEditDoctorModal.phone || ''}
                    onChange={(e) =>
                      setShowEditDoctorModal({ ...showEditDoctorModal, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-medical-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Jam Praktek Mulai</label>
                  <input
                    type="time"
                    value={showEditDoctorModal.practice_start_time || '08:00'}
                    onChange={(e) =>
                      setShowEditDoctorModal({
                        ...showEditDoctorModal,
                        practice_start_time: e.target.value,
                      })
                    }
                    className="w-full px-2 py-2 rounded-xl border border-medical-border"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Jam Praktek Selesai</label>
                  <input
                    type="time"
                    value={showEditDoctorModal.practice_end_time || '17:00'}
                    onChange={(e) =>
                      setShowEditDoctorModal({
                        ...showEditDoctorModal,
                        practice_end_time: e.target.value,
                      })
                    }
                    className="w-full px-2 py-2 rounded-xl border border-medical-border"
                  />
                </div>
              </div>

              {/* Practice days */}
              <div>
                <label className="block font-semibold mb-1.5">Hari Praktek:</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => {
                    const days = showEditDoctorModal.practice_days || [];
                    const isChecked = days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const newDays = isChecked
                            ? days.filter((d) => d !== day)
                            : [...days, day];
                          setShowEditDoctorModal({
                            ...showEditDoctorModal,
                            practice_days: newDays,
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          isChecked
                            ? 'bg-medical-primary text-white border-medical-primary'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Polyclinics */}
              <div>
                <label className="block font-semibold mb-1.5">Poliklinik yang Ditugaskan:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {serviceList.map((srv) => {
                    const assigned = showEditDoctorModal.assigned_service_ids || [];
                    const isAssigned = assigned.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={(e) => {
                            const newAssigned = e.target.checked
                              ? [...assigned, srv.id]
                              : assigned.filter((id) => id !== srv.id);
                            setShowEditDoctorModal({
                              ...showEditDoctorModal,
                              assigned_service_ids: newAssigned,
                            });
                          }}
                          className="rounded text-medical-primary"
                        />
                        <span className="text-[11px] font-medium text-gray-700">{srv.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-medical-border">
                <button
                  type="button"
                  onClick={() => setShowEditDoctorModal(null)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-medical-primary text-white rounded-xl font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: ADD SERVICE */}
      {/* ------------------------------------------------------------------ */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-medical-border shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-medical-text">Tambah Poliklinik / Layanan Baru</h3>
            <form onSubmit={handleAddService} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nama Layanan / Poliklinik *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Poli Mata / Fisioterapi / USG 4D"
                  value={srvName}
                  onChange={(e) => setSrvName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border outline-none focus:ring-2 focus:ring-medical-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Durasi Konsultasi (Menit)</label>
                  <input
                    type="number"
                    required
                    min={10}
                    step={5}
                    value={srvDuration}
                    onChange={(e) => setSrvDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border outline-none focus:ring-2 focus:ring-medical-accent"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tarif Konsultasi (Rp)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10000}
                    value={srvPrice}
                    onChange={(e) => setSrvPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border outline-none focus:ring-2 focus:ring-medical-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Deskripsi Ringkas Layanan</label>
                <textarea
                  rows={3}
                  placeholder="Pemeriksaan dan tindakan..."
                  value={srvDesc}
                  onChange={(e) => setSrvDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border outline-none focus:ring-2 focus:ring-medical-accent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 bg-medical-accent text-white rounded-xl font-bold">
                  Simpan Layanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: EDIT SERVICE */}
      {/* ------------------------------------------------------------------ */}
      {showEditServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-medical-border shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-medical-text">Edit Poliklinik: {showEditServiceModal.name}</h3>
            <form onSubmit={handleUpdateService} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Nama Layanan / Poliklinik</label>
                <input
                  type="text"
                  required
                  value={showEditServiceModal.name}
                  onChange={(e) =>
                    setShowEditServiceModal({ ...showEditServiceModal, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-medical-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Durasi Tindakan (Menit)</label>
                  <input
                    type="number"
                    min={10}
                    step={5}
                    value={showEditServiceModal.duration_minutes}
                    onChange={(e) =>
                      setShowEditServiceModal({
                        ...showEditServiceModal,
                        duration_minutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-medical-border"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tarif Konsultasi (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={showEditServiceModal.price}
                    onChange={(e) =>
                      setShowEditServiceModal({
                        ...showEditServiceModal,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-medical-border"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Deskripsi Layanan</label>
                <textarea
                  rows={3}
                  value={showEditServiceModal.description || ''}
                  onChange={(e) =>
                    setShowEditServiceModal({
                      ...showEditServiceModal,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-medical-border"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditServiceModal(null)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 bg-medical-accent text-white rounded-xl font-bold">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: WALK-IN APPOINTMENT */}
      {/* ------------------------------------------------------------------ */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-medical-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-medical-primary text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Pendaftaran Pasien Walk-in / IGD</h3>
                <span className="text-xs text-white/80">Input langsung oleh petugas resepsionis RS</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="text-white hover:text-gray-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-medical-text mb-1">Nama Pasien *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Pasien"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-medical-text mb-1">Nomor WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="081234567890"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-medical-text mb-1">Poliklinik / Layanan</label>
                  <select
                    value={walkInServiceId}
                    onChange={(e) => setWalkInServiceId(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none bg-white"
                  >
                    {serviceList
                      .filter((s) => s.is_active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-medical-text mb-1">Dokter</label>
                  <select
                    value={walkInDoctorId}
                    onChange={(e) => setWalkInDoctorId(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none bg-white"
                  >
                    {doctors
                      .filter((d) => d.role === 'doctor' && d.is_active)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-medical-text mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={walkInDate}
                    onChange={(e) => setWalkInDate(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-medical-text mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={walkInStartTime}
                    onChange={(e) => setWalkInStartTime(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-medical-text mb-1">Keluhan Pasien</label>
                <input
                  type="text"
                  placeholder="Keluhan singkat saat registrasi di meja faskes"
                  value={walkInComplaint}
                  onChange={(e) => setWalkInComplaint(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-medical-primary outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-medical-border">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 rounded-xl text-medical-muted border border-medical-border font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkIn}
                  className="px-5 py-2 rounded-xl font-bold bg-medical-primary text-white hover:bg-medical-primaryDark transition-all"
                >
                  {isSubmittingWalkIn ? 'Mendaftarkan...' : 'Daftarkan Pasien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: BLOCK-OUT SCHEDULE */}
      {/* ------------------------------------------------------------------ */}
      {showBlockOutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-medical-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Blokir Jadwal Dokter (Block-out)</h3>
                <span className="text-xs text-white/80">Operasi Cito / Cuti / Rapat Mutu Rumah Sakit</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockOutModal(false)}
                className="text-white hover:text-gray-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBlockOutSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-medical-text mb-1">Pilih Dokter</label>
                <select
                  value={blockDoctorId}
                  onChange={(e) => setBlockDoctorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                >
                  {doctors
                    .filter((d) => d.role === 'doctor')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.specialization})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-medical-text mb-1">Tanggal Blokir</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-medical-text mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-medical-text mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-medical-text mb-1">Alasan Penutupan Slot</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Operasi Darurat Cito / Seminar Medis"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-medical-border focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-medical-border">
                <button
                  type="button"
                  onClick={() => setShowBlockOutModal(false)}
                  className="px-4 py-2 rounded-xl text-medical-muted border border-medical-border font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBlock}
                  className="px-5 py-2 rounded-xl font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all"
                >
                  {isSubmittingBlock ? 'Menyimpan...' : 'Simpan Blokir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
