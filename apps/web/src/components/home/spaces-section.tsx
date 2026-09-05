export const DEMO_SPACES: { title: string; phrases: { text: string; code: string }[] }[] = [
  {
    title: 'Family',
    phrases: [
      { text: 'Let’s make a weekend of it.', code: 'trip' },
      { text: 'I’m choosing the film.', code: 'film' },
      { text: 'I’ve changed my mind.', code: 'cm' },
    ],
  },
  {
    title: 'Friends',
    phrases: [
      { text: 'I owe you a rematch.', code: 'rem' },
      { text: 'Tell me the whole story.', code: 'story' },
      { text: 'I’m joking!', code: 'jk' },
    ],
  },
  {
    title: 'Work',
    phrases: [
      { text: 'Let’s try another angle.', code: 'idea' },
      { text: 'I see it differently.', code: 'imo' },
      { text: 'I’ll sketch an idea.', code: 'sketch' },
    ],
  },
  {
    title: 'Silo',
    phrases: [
      { text: 'What do you think is outside?', code: 'out' },
      { text: 'Who do you trust in Silo?', code: 'trust' },
      { text: 'I have a theory about Silo.', code: 'theory' },
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
