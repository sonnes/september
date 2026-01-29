'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@september/ui/components/alert';
import { Button } from '@september/ui/components/button';
import { Spinner } from '@september/ui/components/spinner';

import { useAccountContext } from '@september/account';
import { TranscriptionForm, type TranscriptionFormData } from '@september/ai';

export default function TranscriptionSettingsForm() {
  const { account, updateAccount } = useAccountContext();

  const handleSubmit = async (data: TranscriptionFormData) => {
    await updateAccount({
      ai_transcription: data,
    });
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6 text-zinc-500" />
        <span className="ml-2 text-sm text-zinc-500">Loading account settings...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Info Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transcription Configuration</h1>
        <p className="text-muted-foreground">Configure AI-powered speech-to-text transcription.</p>
      </div>

      {!account?.ai_providers?.gemini?.api_key && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">API Key Required</AlertTitle>
          <AlertDescription className="text-amber-700">
            AI transcription requires a Gemini API key. Configure it in{' '}
            <a href="/settings/ai" className="underline hover:text-amber-900">
              AI Providers
            </a>{' '}
            to enable transcription.
          </AlertDescription>
        </Alert>
      )}

      <TranscriptionForm account={account} onSubmit={handleSubmit} />
    </div>
  );
}
