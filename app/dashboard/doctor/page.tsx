import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import DoctorQueueView from '@/components/shared/DoctorQueueView';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function DoctorDashboardPage() {
  const cookieStore = cookies();
  const staffId = cookieStore.get('tempocare_staff_id')?.value;

  const staffList = await db.getStaffList();
  // Find doctor or fallback to first doctor in list
  let currentDoctor = staffList.find((s) => s.id === staffId);
  if (!currentDoctor) {
    currentDoctor = staffList.find((s) => s.role === 'doctor') || staffList[0];
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch appointments for this doctor
  const appointments = await db.getAppointments({
    staffId: currentDoctor.id,
  });

  return (
    <DoctorQueueView
      doctor={currentDoctor}
      initialAppointments={appointments}
      selectedDate={todayStr}
    />
  );
}

