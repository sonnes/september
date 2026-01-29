import Image from 'next/image';

export function TechnologySection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Built with Leading AI Technology
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-16">
          <div className="text-center h-12">
            <Image
              height={48}
              width={48}
              src="/elevenlabs-logo.svg"
              alt="ElevenLabs - Voice Cloning"
              className="h-8 w-auto mx-auto mb-3"
            />
            <p className="text-md font-semibold text-gray-600">Voice Cloning</p>
          </div>
          <div className="text-center">
            <Image
              height={48}
              width={48}
              src="/gemini-logo.svg"
              alt="Gemini - AI Suggestions"
              className="h-12 w-auto mx-auto mb-3"
            />
            <p className="text-md font-semibold text-gray-600">AI Suggestions</p>
          </div>
        </div>
      </div>
    </section>
  );
}
