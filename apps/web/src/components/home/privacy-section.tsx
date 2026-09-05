const FACTS = ['On-device voice & suggestions', 'No account needed', 'Free to use', 'Open source'];

export function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-4 bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl border-t border-zinc-200 pt-12 text-zinc-950">
        <p className="mb-3 text-sm font-bold text-indigo-600">Private by design</p>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          Your words can stay on this device.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          September can keep speech, suggestions, spaces, notes, and saved phrases on this device.
          Cloud writing and voice services are optional, and there’s no September account to create.
        </p>
        <ul className="mt-6 flex flex-wrap gap-3">
          {FACTS.map(fact => (
            <li
              key={fact}
              className="border-l-2 border-indigo-200 pl-3 text-sm font-medium text-zinc-700"
            >
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
