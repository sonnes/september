import { AboutSection } from '@/components/home/about-section';
import { EnhancedCTASection } from '@/components/home/enhanced-cta-section';
import { Footer } from '@/components/home/footer';
import { HeroSection } from '@/components/home/hero-section';
import { LiveDemoSection } from '@/components/home/live-demo-section';
import { NotesSection } from '@/components/home/notes-section';
import { PhraseCodesSection } from '@/components/home/phrase-codes-section';
import { PresentSection } from '@/components/home/present-section';
import { PrivacySection } from '@/components/home/privacy-section';
import { SetupChoicesSection } from '@/components/home/setup-choices-section';
import { SpacesSection } from '@/components/home/spaces-section';
import { VoiceSection } from '@/components/home/voice-section';

export function HomePage() {
  return (
    <>
      <main className="min-h-screen bg-white">
        <HeroSection />
        <LiveDemoSection />
        <PhraseCodesSection />
        <SpacesSection />
        <VoiceSection />
        <NotesSection />
        <PresentSection />
        <AboutSection />
        <PrivacySection />
        <SetupChoicesSection />
        <EnhancedCTASection />
      </main>
      <Footer />
    </>
  );
}
