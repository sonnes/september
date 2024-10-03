"use client";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-red-600">September</div>
          <div className="space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-red-600">
              Login
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Hero Section */}
      <section className="bg-red-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Hello, I&apos;m September
          </h1>
          <p className="text-xl mb-8">
            September: Your communication assistant for ALS, MND, and speech
            difficulties
          </p>
          <Link
            href="/home"
            className="bg-white text-red-700 px-6 py-3 rounded-full font-semibold hover:bg-red-100 transition duration-300"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features">
        {/* Text-to-Speech Feature */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 md:pr-8 mb-8 md:mb-0">
                <Image
                  src="https://images.placeholders.dev/500x300/png?text=Text-to-Speech&font=roboto"
                  alt="Text-to-Speech"
                  width={500}
                  height={300}
                  className="rounded-lg shadow-md"
                />
              </div>
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold mb-4">Text-to-Speech</h2>
                <p className="text-gray-600 mb-4">
                  Choose from a variety of voices or clone your own to express
                  yourself naturally. Our voice cloning technology allows you to
                  maintain your unique personality.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Cloning Feature */}
        <div className="bg-gray-100 py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row-reverse items-center">
              <div className="md:w-1/2 md:pl-8 mb-8 md:mb-0">
                <Image
                  src="https://images.placeholders.dev/500x300/png?text=Voice+Cloning&font=roboto"
                  alt="Voice Cloning"
                  width={500}
                  height={300}
                  className="rounded-lg shadow-md"
                />
              </div>
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold mb-4">Voice Cloning</h2>
                <p className="text-gray-600 mb-4">
                  Create a digital version of your voice with our advanced voice
                  cloning technology. Read a set of provided sentences, and
                  we'll use Eleven Labs' technology to clone your unique voice,
                  allowing you to maintain your personal identity in all
                  communications.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Speech-to-Text Feature */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 md:pr-8 mb-8 md:mb-0">
                <Image
                  src="https://images.placeholders.dev/500x300/png?text=Speech-to-Text&font=roboto"
                  alt="Speech-to-Text"
                  width={500}
                  height={300}
                  className="rounded-lg shadow-md"
                />
              </div>
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold mb-4">Speech-to-Text</h2>
                <p className="text-gray-600 mb-4">
                  Real-time transcription of conversations around you, providing
                  context for quick and relevant responses. Overcome the
                  challenge of typing with motor difficulties.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Complete Feature */}
        <div className="bg-gray-100 py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row-reverse items-center">
              <div className="md:w-1/2 md:pl-8 mb-8 md:mb-0">
                <Image
                  src="https://images.placeholders.dev/500x300/png?text=Auto-Complete&font=roboto"
                  alt="Auto-Complete"
                  width={500}
                  height={300}
                  className="rounded-lg shadow-md"
                />
              </div>
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold mb-4">Auto-Complete</h2>
                <p className="text-gray-600 mb-4">
                  Intelligent prediction of words and phrases based on
                  conversation context and your personal style. Communicate
                  effectively with fewer keystrokes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Base Feature */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 md:pr-8 mb-8 md:mb-0">
                <Image
                  src="https://images.placeholders.dev/500x300/png?text=Knowledge+Base&font=roboto"
                  alt="Knowledge Base"
                  width={500}
                  height={300}
                  className="rounded-lg shadow-md"
                />
              </div>
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold mb-4">
                  Personalized Knowledge Base
                </h2>
                <p className="text-gray-600 mb-4">
                  Enhance your conversations by providing additional context
                  through notes, documents, images, videos, or links. September
                  indexes all this information to help you "speak your mind"
                  more effectively, drawing from your personal knowledge base to
                  offer more relevant and personalized communication
                  suggestions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Ravi Atluri. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
