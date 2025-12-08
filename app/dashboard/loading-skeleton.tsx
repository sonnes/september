import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-48 mt-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {['Total Messages', 'Recent Activity', 'Quick Stats'].map(label => (
          <div key={label} className="rounded-lg border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
            <Skeleton className="h-9 w-16 mt-2" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-6 w-32" />
        <div className="mt-4 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
