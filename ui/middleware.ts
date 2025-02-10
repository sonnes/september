import { type NextRequest } from 'next/server';

import { updateSession } from '@/supabase/server';

export async function middleware(request: NextRequest) {
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
