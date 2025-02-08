'use client';

import { useState } from 'react';

import AAC from '@/components/aac';
import Autocomplete from '@/components/autocomplete';
import CircularKeyboard from '@/components/circular/keyboard';
import SettingsMenu from '@/components/settings-menu';

export function Editor() {
  const [editorType, setEditorType] = useState<'autocomplete' | 'aac' | 'circular'>('autocomplete');

  return (
    <div>
      {/* Input area */}
      <div className="border-t bg-white dark:bg-zinc-900 p-4">
        <div className="flex-1">
          {editorType === 'autocomplete' ? (
            <Autocomplete placeholder="Type your message..." />
          ) : editorType === 'aac' ? (
            <AAC />
          ) : editorType === 'circular' ? (
            <CircularKeyboard />
          ) : null}
        </div>
        <SettingsMenu value={editorType} onChange={setEditorType} />
      </div>
    </div>
  );
}
