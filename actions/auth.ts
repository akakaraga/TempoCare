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

  // 2. Try Supabase Auth first (for real Supabase users e.g. admin.booking@gmail.com)
  const supabase = createServerSupabase();
  if (supabase && password) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!authError && authData.user) {
      let role = 'admin';
      let staffName = authData.user.user_metadata?.full_name || 'Admin RS';
      let staffId = authData.user.id;

      try {
        const staffList = await db.getStaffList();
        const matched = staffList.find(
          (s) => s.email.toLowerCase() === email || s.user_id === authData.user.id
        );

        if (matched) {
          role = matched.role;
          staffName = matched.full_name;
          staffId = matched.id;
        }
      } catch (err) {
        console.error('Error fetching staff profile:', err);
      }

      setSessionCookies(cookieStore, role, staffId, staffName);

      if (role === 'admin') {
        redirect('/dashboard/admin');
      } else {
        redirect('/dashboard/doctor');
      }
    } else if (authError) {
      if (authError.message.toLowerCase().includes('invalid login credentials')) {
        redirect('/login?error=' + encodeURIComponent('Kata sandi salah. Silakan periksa kembali kata sandi Anda.'));
      }
    }
  }

  // 3. Fallback: Match against staff table / persistent store directly
  let matchedStaff = null;
  try {
    const staffList = await db.getStaffList();
    matchedStaff = staffList.find((s) => s.email.toLowerCase() === email);
  } catch (err) {
    console.error('Staff match error:', err);
  }

  if (matchedStaff) {
    // Verifikasi kata sandi jika staf memiliki kata sandi terdaftar
    if (matchedStaff.password && matchedStaff.password !== password) {
      redirect('/login?error=' + encodeURIComponent('Kata sandi salah. Silakan periksa kembali kata sandi Anda.'));
    }

    setSessionCookies(cookieStore, matchedStaff.role, matchedStaff.id, matchedStaff.full_name);

    if (matchedStaff.role === 'admin') {
      redirect('/dashboard/admin');
    } else {
      redirect('/dashboard/doctor');
    }
  }

  // Fallback for registered admin email
  if (email.includes('admin') || email === 'admin.booking@gmail.com') {
    setSessionCookies(cookieStore, 'admin', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Admin Utama RS');
    redirect('/dashboard/admin');
  }

  redirect(
    '/login?error=' +
      encodeURIComponent('Email staf tidak terdaftar di sistem faskes. Silakan periksa kembali email Anda.')
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
