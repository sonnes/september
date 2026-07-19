import { createFileRoute } from '@tanstack/react-router';

import { SpeechProvider } from '@/packages/speech';

import { AboutSection } from '@/components/home/about-section';
import { ClientProviders } from '@/components/context/client-providers';
import { EnhancedCTASection } from '@/components/home/enhanced-cta-section';
import { Footer } from '@/components/home/footer';
import { HeroSection } from '@/components/home/hero-section';
import { LiveDemoSection } from '@/components/home/live-demo-section';
import { NotesSection } from '@/components/home/notes-section';
import { PhraseCodesSection } from '@/components/home/phrase-codes-section';
import { PrivacySection } from '@/components/home/privacy-section';
import { ReelsSection } from '@/components/home/reels-section';
import { SetupChoicesSection } from '@/components/home/setup-choices-section';
import { SpacesSection } from '@/components/home/spaces-section';
import { VoiceSection } from '@/components/home/voice-section';

export const Route = createFileRoute('/')({
  component: Home,
});

// Section order: the product's job first (Talk), then the fewer-keystrokes
// multipliers (codes, spaces), identity (voice), long-form (notes → reels),
// trust (privacy), choice (setup), then the ask.
function Home() {
  return (
    <ClientProviders>
      <SpeechProvider>
        <main className="bg-white min-h-screen">
          <HeroSection />
          <LiveDemoSection />
          <PhraseCodesSection />
          <SpacesSection />
          <VoiceSection />
          <NotesSection />
          <ReelsSection />
          <AboutSection />
          <PrivacySection />
          <SetupChoicesSection />
          <EnhancedCTASection />
        </main>
        <Footer />
      </SpeechProvider>
    </ClientProviders>
  );
}
