import { useAccount } from '@/packages/account';
import { useAISettings } from '@/packages/ai';
import { LoadingState } from '@/packages/ui/components/loading-state';
import { SpeechSettings } from '@/packages/speech';
import type { VoiceSettingsFormData } from '@/packages/speech';

export default function VoicesSettingsForm() {
  const { account } = useAccount();
  const { updateSpeechConfig } = useAISettings();

  const handleSubmit = async (data: VoiceSettingsFormData) => {
    await updateSpeechConfig({
      provider: data.provider,
      voice_id: data.voice_id,
      voice_name: data.voice_name,
      model_id: data.model_id,
      settings: data.settings,
    });
  };

  if (!account) {
    return <LoadingState variant="page" label="Loading voices..." />;
  }

  return <SpeechSettings account={account} onSubmit={handleSubmit} />;
}
