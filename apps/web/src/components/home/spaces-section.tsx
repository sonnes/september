export const DEMO_SPACES: { title: string; phrases: string[] }[] = [
  {
    title: 'Family',
    phrases: ['I have news', 'That’s our next trip', 'I’m choosing the film'],
  },
  {
    title: 'Friends',
    phrases: ['Tell me the whole story', 'I owe you a rematch', 'That’s an inside joke'],
  },
  {
    title: 'Work',
    phrases: ['Let’s try another angle', 'I see it differently', 'I’ll sketch an idea'],
  },
  {
    title: 'Books',
    phrases: [
      'I’m not sold on the ending',
      'That character grew on me',
      'What did you make of it?',
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
