'use client';

import { useActionState } from 'react';

import { CloudArrowUpIcon, PhotoIcon } from '@heroicons/react/24/outline';

import { Banner } from '@/components/banner';
import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Input } from '@/components/catalyst/input';

import { updateMedicalInfo } from './actions';

const initialState = {
  success: false,
  message: '',
  inputs: {
    medical_info: '',
    primary_diagnosis: '',
    year_of_diagnosis: '',
    document: '',
  },
};

export default function MedicalInfo() {
  const [state, formAction, isPending] = useActionState(updateMedicalInfo, initialState);

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Medical Information</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          This information helps us ensure that we provide the voice cloning features only to people
          with speech disabilities.
        </p>
      </div>

      <form
        className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2"
        action={formAction}
      >
        <div className="px-4 py-6 sm:p-8">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <Field>
                <Label className="text-gray-900">Primary Diagnosis</Label>
                <Input
                  name="primary_diagnosis"
                  defaultValue={state.inputs?.primary_diagnosis?.toString()}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field>
                <Label className="text-gray-900">Year of Diagnosis</Label>
                <Input
                  name="year_of_diagnosis"
                  type="number"
                  defaultValue={state.inputs?.year_of_diagnosis?.toString()}
                />
              </Field>
            </div>

            <div className="col-span-full">
              <Field>
                <Label className="text-gray-900">Additional Medical Information</Label>
                <Input name="medical_info" defaultValue={state.inputs?.medical_info?.toString()} />
              </Field>
            </div>

            <div className="col-span-full">
              <Field>
                <Label className="text-gray-900">Medical Documents</Label>
                <p className="mt-1 text-sm/6 text-gray-600">
                  We require a note from your Neurologist/Physician that you have been diagnosed
                  with ALS. Please upload that note here.
                </p>
                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                  <div className="text-center">
                    <CloudArrowUpIcon
                      aria-hidden="true"
                      className="mx-auto size-12 text-gray-300"
                    />
                    <div className="mt-4 flex text-sm/6 text-gray-600">
                      <label
                        htmlFor="document"
                        className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                      >
                        <span>Upload a file</span>
                        <Input
                          id="document"
                          name="document"
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          className="sr-only"
                          defaultValue={state.inputs?.document?.toString()}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs/5 text-gray-600">
                      PDF, DOC, DOCX, JPG, JPEG, PNG up to 10MB
                    </p>
                  </div>
                </div>
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
