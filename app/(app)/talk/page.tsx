import type { Metadata } from 'next';

import Editor from '@/components/editor/simple';
import Layout from '@/components/layout';

export const metadata: Metadata = {
  title: 'Talk - September',
};

export default function TalkPage() {
  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-white">Talk</h1>
          <div className="flex items-center space-x-2"></div>
        </div>
      </Layout.Header>
      <Layout.Content>
        <Editor />
      </Layout.Content>
    </Layout>
  );
}
