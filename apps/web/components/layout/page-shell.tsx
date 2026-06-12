import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@september/shared';

const pageShellVariants = cva('mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:py-8', {
  variants: {
    width: {
      default: 'max-w-3xl',
      wide: 'max-w-4xl',
      form: 'max-w-2xl',
      full: 'max-w-none',
    },
  },
  defaultVariants: {
    width: 'default',
  },
});

type PageShellProps = React.ComponentProps<'div'> & VariantProps<typeof pageShellVariants>;

export function PageShell({ className, width, children, ...props }: PageShellProps) {
  return (
    <div className={cn(pageShellVariants({ width }), className)} {...props}>
      {children}
    </div>
  );
}
