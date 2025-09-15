import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-whiteto-zinc-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-amber-100 rounded-full mb-6">
            <span className="text-amber-700 text-sm font-medium">
              Built by someone living with ALS
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
              Faster
            </span>{' '}
            Communication
            <br />
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
              Fewer
            </span>{' '}
            Keystrokes
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A communication assistant for people living with ALS, MND, and other speech & motor
            difficulties
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={'/talk'}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:opacity-90 transition shadow-lg hover:shadow-xl"
            >
              Start Communicating
            </Link>
            <button className="bg-white text-amber-600 px-8 py-4 rounded-full text-lg font-semibold border-2 border-amber-600 hover:bg-amber-50 transition">
              <svg className="inline w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Demo
            </button>
          </div>
        </div>

        {/* Interactive Demo Visualization */}
        <div className="mt-16 relative">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto border border-zinc-200">
            <div className="flex items-center mb-6">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="ml-4 text-gray-500 text-sm font-medium">September</span>
            </div>

            {/* Suggestions Section - Matching autocomplete/suggestions styling */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 py-2 text-md min-h-[60px] items-center">
                <button className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-green-500 hover:bg-zinc-100 hover:border-green-600 transition-colors duration-200">
                  water please
                </button>
                <button className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-indigo-600 hover:bg-zinc-100 hover:border-indigo-400 transition-colors duration-200">
                  tea instead
                </button>
                <button className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-amber-500 hover:bg-zinc-100 hover:border-amber-600 transition-colors duration-200">
                  coffee now
                </button>
              </div>
            </div>

            {/* Editor Section - Matching editor styling */}
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="text-gray-400 mr-4 text-sm font-medium">Type:</span>
                <div className="flex-1">
                  <div className="w-full p-3 rounded-xl border border-zinc-400 bg-white">
                    <span className="text-gray-700">I&rsquo;d like some</span>
                    <div className="w-0.5 h-5 bg-amber-600 inline-block ml-1 animate-pulse align-middle"></div>
                    <span className="text-gray-400 italic">water please</span>
                  </div>
                </div>
              </div>

              {/* Voice Waveform */}
              <div className="flex items-center">
                <span className="text-gray-400 mr-4 text-sm font-medium">Voice:</span>
                <div className="flex items-center space-x-1 p-3">
                  <div className="w-1 h-6 bg-amber-400 rounded-full"></div>
                  <div className="w-1 h-8 bg-amber-500 rounded-full"></div>
                  <div className="w-1 h-6 bg-amber-400 rounded-full"></div>
                  <div className="w-1 h-10 bg-amber-600 rounded-full"></div>
                  <div className="w-1 h-5 bg-amber-400 rounded-full"></div>
                  <div className="w-1 h-7 bg-amber-500 rounded-full"></div>
                  <div className="w-1 h-6 bg-amber-400 rounded-full"></div>
                  <div className="w-1 h-4 bg-amber-300 rounded-full"></div>
                  <div className="w-1 h-9 bg-amber-500 rounded-full"></div>
                  <div className="w-1 h-5 bg-amber-400 rounded-full"></div>
                  <div className="w-1 h-7 bg-amber-600 rounded-full"></div>
                  <div className="w-1 h-6 bg-amber-400 rounded-full"></div>
                  <div className="w-1 h-8 bg-amber-500 rounded-full"></div>
                  <div className="w-1 h-4 bg-amber-300 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
