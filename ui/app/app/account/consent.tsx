'use client';

import { useActionState } from 'react';

import { Banner } from '@/components/banner';
import { Button } from '@/components/catalyst/button';
import { Checkbox } from '@/components/catalyst/checkbox';

import { createAccount } from './actions';

const initialState = {
  success: false,
  message: '',
  inputs: {
    terms_accepted: false,
    privacy_accepted: false,
  },
};

export default function Consent() {
  const [state, formAction, isPending] = useActionState(createAccount, initialState);

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Terms and Conditions</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Please review and accept our terms and conditions to continue.
        </p>
      </div>

      <form
        className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2"
        action={formAction}
      >
        <div className="px-4 py-6 sm:p-8">
          <div className="max-w-2xl space-y-10">
            <fieldset>
              <div className="space-y-6">
                <div className="flex gap-3">
                  <div className="flex h-6 items-center">
                    <Checkbox name="terms_accepted" />
                  </div>
                  <div className="text-sm/6">
                    <label className="font-medium text-gray-900">
                      I accept the terms and conditions
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 items-center">
                    <Checkbox name="privacy_accepted" />
                  </div>
                  <div className="text-sm/6">
                    <label className="font-medium text-gray-900">I accept the privacy policy</label>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        {state.message && (
          <div className="px-4 sm:px-8">
            <Banner
              type={state.success ? 'success' : 'error'}
              title={state.success ? 'Success' : 'Error'}
              message={state.message}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}
