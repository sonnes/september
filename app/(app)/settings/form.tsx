'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { TriangleAlertIcon } from 'lucide-react';
import { Control, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FormCheckbox, FormField } from '@/components/ui/form';

import { AccountFormData, AccountSchema, useAccountContext } from '@/packages/account';

// Personal Information Section
function PersonalInfoSection({ control }: { control: Control<AccountFormData> }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-zinc-900">Personal Information</h2>
        <p className="mt-1 text-sm/6 text-zinc-600">
          Please provide your basic personal information.
        </p>
      </div>

      <div className="md:col-span-2">
        <div className="px-4">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <FormField
                name="name"
                control={control}
                label="Full Name"
                placeholder="Enter your name"
              />
            </div>
            <div className="sm:col-span-3">
              <FormField name="city" control={control} label="City" placeholder="Enter your city" />
            </div>
            <div className="sm:col-span-3">
              <FormField
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

// Terms and Privacy Section
function TermsSection({ control }: { control: Control<AccountFormData> }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-zinc-900">Terms and Privacy</h2>
        <p className="mt-1 text-sm/6 text-zinc-600">
          Please review and accept our terms and privacy policy to continue.
        </p>
        <p className="mt-4 text-sm/6 text-zinc-600">
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

export default function SettingsForm() {
  const { user, account, updateAccount } = useAccountContext();

  const defaultValues = useMemo(() => {
    return account || ({} as AccountFormData);
  }, [account]);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(AccountSchema) as any,
    defaultValues: defaultValues,
  });

  useEffect(() => {
    if (account) {
      form.reset(account);
    }
  }, [account, form]);

  const onSubmit = async (data: AccountFormData) => {
    try {
      // Omit fields that shouldn't be updated directly or are handled by the context
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, updated_at, ...updateData } = data;
      await updateAccount(updateData);
      toast.success('Settings', {
        description: 'Your settings have been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to update settings. Please try again.');
    }
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-zinc-500">Loading account settings...</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-400">
      {user && account && !account.is_approved && (
        <div className="rounded-md bg-amber-50 p-4 flex items-center mb-6">
          <TriangleAlertIcon className="size-5 text-amber-400 shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">Account Pending Approval</h3>
            <p className="mt-1 text-sm text-amber-700">
              Your account is not approved yet. Please wait for approval.
            </p>
          </div>
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <PersonalInfoSection control={form.control} />
        <TermsSection control={form.control} />
        {/* Floating save button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
