'use client';

import { useCallback } from 'react';

import { EditorProvider, useEditorContext } from '@/packages/editor';
import { KeyboardProvider, KeyboardRenderer } from '@/components/keyboards';

function TextDisplay() {
  const { text } = useEditorContext();

  return (
    <div className="text-gray-800 whitespace-pre-wrap font-mono min-h-[40px]">
      {text || <span className="text-gray-400 italic">Your text will appear here...</span>}
    </div>
  );
}

function KeyboardDemoContent() {
  const { setText } = useEditorContext();

  const handleKeyPress = useCallback(
    (key: string) => {
      setText(prevText => {
        if (key === 'BACKSPACE') {
          return prevText.slice(0, -1);
        } else if (key === 'SPACE') {
          return prevText + ' ';
        } else if (/^[0-9]$/.test(key)) {
          // Numbers should be added as-is
          return prevText + key;
        } else {
          // Regular characters (already transformed by keyboard component if needed)
          return prevText + key;
        }
      });
    },
    [setText]
  );

  return (
    <div className="w-full">
      <div className="bg-orange-100 rounded-2xl p-2 lg:p-8 hover:shadow-lg transition-shadow">
        <div className="bg-white rounded-lg p-2 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Try the Keyboards</h4>
          </div>

          <div>
            <TextDisplay />
          </div>
          <div className="mb-4">
            <KeyboardRenderer onKeyPress={handleKeyPress} />
          </div>
          <div className="text-xs text-gray-500 text-center">
            Use the tabs above to switch between QWERTY and Circular keyboards
          </div>
        </div>
      </div>
    </div>
  );
}

export function KeyboardDemo() {
  return (
    <KeyboardProvider defaultKeyboardType="qwerty">
      <EditorProvider>
        <KeyboardDemoContent />
      </EditorProvider>
    </KeyboardProvider>
  );
}
