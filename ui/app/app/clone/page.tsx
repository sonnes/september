import Layout from '@/components/layout';

import VoiceCloneForm from './form';

export const metadata = {
  title: 'Clone Your Voice',
  description: 'Create a new voice clone.',
};

export default function ClonePage() {
  return (
    <Layout>
      <Layout.Header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Clone Your Voice</h1>
      </Layout.Header>
      <Layout.Content>
        <div className="flex flex-col h-[calc(100vh-288px)]">
          <VoiceCloneForm />
        </div>
      </Layout.Content>
    </Layout>
  );
}
