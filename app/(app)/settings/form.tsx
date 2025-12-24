'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Control, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormCheckbox, FormField } from '@/components/ui/form';

import { useAccountContext } from '@/packages/account';

const SettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city: z.string().optional(),
  country: z.string().optional(),
  terms_accepted: z.boolean(),
  privacy_policy_accepted: z.boolean(),
});

type SettingsFormData = z.infer<typeof SettingsSchema>;

// Personal Information Section
function PersonalInfoSection({ control }: { control: Control<SettingsFormData> }) {
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
function TermsSection({ control }: { control: Control<SettingsFormData> }) {
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
    return {
      name: account?.name || '',
      city: account?.city || '',
      country: account?.country || '',
      terms_accepted: account?.terms_accepted || false,
      privacy_policy_accepted: account?.privacy_policy_accepted || false,
    };
  }, [account]);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        city: account.city || '',
        country: account.country || '',
        terms_accepted: account.terms_accepted || false,
        privacy_policy_accepted: account.privacy_policy_accepted || false,
      });
    }
  }, [account, form]);

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await updateAccount(data);
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
