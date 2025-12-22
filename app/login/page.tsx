'use client';

import { Suspense } from 'react';

import { ClientProviders } from '@/components/context/client-providers';
import LoginForm from './form';

export default function LoginPage() {
  return (
    <ClientProviders>
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </ClientProviders>
  );
}
