import { type NextRequest } from 'next/server';

import { updateSession } from '@/supabase/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Protect /api/* routes
    '/api/:path*',
    // Protect all (app) group routes
    '/talk',
    '/stories',
    '/stories/:path*',
    '/account',
  ],
};
