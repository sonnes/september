import { createFileRoute, Outlet } from '@tanstack/react-router';

import { Footer } from '@/components/home/footer';
import { MarketingNav } from '@/components/marketing/marketing-nav';

export const Route = createFileRoute('/_marketing')({
  component: MarketingLayout,
});

function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <MarketingNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
