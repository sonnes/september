import React from 'react';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/20/solid';

interface AlertProps {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export function Alert({ type, title, message }: AlertProps) {
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
    <div className={`rounded-md ${bgClass} p-4`}>
      <div className="flex">
        <div className="shrink-0">{icon}</div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${titleClass}`}>{title}</h3>
          <div className={`mt-2 text-sm ${messageClass}`}>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Alert;
