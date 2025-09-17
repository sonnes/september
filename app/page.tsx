import React from 'react';

import type { Metadata } from 'next';

import { EnhancedCTASection } from '@/components/home/enhanced-cta-section';
import { FAQSection } from '@/components/home/faq-section';
import { FeaturesSection } from '@/components/home/features-section';
import { Footer } from '@/components/home/footer';
import { HeroSection } from '@/components/home/hero-section';
import { HowItWorksSection } from '@/components/home/how-it-works-section';
import { Navbar } from '@/components/home/navbar';
import { ProblemStatementSection } from '@/components/home/problem-statement-section';
import { TechnologySection } from '@/components/home/technology-section';
import { UseCasesSection } from '@/components/home/use-cases-section';

import { AudioPlayerProvider } from '@/hooks/use-audio-player';

import { AccountProvider } from '@/services/account';
import { AudioProvider } from '@/services/audio';
import { MessagesProvider } from '@/services/messages';
import { SpeechProvider } from '@/services/speech';

export const metadata: Metadata = {
  title: 'September - Faster Communication , Fewer Keystrokes',
  description:
    'A communication assistant for people living with ALS, MND, and other speech & motor difficulties.',
  openGraph: {
    title: 'September - Your Voice, Your Way',
    description:
      'A communication assistant for people living with ALS, MND, and other speech & motor difficulties.',
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
  const provider = 'triplit';

  return (
    <AccountProvider provider={provider}>
      <MessagesProvider provider={provider}>
        <AudioProvider provider={provider}>
          <SpeechProvider>
            <AudioPlayerProvider>
              <main className="bg-white min-h-screen">
                <Navbar />
                <HeroSection />
                {/* <ProblemStatementSection /> */}
                {/* <PersonalStoryBanner /> */}
                <FeaturesSection />
                <HowItWorksSection />
                <UseCasesSection />
                <TechnologySection />
                <FAQSection />
                <EnhancedCTASection />
              </main>
              <Footer />
            </AudioPlayerProvider>
          </SpeechProvider>
        </AudioProvider>
      </MessagesProvider>
    </AccountProvider>
  );
}
