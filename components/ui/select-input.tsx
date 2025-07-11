import React from 'react';

import { ChevronDownIcon } from '@heroicons/react/16/solid';

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
  options: { value: string; label: string }[];
  containerClassName?: string;
}

export function SelectInput({
  label,
  id,
  options,
  containerClassName = '',
  ...props
}: SelectInputProps) {
  return (
    <div className={containerClassName}>
      <label htmlFor={id} className="block text-sm/6 font-medium text-gray-900">
        {label}
      </label>
      <div className="mt-2 grid grid-cols-1">
        <select
          id={id}
          name={id}
          className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
        />
      </div>
    </div>
  );
}
// Usage:
// <SelectInput label="Country" id="country" options={[{value: 'us', label: 'United States'}]} />
