import { loginAction } from '@/actions/auth';
import { HeartPulse, Lock, ShieldCheck, Stethoscope, UserCog } from 'lucide-react';
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
          Akses khusus Dokter, Resepsionis, dan Tenaga Medis Faskes
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

          {/* Quick Demo Access Buttons (Medical Review Mode) */}
          <div className="p-4 bg-medical-subtle rounded-xl border border-medical-primary/20 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-medical-primary">
              <ShieldCheck className="w-4 h-4" /> Akses Cepat Demo (1-Click Login):
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <form action={loginAction}>
                <input type="hidden" name="quickRole" value="doctor" />
                <button
                  type="submit"
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-white border border-medical-border hover:border-medical-primary text-medical-text flex items-center justify-center gap-2 shadow-xs transition-all hover:bg-medical-subtle"
                >
                  <Stethoscope className="w-4 h-4 text-medical-primary" />
                  Masuk sbg Dokter
                </button>
              </form>

              <form action={loginAction}>
                <input type="hidden" name="quickRole" value="admin" />
                <button
                  type="submit"
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-white border border-medical-border hover:border-medical-primary text-medical-text flex items-center justify-center gap-2 shadow-xs transition-all hover:bg-medical-subtle"
                >
                  <UserCog className="w-4 h-4 text-medical-accent" />
                  Masuk sbg Admin RS
                </button>
              </form>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-medical-muted">atau masuk dengan akun</span>
            </div>
          </div>

          {/* Email Form */}
          <form action={loginAction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-medical-text mb-1">
                Email Terdaftar Staf Medis
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="admin.booking@gmail.com atau dokter@..."
                defaultValue=""
                className="w-full px-3.5 py-2.5 text-xs border border-medical-border rounded-xl focus:ring-2 focus:ring-medical-primary outline-none text-medical-text"
              />
              <span className="text-[10px] text-medical-muted mt-1 block">
                Akun Admin Terdaftar: <code className="font-mono text-medical-primary font-semibold">admin.booking@gmail.com</code> atau <code className="font-mono">admin@tempocare.clinic</code>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-medical-text mb-1">
                Kata Sandi
              </label>
              <input
                type="password"
                name="password"
                defaultValue="password123"
                className="w-full px-3 py-2 text-xs border border-medical-border rounded-xl focus:ring-2 focus:ring-medical-primary outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-medical-primary text-white hover:bg-medical-primaryDark transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" /> Masuk ke Dasbor
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-medical-muted hover:text-medical-text underline"
            >
              ← Kembali ke Halaman Reservasi Pasien
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

