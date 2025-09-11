import React from 'react';

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  name: string;
}

export function Radio({ id, name, ...props }: RadioProps) {
  return (
    <div className="flex items-center gap-x-3">
      <input
        id={id}
        name={name}
        type="radio"
        className="relative size-4 appearance-none rounded-full border border-zinc-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-zinc-300 disabled:bg-zinc-100 disabled:before:bg-zinc-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"
        {...props}
      />
    </div>
  );
}
// Usage:
// <Radio id="push-everything" name="push-notifications" />
