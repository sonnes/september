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
  const EditorComponent = editors[editorType];
  const { addMessage } = useMessages();
  const { setPlaying } = usePlayer();

  async function handleSubmit(text: string) {
    const message = {
      id: crypto.randomUUID(),
      text,
      type: 'message',
    };

    const createdMessage = await createSpeechFile(message).then(() => createMessage(message));

    addMessage(createdMessage);
    setPlaying({ id: createdMessage.id, text });
  }

  return (
    <div>
      {/* Input area */}
      <div className="bg-white dark:bg-zinc-900">
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
