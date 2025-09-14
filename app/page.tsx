import React from 'react';

import type { Metadata } from 'next';
import { Caveat } from 'next/font/google';

import { BentoCardsSection } from '@/components/home/bento-cards-section';
import { CTASection } from '@/components/home/cta-section';
import { FAQSection } from '@/components/home/faq-section';
import { FeaturesSection } from '@/components/home/features-section';
import { Footer } from '@/components/home/footer';
import { HeroSection } from '@/components/home/hero-section';
import { Navbar } from '@/components/home/navbar';

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
});

export const metadata: Metadata = {
  title: 'September - Communication Assistant',
  description:
    'A communication assistant for people with ALS, MND, or other speech & motor difficulties.',
  openGraph: {
    title: 'September - Communication Assistant',
    description:
      'A communication assistant for people with ALS, MND, or other speech & motor difficulties.',
    url: 'https://september-one.vercel.app',
    siteName: 'September - Communication Assistant',
    // images: [
    //   {
    //     url: '/og',
    //     width: 1200,
    //     height: 630,
    //   },
    // ],
    locale: 'en_US',
    type: 'website',
  },
  metadataBase: new URL('https://september.raviatluri.in'),
};

export default function Home() {
  return (
    <main className="bg-stone-100 min-h-screen">
      <Navbar />
      <HeroSection caveat={caveat} />
      <FeaturesSection />
      {/* <HighlightCards /> */}
      <BentoCardsSection />
      <CTASection />
      <FAQSection />
      <Footer />
    </main>
  );
}
