import { Caveat, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';

import clsx from 'clsx';

import faqs from '@/data/home-faqs.json';

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
});

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

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="September Logo" width={40} height={40} className="mr-2" />
            <span className="text-2xl font-bold">september</span>
          </Link>
        </div>

        <div className="flex items-center">
          <div className="flex items-center space-x-6 font-semibold">
            <Link href="/about" className="text-gray-700 hover:text-gray-900">
              About
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-gray-900">
              Contact
            </Link>
            <Link
              href="/login"
              className="bg-gray-900 text-white font-bold px-6 py-2 rounded-xl hover:bg-gray-800 transition-colors ml-2"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold mb-8">
          <span className={`${caveat.className} text-5xl md:text-7xl text-amber-500`}>Faster</span>{' '}
          Communication
          <br />
          <span className={`${caveat.className} text-5xl md:text-7xl text-amber-500`}>
            Fewer
          </span>{' '}
          Keystrokes
        </h1>

        <p className="text-lg max-w-3xl mx-auto">
          A communication assistant for people living with neurodegenerative conditions like ALS,
          MND, or other speech & motor difficulties.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
          <Link href="/app" className="bg-gray-900 text-white font-bold px-8 py-4 rounded-xl">
            Get Started
          </Link>
        </div>
      </div>

      <div className="mt-16 relative rounded-xl overflow-hidden shadow-2xl">
        <Image src="/demo/app.jpeg" alt="Demo" width={2000} height={2000} />
      </div>
    </div>
  );
}

function HighlightCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className={`rounded-xl py-6 px-8 flex space-x-4 items-center shadow-sm`}>
      <div className={`bg-gray-100 p-3 rounded-xl flex-shrink-0`}>{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
      </div>
    </div>
  );
}

function HighlightCards() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="max-w-5xl mx-auto text-4xl md:text-5xl font-bold text-center mb-6">
        Clone your own voice &amp; start speaking in{' '}
        <span className="text-amber-500">15 minutes</span>. <br /> No downloads. No installations.
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <HighlightCard
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
          title="Upload a note from your doctor"
        />

        <HighlightCard
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          }
          title="Clone your voice by speaking a few sentences"
        />

        <HighlightCard
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          }
          title="Talk, shout, whisper, or sing in your own voice"
        />
      </div>
    </div>
  );
}

function FeaturesSection() {
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
          <Image
            src="/demo/voices.png"
            alt="Voice Selection"
            width={500}
            height={500}
            className="rounded-xl border-2 border-gray-200 shadow-lg"
          />
        }
        reverse
      />
    </div>
  );
}

const FeatureCard = ({
  title,
  description,
  link,
  href,
  media,
  reverse = false,
}: {
  title: string;
  description: string;
  link?: string;
  href?: string;
  media?: React.ReactNode;
  reverse?: boolean;
}) => {
  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col md:flex-row items-center gap-12 ${reverse ? 'md:flex-row-reverse' : ''}`}
        >
          <div className="md:w-1/2">
            <h2 className="text-4xl font-bold mb-6">{title}</h2>
            <p className="text-lg mb-6">{description}</p>
            {link && href && (
              <Link
                href={href}
                className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {link}
              </Link>
            )}
          </div>
          {media && (
            <div className="md:w-1/2">
              <div className="relative">{media}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function BentoCardsSection() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center mb-16">
        <p className="text-lg font-medium mb-2">The Details</p>
        <h2 className="text-4xl md:text-5xl font-bold max-w-4xl mx-auto">
          We're making communication easier for everyone
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main large card - spans full width on mobile, left column on desktop */}
        <div className="bg-blue-100 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center md:col-span-2">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h3 className="text-2xl font-bold mb-4">Multiple keyboard layouts that work for you</h3>
            <Link
              href="/learn-more"
              className="inline-flex items-center px-6 py-3 border border-gray-800 rounded-xl text-base font-medium text-gray-800 hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              Find out more
            </Link>
          </div>
          <div className="md:w-1/2 md:pl-12">
            <Image
              src="/demo/circular.png"
              alt="Keyboard layouts"
              width={500}
              height={500}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Bottom left card */}
        <div className="bg-emerald-100 rounded-3xl p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-4">Speak in your language</h3>
            <Link
              href="/contact"
              className="inline-flex items-center px-6 py-3 border border-gray-800 rounded-xl text-base font-medium text-gray-800 hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              Find out more
            </Link>
          </div>
          <div className="mt-8 flex justify-end">
            <Image
              src="/demo/language.png"
              alt="Languages"
              width={200}
              height={200}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Bottom right card */}
        <div className="bg-amber-100 rounded-3xl p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-4">Subscribe to our newsletter!</h3>
            <Link
              href="/subscribe"
              className="inline-flex items-center px-6 py-3 border border-gray-800 rounded-xl text-base font-medium text-gray-800 hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              Subscribe
            </Link>
          </div>
          <div className="mt-8 flex justify-end">
            <Image
              src="/demo/newsletter.png"
              alt="Newsletter"
              width={200}
              height={200}
              className="rounded-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const navigation = {
  main: [
    { name: 'About', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Privacy Policy', href: '#' },
    { name: 'Terms of Service', href: '#' },
    { name: 'Contact', href: '#' },
    { name: 'Partners', href: '#' },
  ],
  social: [
    {
      name: 'Instagram',
      href: '#',
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: 'GitHub',
      href: '#',
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      href: '#',
      icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ],
};

function Footer() {
  return (
    <>
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-12">Ready to use september?</h2>
          <Link
            href="/start"
            className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors"
          >
            Get started for free
          </Link>
        </div>
      </div>

      <div className="border-t border-gray-200"></div>
      <footer className="bg-gray-100">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-20 sm:py-24 lg:px-8">
          <nav
            aria-label="Footer"
            className="-mb-6 flex flex-wrap justify-center gap-x-12 gap-y-3 text-sm/6"
          >
            {navigation.main.map(item => (
              <a key={item.name} href={item.href} className="text-gray-600 hover:text-gray-900">
                {item.name}
              </a>
            ))}
          </nav>
          <div className="mt-16 flex justify-center gap-x-10">
            {navigation.social.map(item => (
              <a key={item.name} href={item.href} className="text-gray-600 hover:text-gray-800">
                <span className="sr-only">{item.name}</span>
                <item.icon aria-hidden="true" className="size-6" />
              </a>
            ))}
          </div>
          <p className="mt-10 text-center text-sm/6 text-gray-600">
            &copy; 2024-{new Date().getFullYear()} September. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

export default function Home() {
  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <HeroSection />
      <HighlightCards />
      <FeaturesSection />
      <BentoCardsSection />
      <Footer />
    </main>
  );
}
