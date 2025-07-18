import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  containerClassName?: string;
  required?: boolean;
}

export function TextInput({
  label,
  id,
  containerClassName = '',
  required = false,
  ...props
}: TextInputProps) {
  return (
    <div className={containerClassName}>
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="block text-sm/6 font-medium text-gray-900">
          {label}
        </label>
        {required && <span className="text-red-500 text-xs">*Required</span>}
      </div>
      <div className="mt-2">
        <input
          id={id}
          name={id}
          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
          {...props}
        />
      </div>
    </div>
  );
}
// Usage:
// <TextInput label="First name" id="first-name" type="text" autoComplete="given-name" />
