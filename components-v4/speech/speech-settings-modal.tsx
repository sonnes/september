'use client';

import { useState } from 'react';

import { Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

import { useAccount } from '@/components-v4/account';

import { SpeechSettingsForm, SpeechSettingsFormData } from './speech-settings-form';

export function SpeechSettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { account, updateAccount } = useAccount();

  const handleSubmit = async (data: SpeechSettingsFormData) => {
    setIsSubmitting(true);
    try {
      // Update the account with new speech settings
      await updateAccount({
        ai_speech: {
          provider: data.provider,
          voice_id: data.voice_id,
          voice_name: data.voice_name,
          settings: data.settings,
        },
      });

      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentVoiceName = account?.ai_speech?.voice_name || 'Select voice';
  const hasApiKey =
    account?.ai_speech?.provider === 'browser' ||
    !!account?.ai_providers?.[account?.ai_speech?.provider as keyof typeof account.ai_providers]
      ?.api_key;

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
        <div className="flex-1 overflow-y-auto px-6 pt-6">
          <SpeechSettingsForm account={account} onSubmit={handleSubmit} />
        </div>
        {/* Sticky footer */}
        <div className="shrink-0 border-t border-zinc-200 bg-white px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="speech-settings-form"
              disabled={isSubmitting || !hasApiKey}
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
