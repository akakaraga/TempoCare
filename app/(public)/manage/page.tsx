import Navbar from '@/components/shared/Navbar';
import ManageAppointmentView from '@/components/shared/ManageAppointmentView';
import { db } from '@/lib/db';

export const revalidate = 0;

interface ManagePageProps {
  searchParams: { token?: string };
}

export default async function ManagePage({ searchParams }: ManagePageProps) {
  const token = searchParams.token || '';
  const appointment = token ? await db.getAppointmentByToken(token) : null;

  return (
    <div className="min-h-screen flex flex-col bg-medical-bg">
      <Navbar />
      <main className="flex-1">
        <ManageAppointmentView
          initialAppointment={appointment}
          initialToken={token}
        />
      </main>
    </div>
  );
}

