import { documentTitle } from '@september/core/rules/titles';

import { Footer } from '@/components/home/footer';
import { KeyboardHero } from '@/components/keyboard/keyboard-hero';
import {
  AccessSection,
  ComparisonSection,
  DownloadSection,
  FeatureSections,
  PrivacySection,
  StorySection,
} from '@/components/keyboard/keyboard-sections';

export function KeyboardPage() {
  return (
    <>
      <title>{documentTitle('September Keyboard for Mac')}</title>
      <main className="min-h-screen bg-white">
        <KeyboardHero />
        <StorySection />
        <ComparisonSection />
        <FeatureSections />
        <AccessSection />
        <PrivacySection />
        <DownloadSection />
      </main>
      <Footer />
    </>
  );
}
