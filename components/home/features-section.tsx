export function FeaturesSection() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Product description */}
      <div className="text-center mb-16">
        <p className="text-lg text-gray-700 max-w-4xl mx-auto">
          September is a simple, yet powerful communication assistant that uses smart prediction and
          voice cloning. It understands what you intend to say, allowing you to communicate more
          effectively without the need to type, tap, or talk out loud.
        </p>
      </div>

      {/* Three-column feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">The most intuitive interface</h3>
          <p className="text-gray-600">
            From normal speech to silent communication that feels like telepathy, September adapts
            to however you choose to interact.
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Designed to fade away</h3>
          <p className="text-gray-600">
            Stay completely hands-free and screen-free while accessing AI, sending messages, and
            getting information on the fly.
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Your data stays private</h3>
          <p className="text-gray-600">
            Your data stays private stored in your browser. We do not store any data on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
