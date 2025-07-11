import React from 'react';

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  description?: string;
  name: string;
}

export function Radio({ id, label, description, name, ...props }: RadioProps) {
  return (
    <div className="flex items-center gap-x-3">
      <input
        id={id}
        name={name}
        type="radio"
        className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"
        {...props}
      />
      <label htmlFor={id} className="block text-sm/6 font-medium text-gray-900">
        {label}
      </label>
      {description && <p className="text-gray-500">{description}</p>}
    </div>
  );
}
// Usage:
// <Radio id="push-everything" name="push-notifications" label="Everything" />
