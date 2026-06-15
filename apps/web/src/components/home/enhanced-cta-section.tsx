import { Link } from '@tanstack/react-router';

import { Button } from '@/packages/ui/components/button';

export function EnhancedCTASection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl bg-zinc-950 px-6 py-14 text-center text-white shadow-sm sm:px-8 sm:py-16">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-normal sm:text-5xl">
          Start with one daily conversation.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
          Create a space, save a phrase, and try speaking one message.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 min-h-12 bg-white px-6 font-bold text-zinc-950 hover:bg-zinc-100"
        >
          <Link to="/onboarding">Start setup</Link>
        </Button>
      </div>
    </section>
  );
}
