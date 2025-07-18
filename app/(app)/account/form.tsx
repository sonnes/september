'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TextInput } from '@/components/ui/text-input';
import { TextareaInput } from '@/components/ui/textarea-input';
import { useAccount } from '@/hooks/use-account';

// Personal Information Section
function PersonalInfoSection({
  formData,
  handleInputChange,
}: {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}) {
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
              <TextInput
                id="name"
                label="Full Name"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div className="sm:col-span-3">
              <TextInput
                id="city"
                label="City"
                value={formData.city}
                onChange={e => handleInputChange('city', e.target.value)}
                placeholder="Enter your city"
              />
            </div>
            <div className="sm:col-span-3">
              <TextInput
                id="country"
                label="Country"
                value={formData.country}
                onChange={e => handleInputChange('country', e.target.value)}
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
function MedicalInfoSection({
  formData,
  handleInputChange,
}: {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Medical Information</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          This information helps us provide better assistance for your specific needs.
        </p>
      </div>

      <div className="md:col-span-2">
        <div className="px-4">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <TextInput
                id="primary_diagnosis"
                label="Primary Diagnosis"
                value={formData.primary_diagnosis}
                onChange={e => handleInputChange('primary_diagnosis', e.target.value)}
                placeholder="Enter your primary diagnosis"
              />
            </div>
            <div className="sm:col-span-2">
              <TextInput
                id="year_of_diagnosis"
                label="Year of Diagnosis"
                type="number"
                value={formData.year_of_diagnosis}
                onChange={e =>
                  handleInputChange('year_of_diagnosis', parseInt(e.target.value) || null)
                }
                placeholder="Enter year of diagnosis"
              />
            </div>
            <div className="col-span-full">
              <TextareaInput
                id="medical_document_path"
                label="Medical Notes"
                value={formData.medical_document_path}
                onChange={e => handleInputChange('medical_document_path', e.target.value)}
                placeholder="Enter any additional medical notes"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// API Keys Section
function ApiKeysSection({
  formData,
  handleInputChange,
}: {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">API Keys (Optional)</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Add your own API keys to use premium features. These are optional and securely stored.
        </p>
      </div>

      <div className="md:col-span-2">
        <div className="px-4">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="col-span-full">
              <TextInput
                id="elevenlabs_api_key"
                label="ElevenLabs API Key"
                type="password"
                value={formData.elevenlabs_api_key}
                onChange={e => handleInputChange('elevenlabs_api_key', e.target.value)}
                placeholder="Enter your ElevenLabs API key"
              />
            </div>
            <div className="col-span-full">
              <TextInput
                id="google_api_key"
                label="Google API Key"
                type="password"
                value={formData.google_api_key}
                onChange={e => handleInputChange('google_api_key', e.target.value)}
                placeholder="Enter your Google API key"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Terms and Privacy Section
function TermsSection({
  formData,
  handleInputChange,
}: {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}) {
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
                    <Checkbox
                      id="terms_accepted"
                      label="I accept the Terms of Service"
                      checked={formData.terms_accepted}
                      onChange={e => handleInputChange('terms_accepted', e.target.checked)}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 items-center">
                    <Checkbox
                      id="privacy_policy_accepted"
                      label="I accept the Privacy Policy"
                      checked={formData.privacy_policy_accepted}
                      onChange={e => handleInputChange('privacy_policy_accepted', e.target.checked)}
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
  const { account, error, putAccount, loading } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const initialFormData = {
    // Personal Information
    name: account?.name || '',
    city: account?.city || '',
    country: account?.country || '',

    // Medical Information
    primary_diagnosis: account?.primary_diagnosis || '',
    year_of_diagnosis: account?.year_of_diagnosis || undefined,
    medical_document_path: account?.medical_document_path || '',

    // API Keys
    elevenlabs_api_key: account?.elevenlabs_api_key || '',
    google_api_key: account?.google_api_key || '',

    // Flags
    terms_accepted: account?.terms_accepted || false,
    privacy_policy_accepted: account?.privacy_policy_accepted || false,
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    setFormData(initialFormData);
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      console.log('formData', formData);
      await putAccount(formData);
      setMessage('Account updated successfully!');
    } catch (err) {
      console.error('Error saving account:', err);
      setMessage('Failed to update account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Show loading state while account is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading account information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-400">
      <form onSubmit={handleSubmit}>
        <PersonalInfoSection formData={formData} handleInputChange={handleInputChange} />
        <MedicalInfoSection formData={formData} handleInputChange={handleInputChange} />
        <ApiKeysSection formData={formData} handleInputChange={handleInputChange} />
        <TermsSection formData={formData} handleInputChange={handleInputChange} />

        {/* Floating save button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            {message && (
              <p
                className={`text-md font-semibold ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}
              >
                {message}
              </p>
            )}
            {error && <p className="text-md font-semibold text-red-600">{error}</p>}
            <div className="flex-shrink-0 ml-auto">
              <Button
                type="submit"
                disabled={
                  isSubmitting || !formData.terms_accepted || !formData.privacy_policy_accepted
                }
              >
                {isSubmitting ? 'Saving...' : 'Update Account'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
