import React from 'react';

import { PhotoIcon } from '@heroicons/react/24/solid';

interface FileUploadProps {
  id: string;
  label: string;
  helperText?: string;
  accept?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileUpload({ id, label, helperText, accept, onChange }: FileUploadProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm/6 font-medium text-gray-900">
        {label}
      </label>
      <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
        <div className="text-center">
          <PhotoIcon aria-hidden="true" className="mx-auto size-12 text-gray-300" />
          <div className="mt-4 flex text-sm/6 text-gray-600">
            <label
              htmlFor={id}
              className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
            >
              <span>Upload a file</span>
              <input
                id={id}
                name={id}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={onChange}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          {helperText && <p className="text-xs/5 text-gray-600">{helperText}</p>}
        </div>
      </div>
    </div>
  );
}
// Usage:
// <FileUpload id="cover-photo" label="Cover photo" helperText="PNG, JPG, GIF up to 10MB" />
