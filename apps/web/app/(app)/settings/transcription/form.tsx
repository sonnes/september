'use client';

import { useAccount } from '@september/account';
import { TranscriptionForm, type TranscriptionFormData } from '@september/ai';
import { LoadingState } from '@september/ui/components/loading-state';

export default function TranscriptionSettingsForm() {
  const { account, updateAccount } = useAccount();

  const handleSubmit = async (data: TranscriptionFormData) => {
    await updateAccount({
      ai_transcription: data,
    });
  };

  if (!account) {
    return <LoadingState variant="inline" label="Loading account settings..." />;
  }

  return <TranscriptionForm account={account} onSubmit={handleSubmit} />;
}
