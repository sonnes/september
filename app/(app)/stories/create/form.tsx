'use client';

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import { v4 as uuidv4 } from 'uuid';

import { useAccountContext } from '@/components/context/account-provider';
import FileUploader from '@/components/ui/file-uploader';
import { useCreateDeck } from '@/hooks/use-create-deck';
import { useToast } from '@/hooks/use-toast';
import { ExtractDeckResponse } from '@/services/gemini';

const CreateStory: React.FC = () => {
  const { putDeck } = useCreateDeck();
  const { showError } = useToast();
  const { account } = useAccountContext();
  const router = useRouter();

  const [extracting, setExtracting] = useState(false);

  const extractText = async (images: File[]): Promise<ExtractDeckResponse> => {
    const formData = new FormData();
    images.forEach((file, idx) => {
      formData.append(`image${idx}`, file);
    });
    const res = await fetch('/api/extract-text', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to extract text');
    }

    return await res.json();
  };

  const handleImagesUploaded = async (images: File[]) => {
    setExtracting(true);

    try {
      const extractedDeck = await extractText(images);
      const deck = await putDeck({
        deck: {
          id: extractedDeck.id,
          name: extractedDeck.name,
          user_id: account.id,
        },
        cards: extractedDeck.cards.map((card, index) => ({
          id: card.id || uuidv4(),
          text: card.text || '',
          rank: index,
          deck_id: extractedDeck.id,
          user_id: account.id,
        })),
      });

      router.push(`/stories/${deck.id}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      showError(errorMessage);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <>
      <FileUploader
        onUpload={handleImagesUploaded}
        accept="image/*"
        previewClassName="w-24 h-24 object-cover rounded border"
        showPreviews={true}
      />
      {extracting && (
        <div className="mt-4 text-blue-600">
          <div>Extracting text from images...</div>
        </div>
      )}
    </>
  );
};

export default CreateStory;
