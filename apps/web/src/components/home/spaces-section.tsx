export const DEMO_SPACES: { title: string; phrases: string[] }[] = [
  {
    title: 'Family',
    phrases: ['Good morning', 'I love you', 'What’s for dinner?', 'Turn the TV up, please'],
  },
  {
    title: 'Friends',
    phrases: ['Good to see you', 'Tell me everything', 'That’s a good one', 'Same time next week?'],
  },
  {
    title: 'Work',
    phrases: [
      'Give me a moment to type',
      'I agree with that',
      'Could you repeat the last part?',
      'I’ll send my notes after this',
    ],
  },
  {
    title: 'Clinic',
    phrases: [
      'My left arm feels weaker',
      'Can you repeat that slowly?',
      'I’d like my caregiver present',
      'When is the next appointment?',
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
