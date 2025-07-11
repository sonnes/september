'use client';

import React, { useState } from 'react';

import CardsList from '@/components/read/cards-list';
import ImageUploader from '@/components/read/image-uploader';
import { useCreateDeck } from '@/hooks/use-create-deck';
import { Deck } from '@/types/card';

const CreateStory: React.FC = () => {
  const { createDeck } = useCreateDeck();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImagesUploaded = async (images: File[]) => {
    setLoading(true);
    setError(null);
    setDeck(null);
    try {
      const formData = new FormData();
      images.forEach((file, idx) => {
        formData.append(`image${idx}`, file);
      });
      const res = await fetch('/api/read/extract-text', {
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
      setDeck(deck);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ImageUploader onUpload={handleImagesUploaded} />
      {loading && <div className="mt-4 text-blue-600">Extracting text from images...</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
      <div className="mt-8">
        <CardsList cards={deck?.cards || []} />
      </div>
    </>
  );
};

export default CreateStory;
