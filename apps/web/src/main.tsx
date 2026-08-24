import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/lexend/700.css';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { Toaster } from '@september/ui/components/sonner';
import { getRouter } from '@/router';

import '@/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
const router = getRouter();
const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" closeButton duration={15000} />
    </QueryClientProvider>
  </StrictMode>
);
