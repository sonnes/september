const steps = [
  {
    title: 'Choose a situation',
    body: 'Open the space for the conversation you are having.',
    color: 'bg-indigo-50 text-indigo-700',
  },
  {
    title: 'Tap words or phrases',
    body: 'Use saved phrases and suggestions instead of typing every letter.',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    title: 'Press Speak',
    body: 'The message can be spoken aloud or shown on another display.',
    color: 'bg-emerald-50 text-emerald-700',
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <p className="mb-3 text-sm font-bold text-indigo-600">How it works</p>
          <h2 className="text-3xl font-bold leading-tight tracking-normal text-zinc-950 sm:text-5xl">
            From thought to spoken message.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-zinc-500 sm:text-lg">
            The message, suggestions, and Speak button stay together, so the next step is always
            easy to find.
          </p>
        </div>

        <div className="grid gap-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 rounded-xl border bg-white p-5 shadow-sm"
            >
              <span
                className={`grid size-11 place-items-center rounded-full text-base font-bold ${step.color}`}
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-zinc-950">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
