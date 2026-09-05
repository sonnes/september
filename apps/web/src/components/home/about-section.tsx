import { ArrowUpRight } from 'lucide-react';

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-4 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium text-zinc-700">About</p>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Type words, not keys.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-700">
            I’m Ravi. I was diagnosed with ALS in 2019. Clicks are precious when you type with your
            eyes or a head mouse. I want each one to carry more of what I mean to say.
          </p>
          <p className="mt-4 text-base leading-relaxed text-zinc-700">
            Saved phrases and simple text expansion only go so far. A conversation keeps moving: you
            respond, change your mind, make a joke, say something you’ve never said before. Your
            communication app needs to move with you.
          </p>
          <p className="mt-4 text-base leading-relaxed text-zinc-700">
            September is my attempt to build a dynamic, fully customizable AAC alternative around
            that need. The goal is to help you choose words and shape whole thoughts with fewer
            keystrokes, in your own voice, on your own terms.
          </p>
          <a
            href="https://raviatluri.in/articles/building-september"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Read the full story <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
