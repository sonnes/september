'use client';

import { useActionState } from 'react';

import { DocumentIcon } from '@heroicons/react/24/outline';

import { signUp } from '@/app/actions/user';
import type { SignUpResponse } from '@/app/actions/user';
import { Banner } from '@/components/banner';
import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Heading } from '@/components/catalyst/heading';
import { Input } from '@/components/catalyst/input';
import { Radio, RadioField, RadioGroup } from '@/components/catalyst/radio';

const initialState: SignUpResponse = {
  success: false,
  message: '',
  inputs: {
    name: '',
    email: '',
    password: '',
    city: '',
    country: '',
    userType: '',
    diagnosis: '',
    yearOfDiagnosis: '',
    termsAccepted: false,
    privacyAccepted: false,
  },
};

export default function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-8">
      {/* Personal Information Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-zinc-900/10 dark:border-zinc-100/10 pb-12 md:grid-cols-3">
        <div>
          <Heading level={2}>Personal Information</Heading>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Please provide your basic information to create your account.
          </p>
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
          <div className="sm:col-span-4">
            <Field>
              <Label>Full Name</Label>
              <Input
                name="name"
                defaultValue={state.inputs?.name}
                required
                placeholder="Your full name"
              />
            </Field>
          </div>

          <div className="sm:col-span-4">
            <Field>
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                defaultValue={state.inputs?.email}
                required
                placeholder="you@example.com"
              />
            </Field>
          </div>

          <div className="sm:col-span-4">
            <Field>
              <Label>Password</Label>
              <Input
                name="password"
                type="password"
                defaultValue={state.inputs?.password}
                required
                placeholder="••••••••"
              />
            </Field>
          </div>

          <div className="sm:col-span-3">
            <Field>
              <Label>City</Label>
              <Input
                name="city"
                defaultValue={state.inputs?.city}
                required
                placeholder="Your city"
              />
            </Field>
          </div>

          <div className="sm:col-span-3">
            <Field>
              <Label>Country</Label>
              <Input
                name="country"
                defaultValue={state.inputs?.country}
                required
                placeholder="Your country"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Medical Information Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-zinc-900/10 dark:border-zinc-100/10 pb-12 md:grid-cols-3">
        <div>
          <Heading level={2}>Medical Information</Heading>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            This information helps us ensure that we provide the voice cloning features only to
            people with speech disabilities.
          </p>
        </div>

        <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
          <div className="col-span-full">
            <Field>
              <Label>I am a</Label>
              <RadioGroup
                name="userType"
                defaultValue={state.inputs?.userType}
                className="mt-2 flex gap-6"
              >
                <RadioField className="flex items-center gap-2">
                  <Radio value="patient" />
                  <Label>Patient</Label>
                </RadioField>
                <RadioField className="flex items-center gap-2">
                  <Radio value="caregiver" />
                  <Label>Caregiver</Label>
                </RadioField>
              </RadioGroup>
            </Field>
          </div>

          <div className="sm:col-span-4">
            <Field>
              <Label>Diagnosis</Label>
              <Input
                name="diagnosis"
                defaultValue={state.inputs?.diagnosis}
                required
                placeholder="Enter diagnosis"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field>
              <Label>Year of Diagnosis</Label>
              <Input
                name="yearOfDiagnosis"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                defaultValue={state.inputs?.yearOfDiagnosis}
                required
                placeholder="YYYY"
              />
            </Field>
          </div>

          <div className="col-span-full">
            <Field>
              <Label>Diagnosis Document</Label>
              <div className="mt-2 flex justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-10">
                <div className="text-center">
                  <DocumentIcon className="mx-auto h-12 w-12 text-zinc-300" />
                  <div className="mt-4 flex text-sm text-zinc-600 dark:text-zinc-400">
                    <label className="relative cursor-pointer rounded-md bg-white dark:bg-zinc-900 font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        name="diagnosisDocument"
                        className="sr-only"
                        accept=".pdf,.doc,.docx"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">PDF, DOC up to 10MB</p>
                </div>
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* Consent Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-zinc-900/10 dark:border-zinc-100/10 pb-12 md:grid-cols-3">
        <div>
          <Heading level={2}>Consent</Heading>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Please review and accept our terms and conditions.
          </p>
        </div>

        <div className="max-w-2xl space-y-6 md:col-span-2">
          <div className="space-y-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              We collect and process your data to provide our voice cloning services. Your data will
              be shared with:
              <ul className="list-disc ml-6 mt-2">
                <li>Our voice synthesis partners to create your digital voice</li>
                <li>Healthcare providers you explicitly authorize</li>
                <li>Research institutions (anonymized data only)</li>
              </ul>
            </p>

            <div className="flex gap-3">
              <input
                type="checkbox"
                id="terms"
                name="termsAccepted"
                defaultChecked={state.inputs?.termsAccepted}
                required
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="terms" className="text-sm text-zinc-600 dark:text-zinc-400">
                I agree to the{' '}
                <a href="#" className="text-blue-600 hover:underline">
                  Terms and Conditions
                </a>
              </label>
            </div>

            <div className="flex gap-3">
              <input
                type="checkbox"
                id="privacy"
                name="privacyAccepted"
                defaultChecked={state.inputs?.privacyAccepted}
                required
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="privacy" className="text-sm text-zinc-600 dark:text-zinc-400">
                I agree to the{' '}
                <a href="#" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>
          </div>
        </div>
      </div>

      {state.message && (
        <Banner
          type={state.success ? 'success' : 'error'}
          title={state.success ? 'Success' : 'Error'}
          message={state.message}
        />
      )}

      <div className="mt-6 flex items-center justify-end gap-x-6">
        <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
          {isPending ? 'Creating Account...' : 'Create Account'}
        </Button>
      </div>
    </form>
  );
}
