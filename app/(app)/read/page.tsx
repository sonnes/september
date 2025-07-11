import React from 'react';

import DecksList from '@/components/deck/list';
import Layout from '@/components/layout';

import CreateStory from './create-story';

export default function ReadPage() {
  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-white">Read</h1>
        </div>
      </Layout.Header>
      <Layout.Content>
        <DecksList />
        <CreateStory />
      </Layout.Content>
    </Layout>
  );
}
