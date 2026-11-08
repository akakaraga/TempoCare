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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo - Clean, Professional & Non-wrapping */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-medical-primary flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-medical-primary leading-tight">
              Tempo<span className="text-medical-primary">Care</span>
            </span>
            <span className="text-xs font-semibold text-medical-muted tracking-tight leading-tight mt-0.5">
            </span>
          </div>
        </Link>

        {/* Right Actions: Simple, Clear & Helpful */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/#cek-jadwal"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-medical-text hover:bg-medical-subtle transition-colors border border-medical-border"
          >
            <CalendarCheck className="w-4 h-4 text-medical-primary shrink-0" />
            <span className="hidden xs:inline">Cek Jadwal</span>
            <span className="xs:hidden">Cek</span>
          </a>

          <a
            href="/#booking"
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-medical-accent text-white hover:bg-medical-accentHover shadow-sm transition-all hover:shadow active:scale-95"
          >
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span>Daftar Sekarang</span>
          </a>
        </div>
      </div>
    </header>
  );
}
