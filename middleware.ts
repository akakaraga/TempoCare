import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read auth token or role cookie
  const roleCookie = request.cookies.get('tempocare_role')?.value;

  // Redirect already authenticated users trying to access login page
  if (pathname === '/login' && roleCookie) {
    if (roleCookie === 'admin') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }
    if (roleCookie === 'doctor') {
      return NextResponse.redirect(new URL('/dashboard/doctor', request.url));
    }
  }

  // Protect doctor dashboard
  if (pathname.startsWith('/dashboard/doctor')) {
    if (!roleCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (roleCookie !== 'doctor' && roleCookie !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }
  }

  // Protect admin dashboard
  if (pathname.startsWith('/dashboard/admin')) {
    if (!roleCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (roleCookie !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/doctor', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
