import SingleColumnLayout from '@/layouts/single-column';

import SignUpForm from './simple';

export default function SignUpPage() {
  return (
    <SingleColumnLayout title="Sign Up" color="cyan">
      <div className="p-6">
        <SignUpForm />
      </div>
    </SingleColumnLayout>
  );
}
