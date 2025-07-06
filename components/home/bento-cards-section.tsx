import Image from 'next/image';
import Link from 'next/link';

export function BentoCardsSection() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center mb-16">
        <p className="text-lg font-medium mb-2">The Details</p>
        <h2 className="text-4xl md:text-5xl font-bold max-w-4xl mx-auto">
          We&apos;re making communication easier for everyone
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
            <div className="w-48 h-48 bg-emerald-200 rounded-xl flex items-center justify-center">
              <span className="text-emerald-600">Languages</span>
            </div>
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
            <div className="w-48 h-48 bg-amber-200 rounded-xl flex items-center justify-center">
              <span className="text-amber-600">Newsletter</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
