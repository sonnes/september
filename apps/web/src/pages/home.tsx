import { LANDING_TITLE } from '@september/core/rules/titles';

import { AboutSection } from '@/components/home/about-section';
import { AgentSection } from '@/components/home/agent-section';
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
        <LiveDemoSection />
        <AgentSection />
        <PhraseCodesSection />
        <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
          <NotesSection />
          <VoiceSection />
        </div>
        <PrivacySection />
        <AboutSection />
        <PlatformSection />
      </main>
      <Footer />
    </>
  );
}
