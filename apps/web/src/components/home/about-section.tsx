import { ArrowUpRight } from 'lucide-react';

// Founder story, from https://raviatluri.in/articles/building-september —
// first person, because September is built by someone who uses it.
export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-4 bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-sm font-bold text-indigo-600">About</p>
        <h2 className="text-3xl font-bold leading-tight tracking-normal text-zinc-950 sm:text-5xl">
          Built by someone who lives it.
        </h2>
        <div className="mt-6 grid gap-5 text-base leading-relaxed text-zinc-600 sm:text-lg">
          <p>
            I’m Ravi. I was diagnosed with ALS in 2019. As speaking and typing slipped away, I
            kept reaching for a tool that didn’t exist — asking for water, joining a call, or
            telling a story took far more effort than it should.
          </p>
          <blockquote className="border-l-4 border-indigo-200 pl-5 text-xl font-medium leading-relaxed text-zinc-900 sm:text-2xl">
            I should not have to type out full phrases and sentences every time.
          </blockquote>
          <p>
            Clicks are precious when you type with your eyes or a head mouse. So I built
            September: suggestions that learn how I actually talk, phrases two letters away, and a
            voice that is still mine. It’s free and open source — so it can be that for others
            too.
          </p>
        </div>
        <a
          href="https://raviatluri.in/articles/building-september"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-6 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Read the full story
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
