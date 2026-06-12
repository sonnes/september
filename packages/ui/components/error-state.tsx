import * as React from 'react';
import { AlertTriangleIcon, RotateCwIcon, type LucideIcon } from 'lucide-react';

import { cn } from '@september/shared';

import { Button } from './button';

type ErrorStateProps = React.ComponentProps<'div'> & {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  onRetry?: () => void;
  retryLabel?: string;
  action?: React.ReactNode;
};

function ErrorState({
  className,
  title,
  description,
  icon: Icon = AlertTriangleIcon,
  onRetry,
  retryLabel = 'Try again',
  action,
  ...props
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        'mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950',
        className
      )}
      {...props}
    >
      <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
        <Icon className="size-6 text-red-600 dark:text-red-300" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-red-900 dark:text-red-100">{title}</h3>
        {description ? (
          <p className="text-sm text-red-800 dark:text-red-200">{description}</p>
        ) : null}
      </div>
      {(onRetry || action) && (
        <div className="flex items-center gap-2">
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-red-300 text-red-800 hover:bg-red-100 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-900"
            >
              <RotateCwIcon className="size-4" aria-hidden="true" />
              {retryLabel}
            </Button>
          ) : null}
          {action}
        </div>
      )}
    </div>
  );
}

export { ErrorState };
