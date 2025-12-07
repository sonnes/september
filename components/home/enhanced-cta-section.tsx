import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function EnhancedCTASection() {
  return (
    <section className="py-20 bg-indigo-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          Start Communicating with Fewer Keystrokes
        </h2>
        <p className="text-xl text-white/90 mb-8">
          No credit card required. Works instantly in your browser.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            className="bg-white text-indigo-600 px-8 py-4 h-auto rounded-full text-lg font-semibold hover:bg-gray-100 shadow-lg"
          >
            <Link href="/talk">Try September Now</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
