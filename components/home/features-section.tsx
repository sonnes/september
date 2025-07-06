import Image from 'next/image';

import { FeatureCard } from './feature-card';

export function FeaturesSection() {
  return (
    <div className="bg-gray-50 rounded-3xl mx-4 sm:mx-8 lg:mx-12 my-16 overflow-hidden">
      <FeatureCard
        title="Type less, say more"
        description="The smart text editor automatically fills in the blanks for you. It even learns your style and provides relevant suggestions."
        media={
          <Image
            src="/demo/editor.png"
            alt="Smart Text editor"
            width={500}
            height={500}
            className="rounded-xl border-2 border-gray-200 shadow-lg"
          />
        }
      />
      <FeatureCard
        title="Wide selection of voices"
        description="Already affected by dysphasia? No problem. Use any old video/audio to clone your voice. Or find a voice most similar to you."
        href="/learn-more"
        media={
          <div className="w-full h-64 bg-gray-200 rounded-xl border-2 border-gray-300 shadow-lg flex items-center justify-center">
            <span className="text-gray-500">Voice Selection Demo</span>
          </div>
        }
        reverse
      />
    </div>
  );
}
