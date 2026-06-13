import type { ReactNode } from 'react';

import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router';

import { Toaster } from '@/packages/ui/components/sonner';

import appCss from '@/styles/globals.css?url';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/700.css';

function NotFound() {
  return (
    <main className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base font-semibold text-indigo-600">404</p>
        <h1 className="mt-4 text-balance text-5xl font-semibold tracking-tight text-zinc-900 sm:text-7xl">
          Page not found
        </h1>
        <p className="mt-6 text-pretty text-lg font-medium text-zinc-500 sm:text-xl/8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            to="/"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Go back home
          </Link>
          <a href="mailto:support@example.com" className="text-sm font-semibold text-zinc-900">
            Contact support <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </main>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full bg-zinc-100">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased h-full">
        {children}
        <Toaster position="top-center" closeButton duration={15000} />
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'September - Communication Assistant' },
      {
        name: 'description',
        content:
          'September is a communication assistant for people living with neurodegenerative conditions like ALS, MND, or other speech & motor difficulties.',
      },
      { property: 'og:title', content: 'September - Communication Assistant' },
      {
        property: 'og:description',
        content:
          'September is a communication assistant for people living with neurodegenerative conditions like ALS, MND, or other speech & motor difficulties.',
      },
      { property: 'og:url', content: 'https://september.to' },
      { property: 'og:site_name', content: 'September - Communication Assistant' },
      { property: 'og:locale', content: 'en-US' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:title', content: 'September - Communication Assistant' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'robots', content: 'index, follow' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
    scripts: [
      {
        src: 'https://cloud.umami.is/script.js',
        defer: true,
        'data-website-id': '2d4c0126-840c-4397-9ccb-4d618d7df1ce',
        crossOrigin: 'anonymous',
      },
    ],
  }),
  notFoundComponent: NotFound,
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
});
