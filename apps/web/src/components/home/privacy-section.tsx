const FACTS = [
  'On-device voice & suggestions',
  'No account needed',
  'Open source',
  'Free to use',
];

export function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-4 bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl bg-indigo-600 p-8 text-white sm:p-12">
        <p className="mb-3 text-sm font-bold text-indigo-200">Private by design</p>
        <h2 className="text-3xl font-bold leading-tight tracking-normal sm:text-5xl">
          Your words can stay on this device.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/90 sm:text-lg">
          September can keep system speech, autocomplete, spaces, notes, and saved phrases in your
          browser. Cloud writing and voice services are optional, and there’s no September account
          to create.
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
