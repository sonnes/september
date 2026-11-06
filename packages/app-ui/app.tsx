import { StrictMode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, type AnyRouter } from "@tanstack/react-router";

import "@fontsource/lexend/700.css";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/500.css";
import "@fontsource/noto-sans/600.css";
import "@fontsource/noto-sans/700.css";

/** Both stores are on the device, so a failed read is not retried and a window focus does not refetch. */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });

/** The whole app: the fonts, the query cache, and the router. */
export function App({
  router,
  queryClient,
}: {
  router: AnyRouter;
  queryClient: QueryClient;
}): React.JSX.Element {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}
