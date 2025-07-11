import React, { useRef, useState } from 'react';

import { FileUpload } from '@/components/ui/file-upload';

type ImageUploaderProps = {
  onUpload: (files: File[]) => void;
};

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload }) => {
  const [previews, setPreviews] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArr = Array.from(files);
    setPreviews(fileArr.map(file => URL.createObjectURL(file)));
    onUpload(fileArr);
  };

  return (
    <div>
      <FileUpload
        id="image-upload"
        label="Upload image(s)"
        accept="image/*"
        onChange={handleChange}
      />
      <div className="flex gap-2 flex-wrap mt-4">
        {previews.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`preview-${idx}`}
            className="w-24 h-24 object-cover rounded border"
          />
        ))}
      </div>
    </div>
  );
};

export default ImageUploader;
