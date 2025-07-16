import React from 'react';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/20/solid';

interface AlertProps {
  type: 'success' | 'error';
  title: string;
  message: string;
  button?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export function Alert({ type, title, message, button, onDismiss }: AlertProps) {
  const isSuccess = type === 'success';
  const icon = isSuccess ? (
    <CheckCircleIcon aria-hidden="true" className="size-5 text-green-400" />
  ) : (
    <XCircleIcon aria-hidden="true" className="size-5 text-red-400" />
  );
  const bgClass = isSuccess ? 'bg-green-50' : 'bg-red-50';
  const titleClass = isSuccess ? 'text-green-800' : 'text-red-800';
  const messageClass = isSuccess ? 'text-green-700' : 'text-red-700';

  return (
    <div className={`rounded-md ${bgClass} p-4 flex items-center`}>
      <div className="shrink-0">{icon}</div>
      <div className="ml-3 flex-1">
        <h3 className={`text-sm font-medium ${titleClass}`}>{title}</h3>
        <div className={`mt-2 text-sm ${messageClass}`}>
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
          className="ml-2 rounded bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-200"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export default Alert;
