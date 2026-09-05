interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  lede: string;
  hint?: string;
}

export function SectionHeader({ eyebrow, title, lede, hint }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-sm font-medium text-zinc-600">{eyebrow}</p>
      <h2 className="text-3xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-zinc-700">{lede}</p>
      {hint && <p className="mt-5 text-sm font-medium leading-relaxed text-indigo-700">{hint}</p>}
    </div>
  );
}
