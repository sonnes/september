import * as React from 'react';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  InfoIcon,
  XCircleIcon,
  type LucideIcon,
} from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@september/shared/lib/utils';

const calloutVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      tone: {
        info: 'border-indigo-200 bg-indigo-50 text-indigo-900 [&>svg]:text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-100 dark:[&>svg]:text-indigo-400',
        warning:
          'border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100 dark:[&>svg]:text-amber-400',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 dark:[&>svg]:text-emerald-400',
        destructive:
          'border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-100 dark:[&>svg]:text-red-400',
      },
    },
    defaultVariants: {
      tone: 'info',
    },
  }
);

const toneIcon: Record<NonNullable<VariantProps<typeof calloutVariants>['tone']>, LucideIcon> = {
  info: InfoIcon,
  warning: AlertCircleIcon,
  success: CheckCircle2Icon,
  destructive: XCircleIcon,
};

type CalloutProps = React.ComponentProps<'div'> &
  VariantProps<typeof calloutVariants> & {
    title?: React.ReactNode;
    icon?: LucideIcon | null;
  };

function Callout({
  className,
  tone = 'info',
  title,
  icon,
  children,
  ...props
}: CalloutProps) {
  const Icon = icon === null ? null : (icon ?? toneIcon[tone ?? 'info']);

  return (
    <div
      data-slot="callout"
      role="status"
      className={cn(calloutVariants({ tone }), className)}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      {title ? <CalloutTitle>{title}</CalloutTitle> : null}
      {children ? <CalloutDescription>{children}</CalloutDescription> : null}
    </div>
  );
}

function CalloutTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="callout-title"
      className={cn('col-start-2 min-h-4 font-medium tracking-tight', className)}
      {...props}
    />
  );
}

function CalloutDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="callout-description"
      className={cn(
        'col-start-2 grid justify-items-start gap-1 text-sm opacity-90 [&_p]:leading-relaxed [&_a]:underline [&_a]:underline-offset-2',
        className
      )}
      {...props}
    />
  );
}

export { Callout, CalloutTitle, CalloutDescription };
