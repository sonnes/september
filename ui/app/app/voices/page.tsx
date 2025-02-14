import Layout from '@/components/layout';

import { getVoices } from './actions';
import VoiceList from './voice-list';

export default async function VoicesPage() {
  const response = await getVoices({});

  return (
    <Layout>
      <Layout.Header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Voices</h1>
      </Layout.Header>
      <Layout.Content>
        <VoiceList
          voices={response.voices}
          has_more={response.has_more}
          last_sort_id={response.last_sort_id}
        />
      </Layout.Content>
    </Layout>
  );
}
