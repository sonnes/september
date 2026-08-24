import { SETUP_MODES } from '@/rules/onboarding';

// Marketing styling per mode, keyed off the shared `accent`. Copy itself lives
// in SETUP_MODES so the home page and onboarding never drift.
const ACCENT: Record<(typeof SETUP_MODES)[number]['accent'], { edge: string; badge: string }> = {
  amber: { edge: 'border-t-amber-600', badge: 'bg-amber-100 text-amber-700' },
  sky: { edge: 'border-t-sky-600', badge: 'bg-sky-100 text-sky-700' },
};

export function SetupChoicesSection() {
  return (
    <section className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Plain header — the indigo privacy band sits directly above; two
            indigo bands in adjacent viewports read as repetition. */}
        <div className="mb-9 max-w-3xl">
          <p className="mb-3 text-sm font-bold text-indigo-600">Setup choices</p>
          <h2 className="text-3xl font-bold leading-tight tracking-normal text-zinc-950 sm:text-5xl">
            Choose the setup that feels right.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
            You can keep everything on this device, use free writing help, or ask a caregiver to
            connect other services.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {SETUP_MODES.map(mode => {
            const accent = ACCENT[mode.accent];
            return (
              <article
                key={mode.title}
                className={`grid content-start gap-4 rounded-xl border border-zinc-200 border-t-4 bg-white p-6 shadow-sm ${accent.edge}`}
              >
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${accent.badge}`}
                >
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
