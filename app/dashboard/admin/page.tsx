import { db } from '@/lib/db';
import AdminDashboardView from '@/components/shared/AdminDashboardView';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [appointments, staffList, services, blockOuts, clinicSettings] = await Promise.all([
    db.getAppointments(),
    db.getStaffList(),
    db.getServices(),
    db.getBlockOuts(),
    db.getClinicSettings(),
  ]);

  return (
    <AdminDashboardView
      initialAppointments={appointments}
      staffList={staffList}
      services={services}
      blockOuts={blockOuts}
      clinicSettings={clinicSettings}
    />
  );
}
