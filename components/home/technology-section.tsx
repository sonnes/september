export function TechnologySection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Built with Leading AI Technology
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-12">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700 mb-2">ElevenLabs</div>
            <p className="text-sm text-gray-600">Voice Cloning</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700 mb-2">Gemini & Claude</div>
            <p className="text-sm text-gray-600">AI Suggestions</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700 mb-2">Web Standards</div>
            <p className="text-sm text-gray-600">Accessibility First</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700 mb-2">Privacy First</div>
            <p className="text-sm text-gray-600">Your Data, Protected</p>
          </div>
        </div>
      </div>
    </section>
  );
}