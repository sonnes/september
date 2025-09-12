'use client';

import { useState } from 'react';

import { Cog6ToothIcon, SparklesIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';

import { useTextContext } from '@/components/context/text-provider';
import {
  AISettingsDialog,
  SpeechProviderDialog,
  SpeechSettingsDialog,
} from '@/components/settings';
import { Button } from '@/components/ui/button';

import { useAudioPlayer } from '@/hooks/use-audio-player';

import { useAccount } from '@/services/account/context';
import { useAudio } from '@/services/audio';
import { useMessages } from '@/services/messages';
import { useSpeech } from '@/services/speech/use-speech';

type EditorProps = {
  placeholder?: string;
};

export default function Editor({ placeholder = 'Start typing...' }: EditorProps) {
  const { text, setText, reset } = useTextContext();
  const { user, account } = useAccount();
  const { createMessage } = useMessages();
  const { generateSpeech } = useSpeech();
  const { enqueue } = useAudioPlayer();
  const { uploadAudio } = useAudio();

  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [isTTSSettingsOpen, setIsTTSSettingsOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [isCombinedSpeechSettingsOpen, setIsCombinedSpeechSettingsOpen] = useState(false);

  const handleSubmit = async () => {
    setStatus('loading');

    const audio = await generateSpeech(text);

    enqueue(audio);

    const id = uuidv4();
    const audioPath = `${id}.mp3`;

    await Promise.all([
      audio.blob
        ? uploadAudio({ path: audioPath, blob: audio.blob, alignment: audio.alignment })
        : Promise.resolve(null),
      createMessage({ id, text, type: 'message', user_id: user.id, audio_path: audioPath }),
    ]);

    setStatus('idle');
    reset();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit();
      return;
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex-1">
        <textarea
          value={text}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full p-3 rounded-xl border border-zinc-400"
          style={{ caretColor: 'auto' }}
        />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTTSSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1 text-zinc-600 rounded-full transition-colors cursor-pointer hover:bg-zinc-100 border border-zinc-200"
            aria-label="Open TTS settings"
          >
            <SpeakerWaveIcon className="w-4 h-4" />
            <span className="text-sm hidden md:block">
              {account?.voice?.name || 'select voice'}
            </span>
          </button>
          <button
            onClick={() => setIsAISettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1 text-zinc-600 rounded-full transition-colors cursor-pointer hover:bg-zinc-100 border border-zinc-200"
            aria-label="Open AI settings"
          >
            <SparklesIcon className="w-4 h-4" />
            <span className="text-sm hidden md:block">Gemini AI</span>
          </button>
          <button
            onClick={() => setIsCombinedSpeechSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1 text-zinc-600 rounded-full transition-colors cursor-pointer hover:bg-zinc-100 border border-zinc-200"
            aria-label="Open combined speech settings"
          >
            <Cog6ToothIcon className="w-4 h-4" />
            <span className="text-sm hidden md:block">Speech Settings</span>
          </button>
        </div>
        <Button onClick={handleSubmit} color="zinc" disabled={status === 'loading'}>
          {status === 'loading' ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
      <SpeechProviderDialog
        isOpen={isTTSSettingsOpen}
        onClose={() => setIsTTSSettingsOpen(false)}
      />
      <AISettingsDialog isOpen={isAISettingsOpen} onClose={() => setIsAISettingsOpen(false)} />
      <SpeechSettingsDialog
        isOpen={isCombinedSpeechSettingsOpen}
        onClose={() => setIsCombinedSpeechSettingsOpen(false)}
      />
    </div>
  );
}
