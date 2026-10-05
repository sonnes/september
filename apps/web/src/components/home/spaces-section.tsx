export const DEMO_SPACES: { title: string; phrases: { text: string; code: string }[] }[] = [
  {
    title: 'Family',
    phrases: [
      { text: 'I’ve changed my mind.', code: 'cm' },
      { text: 'Let’s make a weekend of it.', code: 'trip' },
      { text: 'I’m choosing the film.', code: 'film' },
    ],
  },
  {
    title: 'Friends',
    phrases: [
      { text: 'Plot twist!', code: 'pt' },
      { text: 'Tell me more.', code: 'more' },
      { text: 'I have a better idea.', code: 'idea' },
    ],
  },
  {
    title: 'Work',
    phrases: [
      { text: 'Let’s try another angle.', code: 'angle' },
      { text: 'I see it differently.', code: 'imo' },
      { text: 'I’ll sketch an idea.', code: 'sketch' },
    ],
  },
  {
    title: 'Game night',
    phrases: [
      { text: 'Anyone have wood for sheep?', code: 'wood' },
      { text: 'Your turn to roll.', code: 'roll' },
      { text: 'I’ll buy it!', code: 'buy' },
    ],
  },
];

export function SpaceTabs({
  active,
  onSelect,
}: {
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      aria-label="Demo spaces"
      className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-surface border bg-card p-1"
    >
      {DEMO_SPACES.map((space, index) => (
        <button
          key={space.title}
          type="button"
          aria-pressed={index === active}
          onClick={() => onSelect(index)}
          className={`h-11 shrink-0 rounded-full px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring ${index === active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
        >
          {space.title}
        </button>
      ))}
    </div>
  );
}
