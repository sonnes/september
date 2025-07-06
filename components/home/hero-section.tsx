import Image from 'next/image';
import Link from 'next/link';

import { ArrowRightIcon } from '@heroicons/react/24/outline';

export function HeroSection({ caveat }: { caveat: { className: string } }) {
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
          <Link
            href="/talk"
            className="bg-gray-900 text-white font-bold px-8 py-4 rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            Get Started <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <div className="mt-16 relative rounded-xl overflow-hidden shadow-2xl">
        <Image src="/demo/app.jpeg" alt="Demo" width={2000} height={2000} />
      </div>
    </div>
  );
}
