import { createFileRoute } from '@tanstack/react-router';

import { ClientProviders } from '@/components/context/client-providers';
import { EnhancedCTASection } from '@/components/home/enhanced-cta-section';
import { FeaturesSection } from '@/components/home/features-section';
import { Footer } from '@/components/home/footer';
import { HeroSection } from '@/components/home/hero-section';
import { HowItWorksSection } from '@/components/home/how-it-works-section';
import { LiveDemoSection } from '@/components/home/live-demo-section';
import { SetupChoicesSection } from '@/components/home/setup-choices-section';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <ClientProviders>
      <main className="bg-white min-h-screen">
        <HeroSection />
        <LiveDemoSection />
        <FeaturesSection />
        <HowItWorksSection />
        <SetupChoicesSection />
        <EnhancedCTASection />
      </main>
      <Footer />
    </ClientProviders>
  );
}
