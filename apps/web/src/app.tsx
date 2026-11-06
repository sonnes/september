import { StrictMode, useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { type getRouter } from '@/router';

/**
 * The whole tree, under one roof.
 *
 * The browser entry and the prerender both render this, so the markup the
 * build writes and the markup the browser hydrates are the same markup.
 */
export function App({ router }: { router: ReturnType<typeof getRouter> }): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      })
  );

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}
