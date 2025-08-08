/**
 * @deprecated This component has been deprecated. Use the Dropdown component instead.
 *
 * The Dropdown component provides better functionality with:
 * - Better accessibility
 * - Custom styling
 * - Keyboard navigation
 * - Search functionality
 *
 * Migration guide:
 *
 * OLD:
 * ```tsx
 * import { SelectInput } from '@/components/ui/select-input';
 *
 * <SelectInput
 *   id="country"
 *   options={[{ value: 'us', label: 'United States' }]}
 * />
 * ```
 *
 * NEW:
 * ```tsx
 * import { Dropdown } from '@/components/ui/dropdown';
 *
 * <Dropdown
 *   options={[{ id: 'us', name: 'United States' }]}
 *   selectedValue={selectedCountry}
 *   onSelect={setSelectedCountry}
 *   placeholder="Select a country"
 * />
 * ```
 *
 * For form integration, use FormDropdown from '@/components/ui/form':
 * ```tsx
 * import { FormDropdown } from '@/components/ui/form';
 *
 * <FormDropdown
 *   name="country"
 *   control={form.control}
 *   label="Country"
 *   options={[{ id: 'us', name: 'United States' }]}
 * />
 * ```
 */
import React from 'react';

import { ChevronDownIcon } from '@heroicons/react/16/solid';

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  options: { value: string; label: string }[];
  containerClassName?: string;
}

export function SelectInput({ id, options, containerClassName = '', ...props }: SelectInputProps) {
  console.warn(
    'SelectInput component is deprecated. Use Dropdown or FormDropdown component instead. See the deprecation notice above for migration guide.'
  );

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-1">
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
// <SelectInput id="country" options={[{value: 'us', label: 'United States'}]} />
