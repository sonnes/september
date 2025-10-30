'use client';

import { useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { SpeechModal } from '@/components/ai/settings/speech-modal';
import { SuggestionsModal } from '@/components/ai/settings/suggestions-modal';
import { useTextContext } from '@/components/context/text-provider';
import { KeyboardSelector } from '@/components/keyboards';
import { SpeechProviderDialog } from '@/components/settings';
import { Button } from '@/components/ui/button';

import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useSuggestions } from '@/hooks/use-suggestions';

import { useAccount } from '@/services/account/context';
import { useAudio } from '@/services/audio';
import { useMessages } from '@/services/messages';
import { useSpeech } from '@/services/speech/use-speech';

type EditorProps = {
  placeholder?: string;
};

export default function Editor({ placeholder = 'Start typing...' }: EditorProps) {
  const { text, setText, reset } = useTextContext();
  const { user } = useAccount();
  const { createMessage } = useMessages();
  const { generateSpeech } = useSpeech();
  const { enqueue } = useAudioPlayer();
  const { uploadAudio } = useAudio();
  const { clearSuggestions } = useSuggestions();

  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const handleSubmit = async () => {
    setStatus('loading');

    const audio = await generateSpeech(text);

    enqueue(audio);

    const id = uuidv4();
    const audioPath = audio.blob ? `${id}.mp3` : undefined;

    await Promise.all([
      audioPath && audio.blob
        ? uploadAudio({ path: audioPath, blob: audio.blob, alignment: audio.alignment })
        : Promise.resolve(null),
      createMessage({ id, text, type: 'message', user_id: user.id, audio_path: audioPath }),
    ]);

    setStatus('idle');
    reset();
    clearSuggestions();
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
          <KeyboardSelector />
          <SuggestionsModal />
          <SpeechModal />
        </div>
        <Button onClick={handleSubmit} color="zinc" disabled={status === 'loading'}>
          {status === 'loading' ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}
