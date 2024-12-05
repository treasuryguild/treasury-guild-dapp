// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes instead of public ones
const protectedRoutes = [
  '/dashboard',
  '/profile',
  // add other protected routes
];

export async function middleware(req: NextRequest) {
  // Only run middleware for protected routes
  if (!protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    // add other protected paths
  ]
};