import Link from 'next/link';

import { CheckIcon as CheckIconSolid } from '@heroicons/react/20/solid';
import { ClockIcon, MicrophoneIcon, SpeakerWaveIcon, UserIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { getAccount } from '@/app/app/account/actions';
import Layout from '@/components/layout';

export default async function AppPage() {
  const account = await getAccount();

  const hasCompletedProfile = account?.has_consent ?? false;
  const isApproved = account?.approved ?? false;
  const hasVoice = account?.voice_id ? true : false;
  const hasFirstMessage = account?.has_first_message ?? false;

  const steps = [
    {
      name: 'Complete your Account',
      description: 'Fill in details of your medical condition and any other relevant information.',
      href: '/app/account',
      icon: <UserIcon className="h-5 w-5" />,
      status: hasCompletedProfile ? 'complete' : 'current',
      showAction: !hasCompletedProfile,
    },
    {
      name: hasCompletedProfile
        ? 'You are in the queue'
        : isApproved
          ? 'Approved'
          : 'Join the Waitlist',
      description: !hasCompletedProfile
        ? 'Voice cloning is only available to users with speech impairment.'
        : isApproved
          ? 'Your account has been approved!'
          : 'Your account is being reviewed.',
      href: '#',
      icon: isApproved ? <CheckIconSolid className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />,
      status: isApproved ? 'complete' : hasCompletedProfile ? 'current' : 'upcoming',
      showAction: false,
    },
    {
      name: 'Clone your Voice',
      description: hasVoice
        ? "You've successfully cloned your voice!"
        : 'Once approved, you can clone your voice by uploading audio samples.',
      href: '/app/clone',
      icon: <MicrophoneIcon className="h-5 w-5" />,
      status: hasVoice ? 'complete' : isApproved ? 'current' : 'upcoming',
      showAction: isApproved && !hasVoice,
    },
    {
      name: 'Start Talking',
      description: hasFirstMessage
        ? "You've sent your first message!"
        : 'Start using your assistant by typing a message.',
      href: '/app/messages',
      icon: <SpeakerWaveIcon className="h-5 w-5" />,
      status: hasFirstMessage ? 'complete' : hasVoice ? 'current' : 'upcoming',
      showAction: hasVoice && !hasFirstMessage,
    },
  ];

  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center gap-4">
          <div className="text-4xl">👋</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome! Let's get started
            </h1>
            <p className="mt-2 text-gray-50">
              Follow these steps to set up your account and start using your assistant.
            </p>
          </div>
        </div>
      </Layout.Header>
      <Layout.Content>
        <div className="p-6">
          <nav aria-label="Progress">
            <ol role="list" className="overflow-hidden">
              {steps.map((step, stepIdx) => (
                <li
                  key={step.name}
                  className={clsx(stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative')}
                >
                  {step.status === 'complete' ? (
                    <>
                      {stepIdx !== steps.length - 1 ? (
                        <div
                          aria-hidden="true"
                          className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-green-600"
                        />
                      ) : null}
                      <div className="group relative flex items-start">
                        <span className="flex h-9 items-center">
                          <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-green-600 text-white group-hover:bg-green-700">
                            {step.icon}
                          </span>
                        </span>
                        <span className="ml-4 flex min-w-0 flex-col">
                          <span className="text-md font-medium text-green-600">{step.name}</span>
                          <span className="text-sm text-gray-500">{step.description}</span>
                          {step.showAction && (
                            <div className="mt-4">
                              <Link
                                href={step.href}
                                className="inline-block rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                              >
                                {step.name}
                              </Link>
                            </div>
                          )}
                        </span>
                      </div>
                    </>
                  ) : step.status === 'current' ? (
                    <>
                      {stepIdx !== steps.length - 1 ? (
                        <div
                          aria-hidden="true"
                          className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300"
                        />
                      ) : null}
                      <div className="group relative flex items-start">
                        <span aria-hidden="true" className="flex h-9 items-center">
                          <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-amber-500 bg-white text-amber-500">
                            {step.icon}
                          </span>
                        </span>
                        <span className="ml-4 flex min-w-0 flex-col">
                          <span className="text-md font-medium text-amber-500">{step.name}</span>
                          <span className="text-sm text-gray-500">{step.description}</span>
                          {step.showAction && (
                            <div className="mt-4">
                              <Link
                                href={step.href}
                                className="inline-block rounded-md bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
                              >
                                {step.name}
                              </Link>
                            </div>
                          )}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {stepIdx !== steps.length - 1 ? (
                        <div
                          aria-hidden="true"
                          className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300"
                        />
                      ) : null}
                      <div className="group relative flex items-start">
                        <span aria-hidden="true" className="flex h-9 items-center">
                          <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white group-hover:border-gray-400">
                            {step.icon}
                          </span>
                        </span>
                        <span className="ml-4 flex min-w-0 flex-col">
                          <span className="text-md font-medium text-gray-500">{step.name}</span>
                          <span className="text-sm text-gray-500">{step.description}</span>
                          {step.showAction && (
                            <div className="mt-4">
                              <Link
                                href={step.href}
                                className="inline-block rounded-md border border-gray-200 bg-gray-100 px-4 py-2 font-semibold text-gray-400 cursor-not-allowed"
                              >
                                {step.name}
                              </Link>
                            </div>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </Layout.Content>
    </Layout>
  );
}
