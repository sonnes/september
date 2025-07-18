'use client';

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import FileUploader from '@/components/ui/file-uploader';
import { useCreateDeck } from '@/hooks/use-create-deck';
import { generateAudio } from '@/hooks/use-create-message';
import { triplit } from '@/triplit/client';
import { Card } from '@/types/card';

const CreateStory: React.FC = () => {
  const { createDeck } = useCreateDeck();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDeckAudio = async (cards: Card[]) => {
    cards.forEach(async card => {
      const audio = await generateAudio({ text: card.text });

      // update the card with the audio
      await triplit?.update('cards', card.id, {
        audio,
      });
    });
  };

  const handleImagesUploaded = async (images: File[]) => {
    setLoading(true);
    setError(null);

    try {
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
      const data = await res.json();

      const deck = await createDeck({
        name: data.name,
        cards: data.cards,
      });

      await generateDeckAudio(deck.cards || []);

      router.push(`/stories/${deck.id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
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
      {loading && <div className="mt-4 text-blue-600">Extracting text from images...</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </>
  );
};

export default CreateStory;
