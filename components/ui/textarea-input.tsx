import React from 'react';

interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  containerClassName?: string;
}

export function TextareaInput({ id, containerClassName = '', ...props }: TextareaInputProps) {
  return (
    <div className={containerClassName}>
      <textarea
        id={id}
        name={id}
        className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-zinc-900 outline-1 -outline-offset-1 outline-zinc-300 placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
        {...props}
      />
    </div>
  );
}
// Usage:
// <TextareaInput id="about" rows={3} />
