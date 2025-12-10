'use client';

import { Button } from '@/components/ui/button';

import { useAccount } from '@/components-v4/account';
import { SuggestionsForm, SuggestionsFormData } from '@/components-v4/settings';

export default function SuggestionsSettingsForm() {
  const { account, updateAccount } = useAccount();

  const handleSubmit = async (data: SuggestionsFormData) => {
    await updateAccount({
      ai_suggestions: {
        enabled: data.enabled,
        provider: data.provider,
        model: data.model,
        settings: data.settings,
      },
    });
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-zinc-500">Loading account settings...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Info Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Suggestions Configuration</h1>
        <p className="text-muted-foreground">
          Configure AI-powered typing suggestions to help you communicate faster. Customize the AI
          to match your communication style.
        </p>
      </div>

      {!account?.ai_providers?.gemini?.api_key && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> AI suggestions require a Gemini API key. Configure it in{' '}
            <a href="/settings/ai" className="underline hover:text-amber-900">
              AI Providers
            </a>{' '}
            to enable suggestions.
          </p>
        </div>
      )}

      <SuggestionsForm account={account} onSubmit={handleSubmit}>
        {({ form }) => (
          <>
            {/* The form content is rendered by SuggestionsForm component */}

            {/* Save button */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </>
        )}
      </SuggestionsForm>
    </div>
  );
}
