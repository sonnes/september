const FACTS = [
  'On-device voice & suggestions',
  'No account needed',
  'Open source',
  'Free to use',
];

export function PrivacySection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl bg-indigo-600 p-8 text-white sm:p-12">
        <p className="mb-3 text-sm font-bold text-indigo-200">Private by design</p>
        <h2 className="text-3xl font-bold leading-tight tracking-normal sm:text-5xl">
          Your words can stay on this device.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/90 sm:text-lg">
          September can run its speech, transcription, and suggestions entirely in your browser. In
          privacy mode, nothing you write or say leaves your device — and there’s no account to
          create.
        </p>
        <ul className="mt-6 flex flex-wrap gap-3">
          {FACTS.map(fact => (
            <li
              key={fact}
              className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium"
            >
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
