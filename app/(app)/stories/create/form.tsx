'use client';

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import { v4 as uuidv4 } from 'uuid';

import FileUploader from '@/components/ui/file-uploader';
import { useCreateDeck } from '@/hooks/use-create-deck';
import { useCreateSpeech } from '@/hooks/use-create-speech';
import DecksService from '@/services/decks';
import supabase from '@/supabase/client';
import { Card, PartialCard, PartialDeck } from '@/types/card';

const CreateStory: React.FC = () => {
  const { createDeck } = useCreateDeck();
  const { bulkCreateSpeech } = useCreateSpeech();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decksService = new DecksService(supabase);

  const extractText = async (images: File[]): Promise<PartialDeck> => {
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

  const generateDeckAudio = async (cards: PartialCard[]) => {
    try {
      // Extract text from all cards
      const texts = cards.map(card => card.text).filter(text => text !== undefined);

      // Generate audio for all texts in bulk
      const audioResults = await bulkCreateSpeech({ texts });

      // Stitch the audio results to the cards
      const stitchedCards = cards.map((card, index) => ({
        ...card,
        audio: audioResults[index],
      }));

      return stitchedCards;
    } catch (error) {
      console.error('Error generating audio:', error);
      // Don't throw here - audio generation failure shouldn't prevent story creation
    }
  };

  const handleImagesUploaded = async (images: File[]) => {
    setLoading(true);
    setError(null);

    try {
      const { name, cards } = await extractText(images);

      const cardsWithAudio = await generateDeckAudio(cards || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
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
      {loading && (
        <div className="mt-4 text-blue-600">
          <div>Extracting text from images...</div>
          <div className="text-sm text-gray-500 mt-1">Generating audio narration...</div>
        </div>
      )}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </>
  );
};

export default CreateStory;
