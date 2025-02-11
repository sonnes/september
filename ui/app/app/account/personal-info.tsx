'use client';

import { useActionState } from 'react';

import { Banner } from '@/components/banner';
import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Input } from '@/components/catalyst/input';

import { updatePersonalInfo } from './actions';

const initialState = {
  success: false,
  message: '',
  inputs: {
    first_name: '',
    last_name: '',
    city: '',
    country: '',
    contact_name: '',
    contact_email: '',
  },
};

export default function PersonalInfo() {
  const [state, formAction, isPending] = useActionState(updatePersonalInfo, initialState);

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Personal Information</h2>
        <p className="mt-1 text-sm/6 text-gray-600">Please provide your personal details.</p>
      </div>

      <form
        className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2"
        action={formAction}
      >
        <div className="px-4 py-6 sm:p-8">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Field>
                <Label className="text-gray-900">First Name</Label>
                <Input name="first_name" defaultValue={state.inputs?.first_name?.toString()} />
              </Field>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <Label className="text-gray-900">Last Name</Label>
                <Input name="last_name" defaultValue={state.inputs?.last_name?.toString()} />
              </Field>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <Label className="text-gray-900">City</Label>
                <Input name="city" defaultValue={state.inputs?.city?.toString()} />
              </Field>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <Label className="text-gray-900">Country</Label>
                <Input name="country" defaultValue={state.inputs?.country?.toString()} />
              </Field>
            </div>

            <div className="col-span-full">
              <h3 className="text-lg font-medium text-gray-900">Alternative Contact</h3>
              <p className="mt-1 text-sm/6 text-gray-600">
                Optional. Details of caretaker, friend or family member who is helping you with your
                use of the service.
              </p>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <Label className="text-gray-900">Contact Name</Label>
                <Input name="contact_name" defaultValue={state.inputs?.contact_name?.toString()} />
              </Field>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <Label className="text-gray-900">Contact Email</Label>
                <Input
                  name="contact_email"
                  type="email"
                  defaultValue={state.inputs?.contact_email?.toString()}
                />
              </Field>
            </div>
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
