import { Metadata } from 'next';

import Layout from '@/components/layout';

import Consent from './consent';
import MedicalInfo from './medical-info';
import PersonalInfo from './personal-info';

export const metadata: Metadata = {
  title: 'Your Account',
  description: 'Your account information',
};

export default async function AccountPage() {
  return (
    <Layout>
      <Layout.Header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Your Account</h1>
      </Layout.Header>
      <Layout.Content>
        <div className="divide-y divide-zinc-800">
          <PersonalInfo />
          <MedicalInfo />
          <Consent />
        </div>
      </Layout.Content>
    </Layout>
  );
}
