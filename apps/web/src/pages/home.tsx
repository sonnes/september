import { LANDING_TITLE } from '@september/core/rules/titles';

import { AboutSection } from '@/components/home/about-section';
import { AgentSection } from '@/components/home/agent-section';
import { EnhancedCTASection } from '@/components/home/enhanced-cta-section';
import { Footer } from '@/components/home/footer';
import { HeroSection } from '@/components/home/hero-section';
import { LiveDemoSection } from '@/components/home/live-demo-section';
import { NotesSection } from '@/components/home/notes-section';
import { PhraseCodesSection } from '@/components/home/phrase-codes-section';
import { PlatformSection } from '@/components/home/platform-section';
import { PrivacySection } from '@/components/home/privacy-section';
import { VoiceSection } from '@/components/home/voice-section';

export function HomePage() {
  return (
    <>
      <title>{LANDING_TITLE}</title>
      <main className="min-h-screen bg-white">
        <HeroSection />
        <AboutSection />
        <LiveDemoSection />
        <div className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 lg:gap-16">
            <PhraseCodesSection />
            <AgentSection />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-20">
          <p className="mb-6 text-sm font-semibold text-indigo-600">
            For everything else you want to say
          </p>
          <NotesSection />
          <VoiceSection />
        </div>
        <PlatformSection />
        <PrivacySection />
        <EnhancedCTASection />
      </main>
      <Footer />
    </>
  );
}
