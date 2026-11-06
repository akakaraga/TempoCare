import { loginAction } from '@/actions/auth';
import { HeartPulse } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen bg-medical-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-medical-primary flex items-center justify-center text-white shadow-sm">
            <HeartPulse className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-medical-text">
            Tempo<span className="text-medical-primary">Care</span>
          </span>
        </Link>
        <h2 className="mt-4 text-xl sm:text-2xl font-extrabold text-medical-text">
          Portal Masuk Staf Medis & RS
        </h2>
        <p className="mt-1 text-xs text-medical-muted">
          Akses terbatas khusus Dokter, Resepsionis, dan Tenaga Medis Faskes
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-soft rounded-2xl border border-medical-border sm:px-10 space-y-6">
          {searchParams?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {searchParams.error}
            </div>
          )}

          {/* Email & Password Form */}
          <form action={loginAction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-medical-text mb-1.5">
                Alamat Email Terdaftar
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="nama@klinik.com"
                className="w-full px-3.5 py-2.5 text-xs border border-medical-border rounded-xl focus:ring-2 focus:ring-medical-primary focus:border-medical-primary outline-none text-medical-text transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-medical-text mb-1.5">
                Kata Sandi
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs border border-medical-border rounded-xl focus:ring-2 focus:ring-medical-primary focus:border-medical-primary outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-medical-primary text-white hover:bg-medical-primaryDark transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
            >
             Masuk
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-medical-muted hover:text-medical-text underline transition-colors"
            >
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

