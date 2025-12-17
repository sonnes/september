'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function ChatListSkeleton() {
  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Search bar skeleton */}
      <div className="relative mb-4">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Chat list items skeleton */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="py-3 border-b border-zinc-200">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Alternating message bubbles for realistic chat skeleton */}
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={`flex ${index % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[70%] ${index % 2 === 0 ? 'items-end' : 'items-start'} flex flex-col gap-2`}
          >
            <Skeleton className={`h-12 rounded-2xl ${index % 2 === 0 ? 'w-48' : 'w-64'}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
