'use client';

import React, { useState } from 'react';

import Layout from '@/components/layout';
import CardsList from '@/components/read/cards-list';
import ImageUploader from '@/components/read/image-uploader';
import { FormSectionHeader } from '@/components/ui/form-section-header';
import { TextCard } from '@/types/card';

export default function ReadPage() {
  const [cards, setCards] = useState<TextCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImagesUploaded = async (images: File[]) => {
    setLoading(true);
    setError(null);
    setCards([]);
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
      setCards(data || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-white">Read</h1>
        </div>
      </Layout.Header>
      <Layout.Content>
        <ImageUploader onUpload={handleImagesUploaded} />
        {loading && <div className="mt-4 text-blue-600">Extracting text from images...</div>}
        {error && <div className="mt-4 text-red-600">{error}</div>}
        <div className="mt-8">
          <CardsList cards={cards} />
        </div>
      </Layout.Content>
    </Layout>
  );
}
