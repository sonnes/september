import { KeyboardDemo } from './keyboard-demo';

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          Powerful Features, Simple to Use
        </h2>

        {/* Feature 1: Smart Text Editor */}
        <div className="flex flex-col lg:flex-row items-center mb-20 gap-12">
          <div className="lg:w-1/2">
            <h3 className="text-3xl font-bold mb-4">AI That Learns How You Talk</h3>
            <p className="text-gray-600 mb-6">
              Get instant suggestions based on your message history. The more you use it, the better
              it understands your style.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">Auto-complete from your conversation history</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">Context-aware AI suggestions</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">
                  Add notes, documents, and memories for richer conversations
                </span>
              </li>
            </ul>
          </div>
          <div className="lg:w-1/2">
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-gray-700 mb-3">Type: &ldquo;How are y&rdquo;</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 cursor-pointer transition">
                    you today?
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 cursor-pointer transition">
                    you feeling?
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 cursor-pointer transition">
                    your kids?
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Voice Cloning */}
        <div className="flex flex-col lg:flex-row-reverse items-center mb-20 gap-12">
          <div className="lg:w-1/2">
            <h3 className="text-3xl font-bold mb-4">Speak in Your Own Voice</h3>
            <p className="text-gray-600 mb-6">
              Clone your voice from recordings or choose from professional options. Works with video
              calls and in-person conversations.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">Easy voice cloning with ElevenLabs</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">Multiple voice options</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">Works with existing recordings</span>
              </li>
            </ul>
          </div>
          <div className="lg:w-1/2">
            <div className="bg-gradient-to-r from-blue-100 to-green-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold">Your Voices</span>
                  <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                    + Add Voice
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-blue-600 mr-3"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 18c4.42 0 8-3.58 8-8s-3.58-8-8-8-8 3.58-8 8 3.58 8 8 8zm-1-4h2v2h-2v-2zm0-8h2v6h-2V8z" />
                      </svg>
                      <span>My Voice (2023)</span>
                    </div>
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-gray-400 mr-3"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 18c4.42 0 8-3.58 8-8s-3.58-8-8-8-8 3.58-8 8 3.58 8 8 8zm-1-4h2v2h-2v-2zm0-8h2v6h-2V8z" />
                      </svg>
                      <span>Professional Voice 1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Real-time Transcription */}
        <div className="flex flex-col lg:flex-row items-center mb-20 gap-12">
          <div className="lg:w-1/2">
            <h3 className="text-3xl font-bold mb-4">Keep Up with Conversations</h3>
            <p className="text-gray-600 mb-6">
              AI transcribes what others are saying and suggests contextual responses to maintain
              natural conversation flow.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">Real-time speech-to-text</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">Context-aware response suggestions</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">Maintains conversation momentum</span>
              </li>
            </ul>
          </div>
          <div className="lg:w-1/2">
            <div className="bg-gradient-to-r from-green-100 to-yellow-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-1">
                      <span className="text-xs font-semibold text-blue-600">A</span>
                    </div>
                    <div className="bg-blue-50 px-3 py-2 rounded-lg max-w-xs">
                      <p className="text-sm">How are you feeling today?</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-purple-100 px-3 py-2 rounded-lg">
                      <p className="text-sm">I&rsquo;m doing better, thanks for asking!</p>
                    </div>
                  </div>
                  <div className="text-center text-xs text-gray-500">
                    💡 Suggested responses: &ldquo;Much better today&rdquo; • &ldquo;Feeling
                    stronger&rdquo; • &ldquo;Good days and bad days&rdquo;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 4: Accessible Keyboards */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
          <div className="lg:w-1/2">
            <h3 className="text-3xl font-bold mb-4">Input Methods That Work for You</h3>
            <p className="text-gray-600 mb-6">
              Multiple keyboard layouts optimized for different input devices - mouse,
              head-tracking, or eye-gaze.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-orange-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">QWERTY, Circular, and Emoji layouts</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-6 h-6 text-orange-600 mt-1 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span className="text-gray-700">Minimize clicks and movements</span>
              </li>
            </ul>
          </div>
          <div className="lg:w-1/2">
            <KeyboardDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
