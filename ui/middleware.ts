import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/supabase/server';

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next({ request });
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Protect /app/* routes
    '/app/:path*',
    // Protect /api/* routes
    '/api/:path*',
  ],
};
