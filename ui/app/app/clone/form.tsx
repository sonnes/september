'use client';

import { useState } from 'react';
import { useActionState } from 'react';

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

export default function VoiceCloneForm() {
  const [state, formAction, isPending] = useActionState(cloneVoice, initialState);

  const { account } = useAccount();

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

      <form action={formAction} className="space-y-8 pb-24">
        {/* Common Fields */}
        {!account.approved && (
          <Banner
            type="warning"
            title="You are on the waitlist"
            message="Please wait for approval to create a voice clone. Meanwhile, you can upload or record voice samples."
          />
        )}
        {account.approved && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
          <UploadSection />

          {/* Divider */}
          <div className="flex md:flex-col items-center justify-center h-full">
            {/* Vertical divider (desktop) */}
            <div className="hidden md:flex flex-col items-center justify-center h-full w-full min-h-[400px]">
              <div className="flex-1 w-px bg-zinc-200" />
              <div className="bg-zinc-50 rounded-full p-4">
                <span className="text-zinc-600 text-lg font-medium">OR</span>
              </div>
              <div className="flex-1 w-px bg-zinc-200" />
            </div>

            {/* Horizontal divider (mobile) */}
            <div className="md:hidden w-full flex items-center gap-4 py-4">
              <div className="h-px flex-1 bg-zinc-200" />
              <div className="bg-zinc-50 rounded-full p-4">
                <span className="text-zinc-600 text-lg font-medium">OR</span>
              </div>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>
          </div>

          {/* Record Section */}
          <RecordingSection />
        </div>

        {/* Sticky submit button */}
        {account.approved && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
              {state.message && (
                <p
                  className={`text-md font-semibold ${state.success ? 'text-green-600' : 'text-red-600'}`}
                >
                  {state.message}
                </p>
              )}
              <div className="flex-shrink-0 ml-auto">
                <Button type="submit" color="blue" disabled={isPending}>
                  {isPending ? 'Creating Voice Clone...' : 'Create Voice Clone'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
