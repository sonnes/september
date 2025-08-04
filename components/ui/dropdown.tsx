'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

export interface DropdownOption {
  id: string;
  name: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Dropdown({
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select an option',
  label,
  disabled = false,
  className = '',
}: DropdownProps) {
  const selectedOption = options.find(
    option => option.id === selectedValue || option.name === selectedValue
  );

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <Menu as="div" className="relative inline-block w-full">
        <MenuButton
          disabled={disabled}
          className="inline-flex w-full justify-between items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedOption?.name || placeholder}
          <ChevronDownIcon aria-hidden="true" className="-mr-1 size-5 text-gray-400" />
        </MenuButton>

        <MenuItems
          transition
          className="absolute right-0 z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
        >
          <div className="py-1">
            {options && options.length > 0 ? (
              options.map(option => (
                <MenuItem key={option.id} disabled={option.disabled}>
                  <button
                    type="button"
                    onClick={() => onSelect(option.id)}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {option.name}
                  </button>
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>
                <span className="block px-4 py-2 text-sm text-gray-500">No options available</span>
              </MenuItem>
            )}
          </div>
        </MenuItems>
      </Menu>
    </div>
  );
}
