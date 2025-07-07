import React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ButtonProps = {
  children: ReactNode;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'indigo' | 'zinc' | 'gray' | 'red' | 'green' | 'blue';
} & ButtonHTMLAttributes<HTMLButtonElement>;

const sizeClasses = {
  sm: 'gap-x-1.5 px-2.5 py-1.5',
  md: 'gap-x-1.5 px-3 py-2',
  lg: 'gap-x-2 px-3.5 py-2.5',
};

const colorClasses: Record<string, string> = {
  indigo: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600',
  zinc: 'bg-zinc-600 text-white hover:bg-zinc-500 focus-visible:outline-zinc-600',
  gray: 'bg-gray-600 text-white hover:bg-gray-500 focus-visible:outline-gray-600',
  red: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600',
  green: 'bg-green-600 text-white hover:bg-green-500 focus-visible:outline-green-600',
  blue: 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600',
};

export function Button({
  children,
  icon,
  size = 'md',
  className = '',
  color = 'indigo',
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center rounded-md text-sm font-semibold shadow-sm focus-visible:outline-offset-2',
        colorClasses[color] ?? colorClasses['indigo'],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon && React.isValidElement(icon)
        ? React.cloneElement(icon as React.ReactElement<any>, {
            className:
              `${(icon as React.ReactElement<any>).props.className ?? ''} -ml-0.5 size-5`.trim(),
          })
        : icon}
      {children}
    </button>
  );
}

export default Button;
