const modes = [
  {
    badge: 'Most private',
    title: 'Privacy mode',
    body: 'The most private option. No AI service needed.',
    color: 'border-t-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    bullets: [
      'Everything stays on this device.',
      'Use saved phrases and browser speech.',
      'Nothing is sent out for suggestions.',
    ],
  },
  {
    badge: 'Free start',
    title: 'Free AI mode',
    body: 'Use OpenRouter, a free AI option, for writing help.',
    color: 'border-t-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700',
    bullets: [
      'September may send the current message to OpenRouter for suggestions.',
      'Spaces and saved phrases still stay on this device.',
      'Good when you want help writing longer replies.',
    ],
  },
  {
    badge: 'Advanced',
    title: 'Use your own services',
    body: 'For people or caregivers who already have voice or AI accounts.',
    color: 'border-t-sky-600',
    badgeClass: 'bg-sky-100 text-sky-700',
    bullets: [
      'Add your own Gemini, OpenRouter, or ElevenLabs access key.',
      'Choose the voice or writing helper you prefer.',
      'September contacts only the services you choose.',
    ],
  },
];

export function SetupChoicesSection() {
  return (
    <section className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-indigo-600 p-6 text-white sm:p-8">
          <p className="mb-4 text-sm font-bold text-white/85">Setup choices</p>
          <h2 className="text-3xl font-bold leading-tight tracking-normal sm:text-5xl">
            Choose the setup that feels right.
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-relaxed text-white/90 sm:text-lg">
            You can keep everything on this device, use free writing help, or ask a caregiver to
            connect other services.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {modes.map(mode => (
            <article
              key={mode.title}
              className={`grid content-start gap-4 rounded-xl border border-zinc-200 border-t-4 bg-white p-6 shadow-sm ${mode.color}`}
            >
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${mode.badgeClass}`}>
                {mode.badge}
              </span>
              <h3 className="text-lg font-semibold text-zinc-950">{mode.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{mode.body}</p>
              <ul className="grid gap-3 text-sm leading-relaxed text-zinc-500">
                {mode.bullets.map(bullet => (
                  <li key={bullet} className="grid grid-cols-[8px_minmax(0,1fr)] gap-4">
                    <span className="mt-2 size-2 rounded-full bg-current" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
