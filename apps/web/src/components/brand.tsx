import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/packages/shared';

type BrandMarkProps = Omit<ComponentPropsWithoutRef<'img'>, 'src' | 'width' | 'height'> & {
  size?: number;
};

type BrandWordmarkProps = ComponentPropsWithoutRef<'span'> & {
  tone?: 'default' | 'inverse';
};

export function BrandMark({ alt = '', className, size = 32, ...props }: BrandMarkProps) {
  return (
    <img
      src="/logo.svg"
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      {...props}
    />
  );
}

export function BrandWordmark({ className, tone = 'default', ...props }: BrandWordmarkProps) {
  const inverse = tone === 'inverse';

  return (
    <span
      data-brand-wordmark="true"
      className={cn(
        'inline-flex items-baseline font-brand font-bold leading-none tracking-[-0.065em]',
        className
      )}
      {...props}
    >
      <span data-brand-typed="true" className={inverse ? 'text-white' : 'text-indigo-600'}>
        Sep
      </span>
      <span
        data-brand-completion="true"
        className={inverse ? 'text-indigo-200' : 'text-indigo-200 dark:text-indigo-300'}
      >
        tember
      </span>
    </span>
  );
}
