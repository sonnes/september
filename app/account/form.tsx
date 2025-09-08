'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { AccountFormData, AccountSchema, SectionProps } from '@/components/settings';
import { Button } from '@/components/ui/button';
import FileUploader from '@/components/ui/file-uploader';
import { FormCheckbox, FormInput } from '@/components/ui/form';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';

// Personal Information Section
function PersonalInfoSection({ control }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Personal Information</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Please provide your basic personal information.
        </p>
      </div>

      <div className="md:col-span-2">
        <div className="px-4">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <FormInput
                name="name"
                control={control}
                label="Full Name"
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="sm:col-span-3">
              <FormInput name="city" control={control} label="City" placeholder="Enter your city" />
            </div>
            <div className="sm:col-span-3">
              <FormInput
                name="country"
                control={control}
                label="Country"
                placeholder="Enter your country"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Medical Information Section
function MedicalInfoSection({ control, setValue, watch }: SectionProps) {
  const { uploadFile, deleteFile } = useAccount();

  const medicalDocumentPath = watch?.('medical_document_path') || '';

  const onUpload = async (files: File[]) => {
    const path = await uploadFile(files[0]);
    setValue?.('medical_document_path', path);
  };

  const handleDelete = async () => {
    if (!medicalDocumentPath) return;

    try {
      await deleteFile(medicalDocumentPath);
      setValue?.('medical_document_path', '');
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

      <div className="md:col-span-2">
        <div className="px-4">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <FormInput
                name="primary_diagnosis"
                control={control}
                label="Primary Diagnosis"
                placeholder="Enter your primary diagnosis"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <FormInput
                name="year_of_diagnosis"
                control={control}
                label="Year of Diagnosis"
                type="number"
                placeholder="Enter year of diagnosis"
                required
              />
            </div>

            <div className="col-span-full">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-900">
                    Medical Documents
                  </label>
                  <span className="text-red-500 text-xs">*Required</span>
                </div>
                <p className="text-sm text-gray-600">
                  To provide voice cloning services, we require a note from your
                  Neurologist/Physician that states your diagnosis. Please upload that note here.
                </p>
                {medicalDocumentPath ? (
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">Document uploaded successfully</span>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-100"
                      onClick={handleDelete}
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete Document
                    </button>
                  </div>
                ) : (
                  <FileUploader
                    onUpload={onUpload}
                    multiple={false}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Terms and Privacy Section
function TermsSection({ control }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Terms and Privacy</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Please review and accept our terms and privacy policy to continue.
        </p>
        <p className="mt-4 text-sm/6 text-gray-600">
          Your data is used to provide voice cloning services. All your messages are processed by
          our service providers. Do not type any passwords or sensitive information.
        </p>
      </div>

      <div className="md:col-span-2">
        <div className="px-4">
          <div className="max-w-2xl space-y-10">
            <fieldset>
              <div className="space-y-6">
                <div className="flex gap-3">
                  <div className="flex h-6 items-center">
                    <FormCheckbox
                      name="terms_accepted"
                      control={control}
                      label="I accept the Terms of Service"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 items-center">
                    <FormCheckbox
                      name="privacy_policy_accepted"
                      control={control}
                      label="I accept the Privacy Policy"
                    />
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

export function AccountForm() {
  const { account, updateAccount } = useAccount();
  const { show, showError } = useToast();

  const defaultValues = useMemo(() => {
    return {
      name: account?.name || '',
      city: account?.city || '',
      country: account?.country || '',
      primary_diagnosis: account?.primary_diagnosis || '',
      year_of_diagnosis: account?.year_of_diagnosis || undefined,
      medical_document_path: account?.medical_document_path || '',
      speech_provider: account?.speech_provider || '',
      speech_settings: account?.speech_settings || undefined,
      voice: account?.voice || undefined,
      ai_instructions: account?.ai_instructions || '',
      ai_corpus: account?.ai_corpus || '',
      gemini_api_key: account?.gemini_api_key || '',
      terms_accepted: account?.terms_accepted || false,
      privacy_policy_accepted: account?.privacy_policy_accepted || false,
    };
  }, [account]);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(AccountSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const onSubmit = async (data: AccountFormData) => {
    try {
      await updateAccount(data);
      show({
        title: 'Account updated',
        message: 'Your account has been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving account:', err);
      showError('Failed to update account. Please try again.');
    }
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading account settings...</div>
      </div>
    );
  }
  return (
    <div className="divide-y divide-gray-400">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <PersonalInfoSection control={form.control} setValue={form.setValue} watch={form.watch} />
        {/* <MedicalInfoSection control={form.control} setValue={form.setValue} watch={form.watch} /> */}
        <TermsSection control={form.control} setValue={form.setValue} watch={form.watch} />

        {/* Floating save button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Update Account'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
