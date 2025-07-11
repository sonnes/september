import React from 'react';

interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
  containerClassName?: string;
  helperText?: string;
}

export function TextareaInput({
  label,
  id,
  containerClassName = '',
  helperText,
  ...props
}: TextareaInputProps) {
  return (
    <div className={containerClassName}>
      <label htmlFor={id} className="block text-sm/6 font-medium text-gray-900">
        {label}
      </label>
      <div className="mt-2">
        <textarea
          id={id}
          name={id}
          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
          {...props}
        />
      </div>
      {helperText && <p className="mt-3 text-sm/6 text-gray-600">{helperText}</p>}
    </div>
  );
}
// Usage:
// <TextareaInput label="About" id="about" rows={3} helperText="Write a few sentences about yourself." />
