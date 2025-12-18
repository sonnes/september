import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';

import { AccountProvider } from '@/components/account';
import { AudioPlayerProvider } from '@/components/audio/audio-player';
import { AISettingsProvider } from '@/components/settings';

import './globals.css';

const notoSans = Noto_Sans({
  variable: '--font-noto-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'September - Communication Assistant',
    template: '%s | September - Communication Assistant',
  },
  description:
    'September is a communication assistant for people living with neurodegenerative conditions like ALS, MND, or other speech & motor difficulties.',
  openGraph: {
    title: 'September - Communication Assistant',
    description:
      'September is a communication assistant for people living with neurodegenerative conditions like ALS, MND, or other speech & motor difficulties.',
    url: 'https://september.to',
    siteName: 'September - Communication Assistant',
    // images: [
    //   {
    //     url: 'https://september.to/og.png',
    //     width: 1920,
    //     height: 1080,
    //   },
    // ],
    locale: 'en-US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  twitter: {
    title: 'September - Communication Assistant',
    card: 'summary_large_image',
  },
  icons: {
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-zinc-100">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="2d4c0126-840c-4397-9ccb-4d618d7df1ce"
        ></script>
      </head>
      <body className={`${notoSans.className} antialiased h-full`}>
        <AccountProvider>
          <AISettingsProvider>
            <AudioPlayerProvider>
              {children}
              <Toaster position="top-center" closeButton duration={15000} />
            </AudioPlayerProvider>
          </AISettingsProvider>
        </AccountProvider>
      </body>
    </html>
  );
}
