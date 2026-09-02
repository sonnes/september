import { AboutSection } from '@/components/home/about-section';
import { AgentSection } from '@/components/home/agent-section';
import { EnhancedCTASection } from '@/components/home/enhanced-cta-section';
import { Footer } from '@/components/home/footer';
import { LANDING_TITLE } from '@september/core/rules/titles';
import { HeroSection } from '@/components/home/hero-section';
import { LiveDemoSection } from '@/components/home/live-demo-section';
import { NotesSection } from '@/components/home/notes-section';
import { PhraseCodesSection } from '@/components/home/phrase-codes-section';
import { PlatformSection } from '@/components/home/platform-section';
import { PrivacySection } from '@/components/home/privacy-section';
import { SpacesSection } from '@/components/home/spaces-section';
import { VoiceSection } from '@/components/home/voice-section';

export function HomePage() {
  return (
    <>
      {/* Proof first, then one chapter per idea: Talk is the flagship, the rest
          follow in the order someone meets them. */}
      <title>{LANDING_TITLE}</title>
      <main className="min-h-screen bg-white">
        <HeroSection />
        <LiveDemoSection />
        <PhraseCodesSection />
        <SpacesSection />
        <VoiceSection />
        <NotesSection />
        <AgentSection />
        <PlatformSection />
        <PrivacySection />
        <AboutSection />
        <EnhancedCTASection />
      </main>
      <Footer />
    </>
  );
}
