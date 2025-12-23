'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DocumentListSkeleton() {
  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Search bar skeleton */}
      <div className="relative mb-4">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Document list items skeleton */}
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

export function DocumentEditorSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Document header skeleton */}
      <Skeleton className="h-10 w-64 mb-4" />
      {/* Editor content skeleton */}
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
}

