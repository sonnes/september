import Link from 'next/link';

export function CTASection() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex flex-col lg:flex-row items-start gap-12">
        <div className="lg:w-1/2">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8">
            The future is in development.
          </h2>
        </div>
        <div className="lg:w-1/2">
          <p className="text-xl text-gray-700 leading-relaxed mb-8">
            We're building the next chapter of human-computer interaction. Sign up to track our
            progress and be first to know when September becomes available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder="Enter Email"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <Link
              href="/login"
              className="bg-indigo-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-indigo-600 transition-colors text-center"
            >
              Submit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
