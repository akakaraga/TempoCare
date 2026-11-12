'use client';

import Link from 'next/link';
import { HeartPulse, CalendarCheck, Stethoscope } from 'lucide-react';
import { ClinicSettings } from '@/lib/types';

interface NavbarProps {
  clinicSettings?: ClinicSettings;
}

export default function Navbar({ clinicSettings }: NavbarProps) {
  const clinicName = clinicSettings?.name || 'TempoCare Clinic & Hospital';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-medical-border bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        {/* Brand Logo - Clean, Professional & Non-wrapping */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-medical-primary flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-xl font-extrabold tracking-tight text-medical-primary leading-tight whitespace-nowrap">
              Tempo<span className="text-medical-primary">Care</span>
            </span>
          </div>
        </Link>

        {/* Right Actions: Simple, Clear & Responsive */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            href="/manage"
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-medical-text hover:bg-medical-subtle transition-colors border border-medical-border whitespace-nowrap"
          >
            <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-medical-primary shrink-0" />
            <span className="sm:hidden">Cek Jadwal</span>
            <span className="hidden sm:inline">Lihat Jadwal Saya</span>
          </Link>

          <a
            href="/#booking"
            className="inline-flex items-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-medical-accent text-white hover:bg-medical-accentHover shadow-sm transition-all hover:shadow active:scale-95 whitespace-nowrap"
          >
            <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Daftar</span>
            <span className="hidden sm:inline">Daftar Sekarang</span>
          </a>
        </div>
      </div>
    </header>
  );
}
