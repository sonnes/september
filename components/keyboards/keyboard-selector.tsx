'use client';

import React from 'react';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

import { KeyboardType, useKeyboardContext } from '@/components/context/keyboard-provider';

import { cn } from '@/lib/utils';

interface KeyboardSelectorProps {
  className?: string;
}

const keyboardOptions = [
  {
    id: 'none',
    name: 'None',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="2" y="4" width="20" height="12" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
      </svg>
    ),
  },
  {
    id: 'circular',
    name: 'Circular',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    id: 'qwerty',
    name: 'QWERTY',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="2" y="4" width="20" height="12" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
      </svg>
    ),
  },
];

export function KeyboardSelector({ className = '' }: KeyboardSelectorProps) {
  const { keyboardType, setKeyboardType } = useKeyboardContext();

  const selectedOption =
    keyboardOptions.find(option => option.id === keyboardType) || keyboardOptions[0];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Menu>
        <MenuButton className="flex items-center gap-2 px-3 py-1 text-sm text-zinc-600 rounded-full transition-colors cursor-pointer hover:bg-zinc-100 border border-zinc-200">
          {selectedOption.icon}
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        </MenuButton>

        <MenuItems
          anchor="top"
          className="w-40 rounded-xl bg-white p-2 text-sm font-semibold text-zinc-900 shadow-lg ring-1 ring-zinc-900/5"
        >
          {keyboardOptions.map(option => (
            <MenuItem key={option.id}>
              <button
                onClick={() => setKeyboardType(option.id as KeyboardType)}
                className={cn(
                  'flex items-center gap-2 w-full text-left p-2 rounded-md data-focus:bg-zinc-100 transition-colors',
                  keyboardType === option.id ? 'bg-indigo-50 text-indigo-600' : 'text-zinc-900'
                )}
              >
                {option.icon}
                <span>{option.name}</span>
              </button>
            </MenuItem>
          ))}
        </MenuItems>
      </Menu>
    </div>
  );
}
