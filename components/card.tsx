import { ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs">{children}</div>;
}
