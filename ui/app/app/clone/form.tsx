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
        {!account.approved && (
          <Banner
            type="warning"
            title="You are on the waitlist"
            message="Please wait for approval to create a voice clone. Meanwhile, you can upload or record voice samples."
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload and Record */}
          <div className="flex flex-col gap-8">
            <UploadSection />

            {/* Divider */}
            <div className="flex items-center gap-4 py-4">
              <div className="h-px flex-1 bg-zinc-200" />
              <div className="bg-zinc-50 rounded-full p-4">
                <span className="text-zinc-600 text-lg font-medium">OR</span>
              </div>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            {/* Record Section */}
            <RecordingSection />
          </div>

          {/* Right Column - Form Fields */}
          <div className="bg-white rounded-lg shadow-sm ring-1 ring-zinc-950/5 p-6 h-fit lg:sticky lg:top-4">
            <Heading level={4}>Voice Details</Heading>
            <div className="mt-6 space-y-6">
              {!account.approved ? (
                <p className="text-sm text-zinc-500">
                  You will be able to clone a voice once your account is approved.
                </p>
              ) : (
                <>
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
                      <p className="mt-2 text-sm text-red-500">
                        {state.errors.description.join(', ')}
                      </p>
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
                    <Button type="submit" color="blue" disabled={isPending} className="w-full">
                      {isPending ? 'Creating Voice Clone...' : 'Create Voice Clone'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
