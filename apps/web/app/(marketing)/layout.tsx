import type { ReactNode } from 'react';

import { Footer } from '@/components/home/footer';
import { MarketingNav } from '@/components/marketing/marketing-nav';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
