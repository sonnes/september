import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function TextInput({
  containerClassName = '',
  className = '',
  id,
  name,
  ...props
}: TextInputProps) {
  const baseClasses =
    'block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 transition-all duration-200';

  return (
    <div className={containerClassName}>
      <input id={id} name={name} className={`${baseClasses} ${className}`} {...props} />
    </div>
  );
}
// Usage:
// <TextInput id="first-name" name="first-name" type="text" autoComplete="given-name" />
