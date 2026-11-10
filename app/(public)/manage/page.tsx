import Navbar from '@/components/shared/Navbar';
import ManageAppointmentView from '@/components/shared/ManageAppointmentView';
import { db } from '@/lib/db';

export const revalidate = 0;

interface ManagePageProps {
  searchParams: { token?: string };
}

export default async function ManagePage({ searchParams }: ManagePageProps) {
  const token = searchParams.token || '';
  const appointments = token ? await db.findAppointments(token, { allowToken: true }) : [];
  const initialNotFound = Boolean(token && appointments.length === 0);

  return (
    <div className="min-h-screen flex flex-col bg-medical-bg">
      <Navbar />
      <main className="flex-1">
        <ManageAppointmentView
          initialAppointments={appointments}
          initialAppointment={appointments[0] || null}
          initialToken={token}
          initialNotFound={initialNotFound}
        />
      </main>
    </div>
  );
}

