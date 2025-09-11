import React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ButtonProps = {
  children?: ReactNode;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: keyof typeof colorClasses;
  variant?: 'default' | 'circular' | 'outline';
} & ButtonHTMLAttributes<HTMLButtonElement>;

const sizeClasses = {
  sm: 'gap-x-1.5 px-2.5 py-1.5',
  md: 'gap-x-1.5 px-3 py-2',
  lg: 'gap-x-2 px-3.5 py-2.5',
};

const circularSizeClasses = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

const colorClasses: Record<string, string> = {
  indigo: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600',
  zinc: 'bg-zinc-600 text-white hover:bg-zinc-500 focus-visible:outline-zinc-600',
};

const outlineColorClasses: Record<string, string> = {
  indigo: 'border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus-visible:outline-indigo-600',
  zinc: 'border-zinc-600 text-zinc-600 hover:bg-zinc-50 focus-visible:outline-zinc-600',
};

export function Button({
  children,
  icon,
  size = 'md',
  className = '',
  color = 'indigo',
  variant = 'default',
  disabled,
  ...props
}: ButtonProps) {
  const isCircular = variant === 'circular';
  const isOutline = variant === 'outline';

  const getColorClasses = () => {
    if (isOutline) {
      return outlineColorClasses[color] ?? outlineColorClasses['indigo'];
    }
    return colorClasses[color] ?? colorClasses['indigo'];
  };

  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center font-semibold shadow-sm focus-visible:outline-offset-2',
        getColorClasses(),
        isCircular
          ? `rounded-full ${circularSizeClasses[size]}`
          : `rounded-md text-sm ${sizeClasses[size]}`,
        isOutline && 'border-2 bg-transparent',
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon && React.isValidElement(icon)
        ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
            className: cn('w-5 h-5', (icon as React.ReactElement<{ className?: string }>).props.className),
          })
        : icon}
      {!isCircular && children}
    </button>
  );
}

export default Button;
