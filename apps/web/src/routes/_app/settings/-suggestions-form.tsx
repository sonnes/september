import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { useAccount } from '@september/account';
import { SuggestionsForm, type SuggestionsFormData } from '@september/suggestions';
import { Alert, AlertDescription, AlertTitle } from '@september/ui/components/alert';
import { Button } from '@september/ui/components/button';
import { LoadingState } from '@september/ui/components/loading-state';
import { Spinner } from '@september/ui/components/spinner';

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
    return <LoadingState variant="inline" label="Loading account settings..." />;
  }

  return (
    <SuggestionsForm account={account} onSubmit={handleSubmit}>
      {({ form, error, success }) => (
        <>
          <div className="flex flex-col gap-4 pt-6 border-t">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-end gap-4">
              {success && (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 animate-in fade-in slide-in-from-right-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Saved</span>
                </div>
              )}

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                {form.formState.isSubmitting ? 'Saving...' : 'Save settings'}
              </Button>
            </div>
          </div>
        </>
      )}
    </SuggestionsForm>
  );
}
