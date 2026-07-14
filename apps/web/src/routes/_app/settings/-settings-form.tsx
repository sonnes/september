import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Control, useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAccount } from '@/packages/account';
import { FormCheckbox, FormField } from '@/packages/ui/components/form';
import { LoadingState } from '@/packages/ui/components/loading-state';

import { SavedIndicator } from '@/components/settings/feature-section';
import { useAutosave } from '@/components/settings/use-autosave';

const SettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city: z.string().optional(),
  country: z.string().optional(),
  terms_accepted: z.boolean(),
  privacy_policy_accepted: z.boolean(),
});

type SettingsFormData = z.infer<typeof SettingsSchema>;

function PersonalInfoSection({ control }: { control: Control<SettingsFormData> }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Personal information</h2>
        <p className="text-sm text-muted-foreground">Your basic details. Saved automatically.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField name="name" control={control} label="Full name" placeholder="Enter your name" />
        <FormField name="city" control={control} label="City" placeholder="Enter your city" />
        <FormField
          name="country"
          control={control}
          label="Country"
          placeholder="Enter your country"
        />
      </div>
    </section>
  );
}

function TermsSection({ control }: { control: Control<SettingsFormData> }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Terms and privacy</h2>
        <p className="text-sm text-muted-foreground">
          Your data powers voice cloning services. Messages are processed by third-party providers.
          Do not type passwords or sensitive information.
        </p>
      </div>
      <fieldset className="space-y-3">
        <FormCheckbox
          name="terms_accepted"
          control={control}
          label="I accept the Terms of Service"
        />
        <FormCheckbox
          name="privacy_policy_accepted"
          control={control}
          label="I accept the Privacy Policy"
        />
      </fieldset>
    </section>
  );
}

export default function SettingsForm() {
  const { account, updateAccount } = useAccount();

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

  const { status, save, scheduleSave } = useAutosave<SettingsFormData>(async data => {
    await updateAccount(data);
    // Mark the form clean so external updates (e.g. a settings import) can
    // still reset it, without clobbering values while the user is typing.
    form.reset(data);
  });

  // Saves on change like the feature pages: checkboxes immediately, text
  // fields debounced. Invalid states (empty name) are held, not saved.
  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      if (type !== 'change') return;
      const parsed = SettingsSchema.safeParse(values);
      if (!parsed.success) return;
      if (name === 'terms_accepted' || name === 'privacy_policy_accepted') {
        save(parsed.data);
      } else {
        scheduleSave(parsed.data);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, save, scheduleSave]);

  // Refresh from external account changes (sync, import) — but never while the
  // user has unsaved edits in the form.
  useEffect(() => {
    if (account && !form.formState.isDirty) {
      form.reset(defaultValues);
    }
  }, [account, defaultValues, form]);

  if (!account) {
    return <LoadingState variant="inline" label="Loading account settings..." />;
  }

  return (
    <form className="space-y-8">
      <div className="flex h-5 justify-end">
        <SavedIndicator status={status} />
      </div>
      <PersonalInfoSection control={form.control} />
      <TermsSection control={form.control} />
    </form>
  );
}
