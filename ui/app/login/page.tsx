import Layout from '@/components/layout';

import LoginForm from './form';

export default function LoginPage() {
  return (
    <Layout>
      <Layout.Header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Login</h1>
      </Layout.Header>
      <Layout.Content>
        <div className="p-6">
          <LoginForm />
        </div>
      </Layout.Content>
    </Layout>
  );
}
