'use client';

import { ClientProviders } from '@/components/context/client-providers';
import { EnhancedCTASection } from '@/components/home/enhanced-cta-section';
import { FAQSection } from '@/components/home/faq-section';
import { FeaturesSection } from '@/components/home/features-section';
import { Footer } from '@/components/home/footer';
import { HeroSection } from '@/components/home/hero-section';
import { HowItWorksSection } from '@/components/home/how-it-works-section';
import { TechnologySection } from '@/components/home/technology-section';
import { UseCasesSection } from '@/components/home/use-cases-section';

export default function Home() {
  return (
    <ClientProviders>
      <main className="bg-white min-h-screen">
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
    </ClientProviders>
  );
}
