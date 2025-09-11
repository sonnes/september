import React from 'react';

import { UserCircleIcon } from '@heroicons/react/24/solid';

interface AvatarUploadProps {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}

export function AvatarUpload({ onChange, label = 'Photo' }: AvatarUploadProps) {
  return (
    <div>
      <label className="block text-sm/6 font-medium text-zinc-900">{label}</label>
      <div className="mt-2 flex items-center gap-x-3">
        <UserCircleIcon aria-hidden="true" className="size-12 text-zinc-300" />
        <label className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 cursor-pointer">
          Change
          <input type="file" className="sr-only" onChange={onChange} />
        </label>
      </div>
    </div>
  );
}
// Usage:
// <AvatarUpload onChange={handlePhotoChange} />
