import { Caveat } from 'next/font/google';
import Image from 'next/image';

import clsx from 'clsx';

import Layout from '@/components/layout';
import faqs from '@/data/home-faqs.json';

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
});

const footerNavigation = [
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
];

export const metadata = {
  openGraph: {
    title: 'September - Communication Assistant',
    description:
      'A communication assistant for people with ALS, MND, or other speech & motor difficulties.',
    url: 'https://september.raviatluri.in',
    siteName: 'September',
    images: [
      {
        url: '/og',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  metadataBase: new URL('https://september.raviatluri.in'),
};

function Header() {
  return (
    <div className="text-center">
      <div className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-600 mb-8">
        COMMUNICATION ASSISTANT
      </div>
      <h1 className="text-4xl sm:text-6xl font-bold mb-4 text-white">
        <span className={`${caveat.className} text-5xl sm:text-7xl text-amber-300 pr-4`}>
          Faster
        </span>
        Communication
        <br />
        Fewer
        <span className={`${caveat.className} text-5xl sm:text-7xl text-amber-300`}>
          Keystrokes
        </span>
      </h1>
      <p className="text-indigo-50">
        A communication assistant for people living with neurodegenerative conditions like ALS, MND,
        or other speech & motor difficulties.
      </p>
    </div>
  );
}

function DemoVideo() {
  return (
    <div className="mt-2 max-w-6xl mx-auto rounded-lg overflow-hidden shadow-lg">
      <Image src="/app.jpeg" alt="Demo" width={1000} height={1000} className="w-full" />
    </div>
  );
}

function FeatureSection({
  title,
  description,
  videoSrc,
  imageSrc,
  isReversed,
}: {
  title: string;
  description: string;
  videoSrc?: string;
  imageSrc?: string;
  isReversed?: boolean;
}) {
  const contentOrder = isReversed ? 'md:flex-row-reverse' : 'md:flex-row';
  const hasMedia = videoSrc || imageSrc;
  return (
    <div className={`flex flex-col ${contentOrder} gap-8 items-center`}>
      {hasMedia && (
        <div className="md:w-1/2 rounded-lg overflow-hidden">
          {videoSrc && (
            <video autoPlay loop muted playsInline className="w-full">
              <source src={videoSrc} type="video/mp4" />
            </video>
          )}
          {imageSrc && (
            <Image src={imageSrc} alt={title} width={500} height={500} className="shadow-lg" />
          )}
        </div>
      )}
      <div className={clsx(hasMedia ? 'md:w-1/2' : '')}>
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <p className="text-zinc-600">{description}</p>
      </div>
    </div>
  );
}

function Features() {
  return (
    <div className="py-16">
      <h2 className="text-3xl font-bold text-center mb-4">Key Features</h2>
      <p className="text-zinc-600 text-center mb-12">
        Empowering communication through innovative technology.
      </p>

      <div className="space-y-12">
        <FeatureSection
          title="Voice Cloning"
          description="Clone your voice with just 30 seconds of audio, or create a new voice instantly using 10 sample sentences. Preserve your unique voice identity even as speech becomes challenging."
        />

        <div className="my-12 border-b border-zinc-200"></div>

        <FeatureSection
          title="Real-Time Text-to-Speech"
          description="Engage in natural conversations, express emotions, and be heard. Perfect for storytelling to your kids or giving presentations at work - don't let dysphasia hold you back."
          isReversed
        />

        <div className="my-12 border-b border-zinc-200"></div>

        <FeatureSection
          title="Smart Autocomplete & Transcription"
          description="Boost your typing efficiency with context-aware suggestions and auto-generated responses. Follow conversations easily with automatic transcription."
          imageSrc="/smart-features-demo.png"
        />

        <div className="my-12 border-b border-zinc-200"></div>

        <FeatureSection
          title="Adaptive Keyboard Layouts"
          description="Choose from innovative keyboard designs including AAC (Augmentative and Alternative Communication) and unique circular layouts optimized for eye-gaze input."
          imageSrc="/keyboards-demo.png"
          isReversed
        />
      </div>
    </div>
  );
}

function FAQ() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24 lg:px-8">
      <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
      <dl className="space-y-8">
        {faqs.map(faq => (
          <div key={faq.id} className="border-b border-zinc-200 pb-8 last:border-b-0">
            <dt className="text-lg font-semibold text-zinc-900 mb-4">{faq.question}</dt>
            <dd className="text-base text-zinc-600">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-zinc-700 text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <h3 className="text-lg font-semibold mb-6">September</h3>
          <p className="text-zinc-400 text-sm mb-8 max-w-2xl">
            A communication assistant for people with speech and motor difficulties.
          </p>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8">
            {footerNavigation.map(item => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm leading-6 text-zinc-400 hover:text-white transition-colors"
              >
                {item.name}
              </a>
            ))}
          </div>

          <div className="flex space-x-6 mb-8">
            <a
              href="https://github.com/sonnes/september"
              target="_blank"
              className="text-zinc-400 hover:text-white"
            >
              <span className="sr-only">GitHub</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-8 text-center">
          <p className="text-sm leading-5 text-zinc-400">
            &copy; {new Date().getFullYear()} September. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default async function Home() {
  return (
    <Layout>
      <Layout.Header>
        <Header />
      </Layout.Header>

      <Layout.Content>
        <DemoVideo />
        <Features />
        <FAQ />
      </Layout.Content>

      <Layout.Footer>
        <Footer />
      </Layout.Footer>
    </Layout>
  );
}
