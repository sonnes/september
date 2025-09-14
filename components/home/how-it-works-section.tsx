export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          Get Started in Minutes
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">Open in Any Browser</h3>
            <p className="text-gray-600 text-sm">No downloads or complex setup</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">Choose Your Input</h3>
            <p className="text-gray-600 text-sm">Keyboard, mouse, or assistive device</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">Set Up Your Voice</h3>
            <p className="text-gray-600 text-sm">Clone your voice or select alternatives</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              4
            </div>
            <h3 className="font-semibold mb-2">Start Communicating</h3>
            <p className="text-gray-600 text-sm">Type, speak, and connect naturally</p>
          </div>
        </div>
      </div>
    </section>
  );
}