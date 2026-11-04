import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'TempoCare - Sistem Reservasi & Manajemen Jadwal Klinik / RS',
  description: 'Sistem manajemen jadwal medis MVP: Pendaftaran otomatis 24/7, anti double-booking mutlak, dan rekam jejak jadwal tenaga medis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-medical-bg text-medical-text font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

