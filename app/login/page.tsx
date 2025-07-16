import Layout from '@/components/layout';

import LoginForm from './form';

export const metadata = {
  title: 'Login',
  description: 'Login to your account',
};

export default function LoginPage() {
  return (
    <Layout>
      <Layout.Header>&nbsp;</Layout.Header>
      <Layout.Content>
        <div className="bg-zinc-50">
          <LoginForm />
        </div>
      </Layout.Content>
    </Layout>
  );
}
