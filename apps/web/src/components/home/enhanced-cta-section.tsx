import { Button } from '@september/ui/components/button';
import { Link } from '@tanstack/react-router';

export function EnhancedCTASection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-surface bg-indigo-600 px-6 py-14 text-center text-white shadow-sm sm:px-8 sm:py-16">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Being understood shouldn’t be hard work.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
          Set up September in a few minutes — on your own, or with a caregiver beside you. It’s
          free, and it starts working before you create anything.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 min-h-12 bg-white px-6 font-bold text-indigo-600 hover:bg-indigo-50"
        >
          <Link to="/welcome">Get started</Link>
        </Button>
      </div>
    </section>
  );
}
