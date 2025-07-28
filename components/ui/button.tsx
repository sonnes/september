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
  gray: 'bg-gray-600 text-white hover:bg-gray-500 focus-visible:outline-gray-600',
  red: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600',
  green: 'bg-green-600 text-white hover:bg-green-500 focus-visible:outline-green-600',
  blue: 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600',
  white: 'bg-white text-zinc-900 hover:bg-zinc-100 focus-visible:outline-zinc-600',
};

const outlineColorClasses: Record<string, string> = {
  indigo: 'border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus-visible:outline-indigo-600',
  zinc: 'border-zinc-600 text-zinc-600 hover:bg-zinc-50 focus-visible:outline-zinc-600',
  gray: 'border-gray-600 text-gray-600 hover:bg-gray-50 focus-visible:outline-gray-600',
  red: 'border-red-600 text-red-600 hover:bg-red-50 focus-visible:outline-red-600',
  green: 'border-green-600 text-green-600 hover:bg-green-50 focus-visible:outline-green-600',
  blue: 'border-blue-600 text-blue-600 hover:bg-blue-50 focus-visible:outline-blue-600',
  white: 'border-zinc-900 text-zinc-900 hover:bg-zinc-100 focus-visible:outline-zinc-600',
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
        ? React.cloneElement(icon as React.ReactElement<any>, {
            className: cn('w-5 h-5', (icon as React.ReactElement<any>).props.className),
          })
        : icon}
      {!isCircular && children}
    </button>
  );
}

export default Button;
