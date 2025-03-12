import { getVoices } from '@/app/actions/voices';
import { getAccount } from '@/app/app/account/actions';
import { AccountProvider } from '@/components/context/auth';
import Layout from '@/components/layout';

import Help from '../help';
import { getRecordings, getUploadedFiles } from './actions';
import { RecordingProvider, UploadProvider } from './context';
import VoiceCloneForm from './form';

export const metadata = {
  title: 'Clone Your Voice',
  description: 'Create a digital clone of your voice.',
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-4">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2 text-3xl">
                  <li>
                    <a href="/app/voices" className="text-gray-200 hover:text-gray-100">
                      Voices
                    </a>
                  </li>
                  <li className="text-gray-200">/</li>
                  <li className="text-white font-bold tracking-tight">Clone Your Voice</li>
                </ol>
              </nav>
            </div>
            <Help />
          </div>
        </Layout.Header>
        <Layout.Content>
          <UploadProvider initialUploadedFiles={uploadedFiles}>
            <RecordingProvider initialRecordings={recordings}>
              <VoiceCloneForm />
            </RecordingProvider>
          </UploadProvider>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
