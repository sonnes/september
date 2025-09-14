export function HeroSection() {
  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-amber-50 via-white to-yellow-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-amber-100 rounded-full mb-6">
            <span className="text-amber-700 text-sm font-medium">Built by someone living with ALS</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Faster</span> Communication<br />
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Fewer</span> Keystrokes
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A communication assistant for people living with ALS, MND, and other speech & motor difficulties
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:opacity-90 transition shadow-lg hover:shadow-xl">
              Start Communicating
            </button>
            <button className="bg-white text-amber-600 px-8 py-4 rounded-full text-lg font-semibold border-2 border-amber-600 hover:bg-amber-50 transition">
              <svg className="inline w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Watch Demo
            </button>
          </div>
        </div>
        
        {/* Interactive Demo Visualization */}
        <div className="mt-16 relative">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="ml-4 text-gray-500 text-sm">September Communication Assistant</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="text-gray-400 mr-4 text-sm">Type:</span>
                <div className="bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-3 rounded-lg flex-1">
                  <span className="text-gray-700">I&rsquo;d like some wa</span>
                  <span className="text-amber-600 font-semibold animate-pulse">ter please</span>
                  <div className="w-0.5 h-5 bg-amber-600 inline-block ml-1 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-4 text-sm">Voice:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-8 bg-amber-400 rounded-full animate-pulse"></div>
                  <div className="w-1 h-12 bg-amber-500 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1 h-10 bg-amber-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1 h-14 bg-amber-600 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                  <div className="w-1 h-8 bg-amber-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  <div className="w-1 h-11 bg-amber-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-1 h-9 bg-amber-400 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                  <div className="w-1 h-7 bg-amber-300 rounded-full animate-pulse" style={{animationDelay: '0.7s'}}></div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <div className="inline-flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm hover:bg-amber-200 cursor-pointer transition">water please</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm hover:bg-yellow-200 cursor-pointer transition">tea instead</span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200 cursor-pointer transition">coffee now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
