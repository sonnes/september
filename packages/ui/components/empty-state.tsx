import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@september/shared';

type EmptyStateProps = React.ComponentProps<'div'> & {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

function EmptyState({
  className,
  icon: Icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-dashed border-zinc-200 bg-card p-8 text-center dark:border-zinc-800',
        className
      )}
      {...props}
    >
      {Icon ? (
        <div className="rounded-full bg-muted p-3">
          <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
