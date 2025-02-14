import Link from 'next/link';

import {
  CheckCircleIcon,
  ClockIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Button } from '@/components/catalyst/button';
import Layout from '@/components/layout';

import { getAccount } from './account/actions';

export default async function LoginPage() {
  const account = await getAccount();

  const hasCompletedProfile = account?.has_consent ?? false;
  const isApproved = account?.approved ?? false;
  const hasVoice = account?.voice_id ? true : false;
  const hasFirstMessage = account?.has_first_message ?? false;

  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-400 p-3">
            <div className="flex h-full items-center justify-center">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M7.03 4.95L3.49 8.49c-3.32 3.32-3.32 8.7 0 12.02s8.7 3.32 12.02 0l3.54-3.54M7.03 4.95L8.51 6.43m-1.48-1.48l1.48 1.48M19.05 16.97l-1.48-1.48m1.48 1.48l-1.48-1.48m1.48 1.48l3.54-3.54c3.32-3.32 3.32-8.7 0-12.02s-8.7-3.32-12.02 0L7.03 4.95"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Welcome! Let's get started
            </h1>
            <p className="mt-2 text-gray-50">
              Follow these steps to set up your account and start creating voices.
            </p>
          </div>
        </div>
      </Layout.Header>
      <Layout.Content>
        <div className="p-6 space-y-8">
          <div className="space-y-6">
            {/* Complete Account Step */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <StepStatus
                  completed={hasCompletedProfile}
                  icon={<UserIcon className="h-6 w-6" />}
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Complete your account information
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Fill in your profile details and verify your email address.
                </p>
                {!hasCompletedProfile && (
                  <div className="mt-4">
                    <Link
                      href="/app/account"
                      className={clsx(
                        'inline-block px-4 py-2 rounded-md font-semibold',
                        'bg-blue-600 text-white hover:bg-blue-700'
                      )}
                    >
                      Complete Account
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Approval Step */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <StepStatus
                  completed={isApproved}
                  icon={
                    isApproved ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <ClockIcon className="h-6 w-6" />
                    )
                  }
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Wait for approval
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {isApproved
                    ? 'Your account has been approved!'
                    : "Your account is being reviewed. We'll notify you once it's approved."}
                </p>
              </div>
            </div>

            {/* Create Voice Step */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <StepStatus completed={hasVoice} icon={<MicrophoneIcon className="h-6 w-6" />} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Create a new voice
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {hasVoice
                    ? "You've successfully cloned your voice!"
                    : 'Once approved, you can clone your voice by uploading audio samples.'}
                </p>
                <div className="mt-4 flex gap-4">
                  <Link
                    href="/app/clone"
                    className={clsx(
                      'inline-block px-4 py-2 rounded-md font-semibold',
                      isApproved && !hasVoice
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                    )}
                  >
                    Clone voice
                  </Link>
                </div>
              </div>
            </div>

            {/* Send Message Step */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <StepStatus
                  completed={hasFirstMessage}
                  icon={<PaperAirplaneIcon className="h-6 w-6 rotate-325" />}
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Send a message
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {hasFirstMessage
                    ? "You've sent your first message!"
                    : 'Start sending messages using your new voice.'}
                </p>
                <div className="mt-4 flex gap-4">
                  <Link
                    href="/app/messages"
                    className={clsx(
                      'inline-block px-4 py-2 rounded-md font-semibold',
                      hasVoice && !hasFirstMessage
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                    )}
                  >
                    Send message
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout.Content>
    </Layout>
  );
}

const StepStatus = ({ completed, icon }: { completed: boolean; icon: React.ReactNode }) => {
  return (
    <div
      className={clsx(
        'flex h-8 w-8 items-center justify-center rounded-full',
        completed ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'
      )}
    >
      {icon}
    </div>
  );
};
