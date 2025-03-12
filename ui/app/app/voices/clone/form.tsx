'use client';

import { useState } from 'react';
import { useActionState } from 'react';

import { MagnifyingGlassIcon } from '@heroicons/react/16/solid';

import { Banner } from '@/components/banner';
import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Heading } from '@/components/catalyst/heading';
import { Input } from '@/components/catalyst/input';
import { useAccount } from '@/components/context/auth';

import { type CloneVoiceResponse, cloneVoice } from './actions';
import { RecordingSection } from './record';
import { UploadSection } from './upload';

const initialState: CloneVoiceResponse = {
  success: false,
  message: '',
  inputs: {
    name: '',
    description: '',
  },
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function VoiceCloneForm() {
  const [state, formAction, isPending] = useActionState(cloneVoice, initialState);
  const { account } = useAccount();
  const [activeTab, setActiveTab] = useState('upload');

  const tabs = [
    { name: 'Upload Audio', value: 'upload' },
    { name: 'Record Audio', value: 'record' },
  ];

  return (
    <div>
      {state.message && (
        <div className="mb-6">
          <Banner
            type={state.success ? 'success' : 'error'}
            title={state.success ? 'Success' : 'Error'}
            message={state.message}
          />
        </div>
      )}

      <form action={formAction} className="space-y-8 pb-24 max-w-2xl">
        {!account.approved && (
          <Banner
            type="warning"
            title="You are on the waitlist"
            message="Please wait for approval to create a voice clone. Meanwhile, you can upload or record voice samples."
          />
        )}

        {/* Upload and Record Tabs */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-zinc-950/5 p-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex" aria-label="Tabs">
              {tabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  type="button"
                  className={classNames(
                    tab.value === activeTab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                    'w-1/2 border-b-2 py-4 px-1 text-center text-sm font-medium'
                  )}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-8">
            {activeTab === 'upload' ? <UploadSection /> : <RecordingSection />}
          </div>
        </div>

        {/* Voice Details */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-zinc-950/5 p-6">
          <Heading level={4}>Voice Details</Heading>
          <div className="mt-6 space-y-6">
            <Field>
              <Label>Name</Label>
              <Input
                name="name"
                defaultValue={state.inputs?.name}
                required
                placeholder="The name that identifies this voice."
              />
              {state.errors?.name && (
                <p className="mt-2 text-sm text-red-500">{state.errors.name.join(', ')}</p>
              )}
            </Field>

            <Field>
              <Label>Description</Label>
              <Input
                name="description"
                defaultValue={state.inputs?.description}
                placeholder="How would you describe the voice?"
              />
              {state.errors?.description && (
                <p className="mt-2 text-sm text-red-500">{state.errors.description.join(', ')}</p>
              )}
            </Field>

            {/* Submit Button */}
            <div className="pt-4 mt-6 border-t border-zinc-200">
              {state.message && (
                <p
                  className={`mb-4 text-md font-semibold ${state.success ? 'text-green-600' : 'text-red-600'}`}
                >
                  {state.message}
                </p>
              )}
              <Button
                type="submit"
                color="blue"
                disabled={isPending || !account.approved}
                className="w-full"
              >
                {!account.approved
                  ? 'You are on the waitlist'
                  : isPending
                    ? 'Creating Voice Clone...'
                    : 'Create Voice Clone'}
              </Button>
            </div>
          </div>
        </div>

        {/* Find Similar Voices */}
        <div className="bg-white rounded-lg shadow-sm ring-1 ring-zinc-950/5 p-6">
          <Heading level={4}>Find Similar Voices</Heading>
          <div className="mt-6 space-y-6">
            <p>
              Not satisfied with the cloned voice? Try searching for similar voices using the
              samples you uploaded or recorded.
            </p>
            <Button href="/app/voices?search=similar" outline>
              <MagnifyingGlassIcon className="w-4 h-4" /> Search for Similar Voices
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
