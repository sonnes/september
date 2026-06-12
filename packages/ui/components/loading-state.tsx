import * as React from 'react';

import { cn } from '@september/shared';

import { Spinner } from './spinner';

type LoadingStateProps = React.ComponentProps<'div'> & {
  variant?: 'page' | 'inline';
  label?: string;
};

function LoadingState({
  className,
  variant = 'inline',
  label,
  ...props
}: LoadingStateProps) {
  if (variant === 'page') {
    return (
      <div
        data-slot="loading-state"
        role="status"
        aria-live="polite"
        className={cn('flex flex-1 flex-col items-center justify-center gap-3 py-16', className)}
        {...props}
      >
        <Spinner className="size-6 text-muted-foreground" />
        {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
      </div>
    );
  }

  return (
    <div
      data-slot="loading-state"
      role="status"
      aria-live="polite"
      className={cn('flex items-center gap-2 py-4', className)}
      {...props}
    >
      <Spinner className="size-4 text-muted-foreground" />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
    </div>
  );
}

export { LoadingState };
