import { TopNavigation } from "@/components/top-navigation";

export default function Home() {
  return (
    <div className="min-h-full">
      <div className="bg-indigo-600 pb-32">
        <TopNavigation color="indigo" />

        {/* Hero Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <div className="inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-sm text-white mb-8">
              COMMUNICATION ASSISTANT
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold mb-4 text-white">
              Communicate
              <br />
              <span className="text-orange-400">With Fewer Keystrokes</span>
            </h1>
            <p className="text-indigo-100 mb-8">
              A communication assistant for people with ALS, MND, or other
              speech & motor difficulties.
            </p>
            <a
              href="/talk"
              className="inline-block rounded-md bg-white text-indigo-600 px-8 py-3 font-medium hover:bg-indigo-50 transition"
            >
              Start Talking →
            </a>
            <p className="text-indigo-200 mt-4 text-sm">
              Designed for accessibility
            </p>
          </div>
        </div>
      </div>

      <main className="-mt-32">
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white px-5 py-6 shadow sm:px-6">
            {/* Features Grid */}
            <div className="py-16">
              <h2 className="text-3xl font-bold text-center mb-4">
                Powerful Communication Tools
              </h2>
              <p className="text-gray-600 text-center mb-12">
                Express yourself naturally with our comprehensive suite of
                features.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 rounded-lg border">
                  <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <span className="text-orange-600 text-xl">🗣️</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Text-to-Speech</h3>
                  <p className="text-gray-600">
                    Choose from multiple voices or clone your own voice to
                    maintain your unique identity.
                  </p>
                </div>

                <div className="p-6 rounded-lg border">
                  <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <span className="text-orange-600 text-xl">🎙️</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Voice Cloning</h3>
                  <p className="text-gray-600">
                    Create a digital version of your voice using our simple
                    recording process.
                  </p>
                </div>

                <div className="p-6 rounded-lg border">
                  <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <span className="text-orange-600 text-xl">📝</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Speech-to-Text</h3>
                  <p className="text-gray-600">
                    Real-time transcription of conversations to help you follow
                    and respond naturally.
                  </p>
                </div>

                <div className="p-6 rounded-lg border">
                  <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <span className="text-orange-600 text-xl">✨</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Smart Auto-Complete
                  </h3>
                  <p className="text-gray-600">
                    Context-aware suggestions that help you express yourself
                    with minimal effort.
                  </p>
                </div>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="py-16">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12">
                  How It Works
                </h2>

                <div className="space-y-12">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-4">
                        Contextual Understanding
                      </h3>
                      <p className="text-gray-600">
                        September indexes your notes, documents, and
                        conversation history to provide relevant suggestions and
                        help you communicate more efficiently.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-4">
                        Real-time Transcription
                      </h3>
                      <p className="text-gray-600">
                        Follow conversations easily with live transcription,
                        making it simpler to participate and respond at your own
                        pace.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-4 text-center text-gray-600">
          <p>September - Making communication accessible for everyone</p>
        </div>
      </footer>
    </div>
  );
}
