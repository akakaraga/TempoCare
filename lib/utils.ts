import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getServicePrefix(serviceName: string): string {
  const s = (serviceName || '').toLowerCase();
  if (s.includes('anak')) return 'A';
  if (s.includes('gigi')) return 'G';
  if (s.includes('dalam')) return 'D';
  if (s.includes('umum')) return 'U';
  if (s.includes('mata')) return 'M';
  if (s.includes('tht')) return 'T';
  if (s.includes('kandungan') || s.includes('obgyn') || s.includes('kebidanan')) return 'O';
  if (s.includes('kulit')) return 'K';
  if (s.includes('saraf')) return 'S';
  if (s.includes('jantung')) return 'J';
  if (s.includes('bedah')) return 'B';

  const firstLetter = (serviceName || '').trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(firstLetter) ? firstLetter : 'P';
}

