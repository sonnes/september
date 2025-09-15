import Link from 'next/link';

export function EnhancedCTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-indigo-600 to-blue-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          Start Communicating with Fewer Keystrokes
        </h2>
        <p className="text-xl text-white/90 mb-8">
          No credit card required. Works instantly in your browser.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/talk"
            className="bg-white text-indigo-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            Try September Now
          </Link>
          {/* <button className="bg-transparent text-white px-8 py-4 rounded-full text-lg font-semibold border-2 border-white hover:bg-white/10 transition">
            Schedule a Demo
          </button> */}
        </div>
      </div>
    </section>
  );
}
