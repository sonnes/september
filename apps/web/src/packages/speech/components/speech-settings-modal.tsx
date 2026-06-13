'use client';

import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@september/ui/components/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@september/ui/components/dialog';
import { useAccount } from '@september/account';
import { SpeechSettings } from './speech-settings';
import type { VoiceSettingsFormData } from '../types/schemas';

export function SpeechSettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { account, updateAccount } = useAccount();

  const handleSubmit = async (data: VoiceSettingsFormData) => {
    await updateAccount({
      ai_speech: {
        provider: data.provider,
        voice_id: data.voice_id,
        voice_name: data.voice_name,
        model_id: data.model_id,
        settings: data.settings,
      },
    });
    setIsOpen(false);
  };

  const currentVoiceName = account?.ai_speech?.voice_name || 'Select voice';

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 px-3 py-1.5 h-auto text-xs text-zinc-600 hover:bg-zinc-100 rounded-full border border-zinc-200"
        >
          <Volume2 className="size-4" />
          <span className="hidden sm:inline">{currentVoiceName}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">Speech Settings</DialogTitle>
        <div className="flex-1 overflow-y-auto px-6 pt-6">
          <SpeechSettings account={account} onSubmit={handleSubmit} />
        </div>
        {/* Cancel button in the dialog footer — Save lives inside the form */}
        <div className="shrink-0 border-t border-zinc-200 bg-white px-6 py-4">
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
