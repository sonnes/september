interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  lede: string;
  hint?: string;
}

export function SectionHeader({ eyebrow, title, lede, hint }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-sm font-semibold text-indigo-600">{eyebrow}</p>
      <h2 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-zinc-600">{lede}</p>
      {hint && <p className="mt-5 text-sm font-medium leading-relaxed text-indigo-700">{hint}</p>}
    </div>
  );
}
