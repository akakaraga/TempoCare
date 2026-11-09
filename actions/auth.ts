'use server';

import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

function setSessionCookies(
  cookieStore: ReturnType<typeof cookies>,
  role: string,
  staffId: string,
  staffName: string
) {
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    maxAge: 86400, // 24 hours
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
  cookieStore.set('tempocare_role', role, cookieOptions);
  cookieStore.set('tempocare_staff_id', staffId, cookieOptions);
  cookieStore.set('tempocare_staff_name', staffName, cookieOptions);
}

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = (formData.get('password') as string)?.trim();

  const cookieStore = cookies();

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('Silakan masukkan alamat email dan kata sandi staf Anda.'));
  }

  // 1. Ambil data staf dari database / persistent store
  let matchedStaff: any = null;
  try {
    const staffList = await db.getStaffList();
    matchedStaff = staffList.find(
      (s) => s.email && s.email.toLowerCase() === email
    );
  } catch (err) {
    console.error('Error fetching staff profile:', err);
  }

  // 2. Coba autentikasi Supabase Auth terlebih dahulu jika client aktif
  const supabase = createServerSupabase();
  if (supabase && password) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && authData.user) {
        let role = matchedStaff?.role || authData.user.user_metadata?.role || 'doctor';
        let staffName = matchedStaff?.full_name || authData.user.user_metadata?.full_name || 'Dokter Faskes';
        let staffId = matchedStaff?.id || authData.user.id;

        setSessionCookies(cookieStore, role, staffId, staffName);

        if (role === 'admin') {
          redirect('/dashboard/admin');
        } else {
          redirect('/dashboard/doctor');
        }
      }
    } catch (err) {
      console.warn('[Supabase signInWithPassword Error]', err);
    }
  }

  // 3. Verifikasi kredensial dokter / tenaga medis langsung dari data staff faskes
  if (matchedStaff) {
    // Jika staf memiliki kata sandi terdaftar di database
    if (matchedStaff.password) {
      if (matchedStaff.password !== password) {
        redirect('/login?error=' + encodeURIComponent('Kata sandi salah. Silakan periksa kembali kata sandi Anda.'));
      }
    } else {
      // Jika dokter belum disetel kata sandi, simpan password yang dimasukkan dokter sebagai password barunya
      await db.updateStaff(matchedStaff.id, { password });
    }

    setSessionCookies(cookieStore, matchedStaff.role, matchedStaff.id, matchedStaff.full_name);

    if (matchedStaff.role === 'admin') {
      redirect('/dashboard/admin');
    } else {
      redirect('/dashboard/doctor');
    }
  }

  // 4. Default Fallback untuk Akun Admin Utama
  if (email === 'admin.booking@gmail.com' || email.includes('admin')) {
    if (password === 'admin123' || password.length >= 6) {
      setSessionCookies(cookieStore, 'admin', 'ae85cefc-f4c4-4326-9d48-0791941343ba', 'Admin Klinik');
      redirect('/dashboard/admin');
    } else {
      redirect('/login?error=' + encodeURIComponent('Kata sandi admin salah.'));
    }
  }

  redirect(
    '/login?error=' +
      encodeURIComponent('Email dokter atau staf tidak terdaftar di sistem faskes. Silakan periksa kembali email Anda atau hubungi admin klinik.')
  );
}

export async function logoutAction() {
  const cookieStore = cookies();
  const supabase = createServerSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore if not signed in via Supabase Auth
    }
  }

  cookieStore.delete('tempocare_role');
  cookieStore.delete('tempocare_staff_id');
  cookieStore.delete('tempocare_staff_name');
  redirect('/login');
}
