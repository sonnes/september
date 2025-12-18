import * as React from 'react';

import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/20/solid';

import { cn } from '@/lib/utils';

interface AlertProps {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  button?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

const alertStyles = {
  success: {
    bg: 'bg-indigo-50',
    title: 'text-indigo-800',
    message: 'text-indigo-700',
    icon: <CheckCircleIcon aria-hidden="true" className="size-5 text-indigo-400" />,
  },
  warning: {
    bg: 'bg-amber-50',
    title: 'text-amber-800',
    message: 'text-amber-700',
    icon: <ExclamationTriangleIcon aria-hidden="true" className="size-5 text-amber-400" />,
  },
  error: {
    bg: 'bg-red-50',
    title: 'text-red-800',
    message: 'text-red-700',
    icon: <XCircleIcon aria-hidden="true" className="size-5 text-red-400" />,
  },
};

function Alert({ type, title, message, button, onDismiss, className }: AlertProps) {
  const styles = alertStyles[type];

  return (
    <div className={cn('rounded-md p-4 flex items-center', styles.bg, className)}>
      <div className="shrink-0">{styles.icon}</div>
      <div className="ml-3 flex-1">
        <h3 className={cn('text-sm font-medium', styles.title)}>{title}</h3>
        <div className={cn('mt-2 text-sm', styles.message)}>
          <p>{message}</p>
        </div>
      </div>
      {button && (
        <button
          className="ml-4 rounded bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-100"
          onClick={button.onClick}
        >
          {button.label}
        </button>
      )}
      {onDismiss && (
        <button
          className="ml-2 rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-200"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export { Alert };
export default Alert;
