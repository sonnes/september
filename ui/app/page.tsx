import { TopNavigation } from "@/components/top-navigation";
import {
  SpeakerWaveIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Caveat } from "next/font/google";

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

export default async function Home() {
  return (
    <div className="min-h-full">
      <div className="bg-indigo-500 pb-32">
        <TopNavigation color="indigo" />

        {/* Hero Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <div className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-600 mb-8">
              COMMUNICATION ASSISTANT
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold mb-4 text-white">
              Faster
              <span className={`${caveat.className} text-amber-300`}>
                Communication
              </span>
              <br />
              Fewer
              <span className={`${caveat.className} text-amber-300`}>
                Keystrokes
              </span>
            </h1>
            <p className="text-indigo-50 mb-8">
              A communication assistant for people with ALS, MND, or other
              speech & motor difficulties.
            </p>
            <a
              href="/talk"
              className="inline-block rounded-md bg-white text-indigo-600 px-8 py-3 font-medium hover:bg-indigo-50 transition"
            >
              Start Talking →
            </a>
            <p className="text-indigo-100 mt-4 text-sm">
              Designed for accessibility
            </p>
          </div>
        </div>
      </div>

      <main className="-mt-32">
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white px-5 py-6 shadow-sm sm:px-6">
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
                <div className="p-6 rounded-lg border border-zinc-100 flex flex-col items-center text-center">
                  <div className="rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <SpeakerWaveIcon className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Text-to-Speech</h3>
                  <p className="text-gray-600 max-w-sm">
                    Choose from multiple voices or clone your own voice to
                    maintain your unique identity.
                  </p>
                </div>

                <div className="p-6 rounded-lg border border-zinc-100 flex flex-col items-center text-center">
                  <div className="rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <MicrophoneIcon className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Voice Cloning</h3>
                  <p className="text-gray-600 max-w-sm">
                    Create a digital version of your voice using our simple
                    recording process.
                  </p>
                </div>

                <div className="p-6 rounded-lg border border-zinc-100 flex flex-col items-center text-center">
                  <div className="rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <DocumentTextIcon className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Speech-to-Text</h3>
                  <p className="text-gray-600 max-w-sm">
                    Real-time transcription of conversations to help you follow
                    and respond naturally.
                  </p>
                </div>

                <div className="p-6 rounded-lg border border-zinc-100 flex flex-col items-center text-center">
                  <div className="rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <SparklesIcon className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Smart Auto-Complete
                  </h3>
                  <p className="text-gray-600 max-w-sm">
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
                  <div className="flex flex-col items-center text-center gap-8">
                    <div className="flex-1 max-w-2xl">
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

                  <div className="flex flex-col items-center text-center gap-8">
                    <div className="flex-1 max-w-2xl">
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
        <div className="mx-auto max-w-7xl px-4 text-center text-gray-400">
          <p>September - Making communication accessible for everyone</p>
        </div>
      </footer>
    </div>
  );
}
