import SingleColumnLayout from '@/components/layouts/single-column';

import LoginForm from './form';

export default function LoginPage() {
  return (
    <SingleColumnLayout title="Login" color="cyan">
      <div className="p-6">
        <LoginForm />
      </div>
    </SingleColumnLayout>
  );
}
