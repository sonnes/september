import { getAccount } from '@/app/app/account/actions';
import { Heading } from '@/components/catalyst/heading';
import { AccountProvider } from '@/components/context/auth';
import Layout from '@/components/layout';

import { getRecordings, getUploadedFiles } from './actions';
import { RecordingProvider, UploadProvider } from './context';
import VoiceCloneForm from './form';

export const metadata = {
  title: 'Clone Your Voice',
  description: 'Create a new voice clone.',
};

export default async function ClonePage() {
  const [account, uploadedFiles, recordings] = await Promise.all([
    getAccount(),
    getUploadedFiles(),
    getRecordings(),
  ]);

  return (
    <AccountProvider account={account}>
      <Layout>
        <Layout.Header>
          <h1 className="text-3xl font-bold tracking-tight text-white">Clone Your Voice</h1>
        </Layout.Header>
        <Layout.Content>
          <div className="flex flex-col">
            <UploadProvider initialUploadedFiles={uploadedFiles}>
              <RecordingProvider initialRecordings={recordings}>
                <VoiceCloneForm />
              </RecordingProvider>
            </UploadProvider>
          </div>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
