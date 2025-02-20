import { Caveat } from 'next/font/google';
import Image from 'next/image';

import {
  DocumentTextIcon,
  MicrophoneIcon,
  SparklesIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';

import Layout from '@/components/layout';

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
});

const faqs = [
  {
    id: 1,
    question: 'How does voice cloning work?',
    answer:
      'Our voice cloning technology requires just 30 seconds of your voice to create a digital replica. Alternatively, you can create a new voice by reading 10 sample sentences. The process uses advanced AI to preserve your unique voice characteristics.',
  },
  {
    id: 2,
    question: 'Is my voice data secure?',
    answer:
      'Yes, we take privacy seriously. Your voice data is encrypted, stored securely, and never shared with third parties. You have complete control over your voice model and can delete it at any time.',
  },
  {
    id: 3,
    question: 'What devices are supported?',
    answer:
      'September works on any modern web browser across desktop and mobile devices. We also support various input methods including touch, keyboard, mouse, and eye-tracking devices.',
  },
  {
    id: 4,
    question: 'Can I use this for professional presentations?',
    answer:
      'Absolutely! Many of our users successfully use September for work presentations, meetings, and professional communication. The real-time text-to-speech and natural voice quality make it perfect for professional settings.',
  },
];

const footerNavigation = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'Voice Cloning', href: '#voice-cloning' },
    { name: 'Keyboards', href: '#keyboards' },
    { name: 'FAQ', href: '#faq' },
  ],
  support: [
    { name: 'Documentation', href: '/docs' },
    { name: 'Community', href: '/community' },
    { name: 'Contact', href: '/contact' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
  ],
};

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
      {/* Desktop video */}
      <video autoPlay muted playsInline className="w-full hidden md:block">
        <source src="/demo.mp4" type="video/mp4" />
      </video>
      {/* Mobile video */}
      <video autoPlay muted playsInline className="w-full md:hidden">
        <source src="/demo-mobile.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

function FeatureSection({
  title,
  description,
  videoSrc,
  isReversed,
}: {
  title: string;
  description: string;
  videoSrc: string;
  isReversed?: boolean;
}) {
  const contentOrder = isReversed ? 'md:flex-row-reverse' : 'md:flex-row';

  return (
    <div className={`flex flex-col ${contentOrder} gap-8 items-center`}>
      <div className="md:w-2/3 rounded-lg overflow-hidden">
        <video autoPlay loop muted playsInline className="w-full">
          <source src={videoSrc} type="video/mp4" />
        </video>
      </div>
      <div className="md:w-1/3">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function Features() {
  return (
    <div className="py-16">
      <h2 className="text-3xl font-bold text-center mb-4">Key Features</h2>
      <p className="text-gray-600 text-center mb-12">
        Empowering communication through innovative technology.
      </p>

      <div className="space-y-12">
        <FeatureSection
          title="Voice Cloning"
          description="Clone your voice with just 30 seconds of audio, or create a new voice instantly using 10 sample sentences. Preserve your unique voice identity even as speech becomes challenging."
          videoSrc="/voice-cloning-demo.mp4"
        />

        <FeatureSection
          title="Real-Time Text-to-Speech"
          description="Engage in natural conversations, express emotions, and be heard. Perfect for storytelling to your kids or giving presentations at work - don't let dysphasia hold you back."
          videoSrc="/tts-demo.mp4"
          isReversed
        />

        <FeatureSection
          title="Smart Autocomplete & Transcription"
          description="Boost your typing efficiency with context-aware suggestions and auto-generated responses. Follow conversations easily with automatic transcription."
          videoSrc="/smart-features-demo.mp4"
        />

        <FeatureSection
          title="Adaptive Keyboard Layouts"
          description="Choose from innovative keyboard designs including AAC (Augmentative and Alternative Communication) and unique circular layouts optimized for eye-gaze input."
          videoSrc="/keyboards-demo.mp4"
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
          <div key={faq.id} className="border-b border-gray-200 pb-8 last:border-b-0">
            <dt className="text-lg font-semibold text-gray-900 mb-4">{faq.question}</dt>
            <dd className="text-base text-gray-600">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900">Product</h3>
            <ul role="list" className="mt-6 space-y-4">
              {footerNavigation.product.map(item => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm leading-6 text-gray-600 hover:text-gray-900"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-6 text-gray-900">Support</h3>
            <ul role="list" className="mt-6 space-y-4">
              {footerNavigation.support.map(item => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm leading-6 text-gray-600 hover:text-gray-900"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-sm font-semibold leading-6 text-gray-900">Company</h3>
            <ul role="list" className="mt-6 space-y-4">
              {footerNavigation.company.map(item => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm leading-6 text-gray-600 hover:text-gray-900"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-900/10 pt-8">
          <p className="text-sm leading-5 text-gray-500">
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
