'use client';

import { useState } from 'react';

import { createMessage } from '@/app/actions/messages';
import { createSpeechFile } from '@/app/actions/speech';
import AAC from '@/components/aac';
import Autocomplete from '@/components/autocomplete';
import CircularKeyboard from '@/components/circular/keyboard';
import { useMessages } from '@/components/context/messages';
import { usePlayer } from '@/components/context/player';

const editors = {
  autocomplete: Autocomplete,
  aac: AAC,
  circular: CircularKeyboard,
};

type EditorType = keyof typeof editors;

export function Editor() {
  const [editorType, setEditorType] = useState<EditorType>('autocomplete');
  const [isGenerating, setIsGenerating] = useState(false);
  const EditorComponent = editors[editorType];
  const { addMessage } = useMessages();
  const { setPlaying } = usePlayer();

  async function handleSubmit(text: string) {
    setIsGenerating(true);
    const message = {
      id: crypto.randomUUID(),
      text,
      type: 'message',
    };

    try {
      const createdMessage = await createSpeechFile(message).then(() => createMessage(message));
      addMessage(createdMessage);
      setPlaying({ id: createdMessage.id, text });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      {/* Input area */}
      <div className="bg-white dark:bg-zinc-900 py-2 relative">
        {/* Progress bar */}
        <div
          className={`absolute top-0 left-0 h-0.5 w-full ${
            isGenerating ? 'bg-blue-500 transition-all duration-300' : 'bg-zinc-100'
          }`}
        />
        <div className="flex-1">
          <EditorComponent onSubmit={handleSubmit} />
        </div>
        <div className="flex gap-4 justify-center w-full border-t dark:border-zinc-800 pt-3 mt-3">
          {Object.keys(editors).map(editorType => (
            <button key={editorType} onClick={() => setEditorType(editorType as EditorType)}>
              {editorType}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
