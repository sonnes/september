import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { Control, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAccount } from '@/packages/account';
import { Button } from '@/packages/ui/components/button';
import { FormCheckbox, FormField } from '@/packages/ui/components/form';
import { LoadingState } from '@/packages/ui/components/loading-state';

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
        <p className="text-sm text-muted-foreground">Your basic details.</p>
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
  const [justSaved, setJustSaved] = useState(false);

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
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      toast.success('Settings saved');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to update settings. Please try again.');
    }
  };

  if (!account) {
    return <LoadingState variant="inline" label="Loading account settings..." />;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <PersonalInfoSection control={form.control} />
      <TermsSection control={form.control} />
      <div className="flex items-center justify-end gap-3 border-t pt-6">
        {justSaved && (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="size-4" />
            <span>Saved</span>
          </div>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
