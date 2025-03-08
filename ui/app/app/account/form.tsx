'use client';

import { useActionState } from 'react';
import { useState } from 'react';

import { CheckCircleIcon, CloudArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/catalyst/button';
import { Checkbox } from '@/components/catalyst/checkbox';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Input } from '@/components/catalyst/input';
import { useAccount, useAuth } from '@/components/context/auth';
import { createClient } from '@/supabase/client';

import { type UpdateAccountResponse, deleteDocument, updateAccount } from './actions';

// Personal Info Section
function PersonalInfoSection({ state }: { state: UpdateAccountResponse }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Personal Information</h2>
        <p className="mt-1 text-sm/6 text-gray-600">Please provide your personal details.</p>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-xl md:col-span-2">
        <div className="px-4 py-6 sm:p-8">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">First Name</Label>
                  <span className="text-red-500 text-xs">*Required</span>
                </div>
                <Input
                  name="first_name"
                  defaultValue={state.inputs?.first_name?.toString()}
                  required
                />
                {state.errors?.first_name && (
                  <p className="mt-2 text-sm text-red-500">{state.errors.first_name.join(', ')}</p>
                )}
              </Field>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">Last Name</Label>
                </div>
                <Input name="last_name" defaultValue={state.inputs?.last_name?.toString()} />
                {state.errors?.last_name && (
                  <p className="mt-2 text-sm text-red-500">{state.errors.last_name.join(', ')}</p>
                )}
              </Field>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">City</Label>
                  <span className="text-red-500 text-xs">*Required</span>
                </div>
                <Input name="city" defaultValue={state.inputs?.city?.toString()} required />
                {state.errors?.city && (
                  <p className="mt-2 text-sm text-red-500">{state.errors.city.join(', ')}</p>
                )}
              </Field>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">Country</Label>
                  <span className="text-red-500 text-xs">*Required</span>
                </div>
                <Input name="country" defaultValue={state.inputs?.country?.toString()} required />
                {state.errors?.country && (
                  <p className="mt-2 text-sm text-red-500">{state.errors.country.join(', ')}</p>
                )}
              </Field>
            </div>

            <div className="col-span-full">
              <h3 className="font-medium text-gray-900">Alternative Contact</h3>
              <p className="mt-1 text-sm/6 text-gray-600">
                Optional. Details of caretaker, friend or family member who is helping you with your
                use of the service.
              </p>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">Contact Name</Label>
                </div>
                <Input name="contact_name" defaultValue={state.inputs?.contact_name?.toString()} />
                {state.errors?.contact_name && (
                  <p className="mt-2 text-sm text-red-500">
                    {state.errors.contact_name.join(', ')}
                  </p>
                )}
              </Field>
            </div>

            <div className="sm:col-span-3">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">Contact Email</Label>
                </div>
                <Input
                  name="contact_email"
                  type="email"
                  defaultValue={state.inputs?.contact_email?.toString()}
                />
                {state.errors?.contact_email && (
                  <p className="mt-2 text-sm text-red-500">
                    {state.errors.contact_email.join(', ')}
                  </p>
                )}
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Medical Info Section
function MedicalInfoSection({ state }: { state: UpdateAccountResponse }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentPath, setDocumentPath] = useState(state.inputs?.document_path || null);

  const supabase = createClient();
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileName = `${user?.id}/${file.name}`;

      const { data, error } = await supabase.storage.from('documents').upload(fileName, file, {
        cacheControl: 'no-cache',
        upsert: true,
      });

      if (error) throw error;

      setDocumentPath(data.path);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentPath) return;

    try {
      await deleteDocument(documentPath);

      setDocumentPath(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Medical Information</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          This information helps us ensure that we provide the voice cloning features only to people
          with speech disabilities.
        </p>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-xl md:col-span-2">
        <div className="px-4 py-6 sm:p-8">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">Primary Diagnosis</Label>
                  <span className="text-red-500 text-xs">*Required</span>
                </div>
                <Input
                  name="primary_diagnosis"
                  defaultValue={state.inputs?.primary_diagnosis?.toString()}
                  required
                />
                {state.errors?.primary_diagnosis && (
                  <p className="mt-2 text-sm text-red-500">
                    {state.errors.primary_diagnosis.join(', ')}
                  </p>
                )}
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">Year of Diagnosis</Label>
                  <span className="text-red-500 text-xs">*Required</span>
                </div>
                <Input
                  name="year_of_diagnosis"
                  type="number"
                  defaultValue={state.inputs?.year_of_diagnosis?.toString()}
                  required
                />
                {state.errors?.year_of_diagnosis && (
                  <p className="mt-2 text-sm text-red-500">
                    {state.errors.year_of_diagnosis.join(', ')}
                  </p>
                )}
              </Field>
            </div>

            <div className="col-span-full">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">
                    Additional Medical Information
                  </Label>
                </div>
                <Input
                  name="medical_notes"
                  defaultValue={state.inputs?.medical_notes?.toString()}
                />
                {state.errors?.medical_notes && (
                  <p className="mt-2 text-sm text-red-500">
                    {state.errors.medical_notes.join(', ')}
                  </p>
                )}
              </Field>
            </div>

            <div className="col-span-full">
              <Field>
                <div className="p-1 flex justify-between items-center">
                  <Label className="font-medium text-gray-900">Medical Documents</Label>
                  <span className="text-red-500 text-xs">*Required</span>
                </div>
                <p className="mt-1 text-sm/6 text-gray-600">
                  To provide free voice cloning services, we require a note from your
                  Neurologist/Physician that states your diagnosis. Please upload that note here.
                </p>
                {documentPath ? (
                  <div className="mt-2 flex items-center gap-4">
                    <input type="hidden" name="document_path" value={documentPath} />
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircleIcon className="size-5" />
                      <span className="text-sm">Document uploaded successfully</span>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-100"
                      onClick={handleDelete}
                    >
                      <TrashIcon className="size-4" />
                      Delete Document
                    </button>
                  </div>
                ) : (
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
                          <span>{isUploading ? 'Uploading...' : 'Upload a file'}</span>
                          <Input
                            id="document"
                            name="document"
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="sr-only"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
                      <p className="text-xs/5 text-gray-600">
                        PDF, DOC, DOCX, JPG, JPEG, PNG up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Consent Section
function ConsentSection({ state }: { state: UpdateAccountResponse }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Terms and Conditions</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Please review and accept our terms and conditions to continue.
        </p>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-xl md:col-span-2">
        <div className="px-4 py-6 sm:p-8">
          <div className="max-w-2xl space-y-10">
            <fieldset>
              <div className="space-y-6">
                <div className="flex gap-3">
                  <div className="flex h-6 items-center">
                    <Checkbox
                      name="terms_accepted"
                      defaultChecked={state.inputs?.terms_accepted ?? false}
                    />
                  </div>
                  <div className="text-sm/6">
                    <label className="font-medium text-gray-900">
                      I accept the terms and conditions
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 items-center">
                    <Checkbox
                      name="privacy_accepted"
                      defaultChecked={state.inputs?.privacy_accepted ?? false}
                    />
                  </div>
                  <div className="text-sm/6">
                    <label className="font-medium text-gray-900">I accept the privacy policy</label>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Form Component
export default function AccountForm() {
  const { account } = useAccount();

  const initialState: UpdateAccountResponse = {
    success: false,
    message: '',
    inputs: {
      first_name: account.first_name ?? '',
      last_name: account.last_name ?? '',
      city: account.city ?? '',
      country: account.country ?? '',
      contact_name: account.contact_name ?? '',
      contact_email: account.contact_email ?? '',
      primary_diagnosis: account.primary_diagnosis ?? '',
      year_of_diagnosis: account.year_of_diagnosis ?? 1999,
      medical_notes: account.medical_notes ?? '',
      terms_accepted: account.terms_accepted ?? false,
      privacy_accepted: account.privacy_accepted ?? false,
      document_path: account.document_path ?? '',
      has_consent: account.has_consent ?? false,
    },
    errors: {},
  };

  const [state, formAction, isPending] = useActionState(updateAccount, initialState);

  return (
    <div className="divide-y divide-gray-400">
      <form action={formAction}>
        <PersonalInfoSection state={state} />
        <MedicalInfoSection state={state} />
        <ConsentSection state={state} />

        {/* Add floating save button */}
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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
