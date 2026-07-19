// One colour lane per feature section — same palette the old feature cards
// used, so the page reads as chapters instead of a monotone scroll.
export type SectionAccent = 'indigo' | 'amber' | 'sky' | 'emerald' | 'violet' | 'rose';

const ACCENTS: Record<SectionAccent, { eyebrow: string; hint: string }> = {
  indigo: {
    eyebrow: 'text-indigo-600',
    hint: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  },
  amber: {
    // amber-800: amber-700 lands under AA (~4.0:1) on the zinc-100 section.
    eyebrow: 'text-amber-800',
    hint: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  sky: {
    eyebrow: 'text-sky-700',
    hint: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  emerald: {
    eyebrow: 'text-emerald-700',
    hint: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  violet: {
    eyebrow: 'text-violet-700',
    hint: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  rose: {
    eyebrow: 'text-rose-700',
    hint: 'border-rose-200 bg-rose-50 text-rose-800',
  },
};

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  lede: string;
  /** One-line "Try it" instruction rendered as a calm tinted pill. */
  hint?: string;
  accent?: SectionAccent;
}

/** Shared header block for the feature-prototype sections: eyebrow → H2 → lede → try-hint. */
export function SectionHeader({ eyebrow, title, lede, hint, accent = 'indigo' }: SectionHeaderProps) {
  const colors = ACCENTS[accent];
  return (
    <div className="max-w-3xl">
      <p className={`mb-3 text-sm font-bold ${colors.eyebrow}`}>{eyebrow}</p>
      <h2 className="text-3xl font-bold leading-tight tracking-normal text-zinc-950 sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">{lede}</p>
      {hint && (
        <p
          className={`mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${colors.hint}`}
        >
          <span aria-hidden="true">▸</span>
          {hint}
        </p>
      )}
    </div>
  );
}
