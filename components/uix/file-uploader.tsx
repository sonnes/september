import React, { useState } from 'react';

import Image from 'next/image';

import { FileUpload } from '@/components/uix/file-upload';

type FileUploaderProps = {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  maxFiles?: number;
  showPreviews?: boolean;
  previewClassName?: string;
};

const FileUploader: React.FC<FileUploaderProps> = ({
  onUpload,
  accept = '*',
  multiple = true,
  label = 'Upload files',
  maxFiles,
  showPreviews = true,
  previewClassName = 'w-24 h-24 object-cover rounded border',
}) => {
  const [previews, setPreviews] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArr = Array.from(files);

    // Limit files if maxFiles is specified
    const limitedFiles = maxFiles ? fileArr.slice(0, maxFiles) : fileArr;

    // Create previews for image files
    if (showPreviews) {
      const imageFiles = limitedFiles.filter(file => file.type.startsWith('image/'));
      const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
      setPreviews(newPreviews);
    }

    onUpload(limitedFiles);
  };

  return (
    <div>
      <FileUpload
        id="file-upload"
        label={label}
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />

      {showPreviews && previews.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-4">
          {previews.map((src, idx) => (
            <Image
              key={idx}
              src={src}
              alt={`preview-${idx}`}
              width={96}
              height={96}
              className={previewClassName}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
