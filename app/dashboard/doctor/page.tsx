import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import DoctorQueueView from '@/components/shared/DoctorQueueView';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function DoctorDashboardPage() {
  const cookieStore = cookies();
  const staffId = cookieStore.get('tempocare_staff_id')?.value;

  const [staffList, services, clinicSettings] = await Promise.all([
    db.getStaffList(),
    db.getServices(),
    db.getClinicSettings(),
  ]);

  // Find current logged-in staff or fallback to first doctor in list
  let currentDoctor = staffList.find((s) => s.id === staffId || s.user_id === staffId);
  if (!currentDoctor) {
    currentDoctor = staffList.find((s) => s.role === 'doctor') || staffList[0];
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  // Dokter melihat jadwal miliknya sendiri; Tenaga Medis (nurse/receptionist) melihat jadwal pelayanan klinik
  const appointments = await db.getAppointments(
    currentDoctor.role === 'doctor' ? { staffId: currentDoctor.id } : undefined
  );

  return (
    <DoctorQueueView
      doctor={currentDoctor}
      initialAppointments={appointments}
      selectedDate={todayStr}
      services={services}
      staffList={staffList}
      clinicName={clinicSettings.name}
    />
  );
}

