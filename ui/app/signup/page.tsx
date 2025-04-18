import Layout from '@/components/layout';

import SignUpForm from './form';

export const metadata = {
  title: 'Sign Up',
  description: 'Create an account to get started',
};

export default function SignUpPage() {
  return (
    <Layout>
      <Layout.Header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Sign Up</h1>
      </Layout.Header>
      <Layout.Content>
        <div className="p-6">
          <SignUpForm />
        </div>
      </Layout.Content>
    </Layout>
  );
}
