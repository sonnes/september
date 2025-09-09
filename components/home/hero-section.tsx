import Image from 'next/image';
import Link from 'next/link';

import { ArrowRightIcon } from '@heroicons/react/24/outline';

export function HeroSection({ caveat }: { caveat: { className: string } }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      {/* Hero content with side-by-side layout */}
      <div className="flex flex-col lg:flex-row items-start gap-12 mb-16">
        <div className="lg:w-1/2">
          <h1 className="text-5xl md:text-5xl font-bold text-gray-900 mb-8">
            <span className={`${caveat.className} text-6xl md:text-6xl text-amber-500`}>
              Faster
            </span>{' '}
            Communication
            <br />
            <span className={`${caveat.className} text-6xl md:text-6xl text-amber-500`}>
              Fewer
            </span>{' '}
            Keystrokes
          </h1>
        </div>
        <div className="lg:w-1/2">
          <p className="text-xl text-gray-700 leading-relaxed">
            Introducing September, a communication assistant for people living with
            neurodegenerative conditions like ALS, MND, or other speech & motor difficulties.
          </p>
        </div>
      </div>

      {/* Video player section */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl bg-gray-100">
        <Image
          src="/demo/app.jpeg"
          alt="Demo"
          width={2000}
          height={2000}
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
