'use client';

import React from 'react';

import { KeyboardProvider } from '@/components/context/keyboard-provider';
import { TextProvider, useTextContext } from '@/components/context/text-provider';
import { KeyboardRenderer, KeyboardSelector } from '@/components/keyboards';

function TextDisplay() {
  const { text } = useTextContext();

  return (
    <div className="text-gray-800 whitespace-pre-wrap font-mono min-h-[40px]">
      {text || <span className="text-gray-400 italic">Your text will appear here...</span>}
    </div>
  );
}

export function KeyboardDemo() {
  return (
    <KeyboardProvider defaultKeyboardType="qwerty">
      <TextProvider>
        <div className="w-full">
          <div className="bg-orange-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Try the Keyboards</h4>
                <KeyboardSelector />
              </div>

              <div>
                <TextDisplay />
              </div>
              <div className="mb-4">
                <KeyboardRenderer />
              </div>
              <div className="text-xs text-gray-500 text-center">
                Click on the keyboard selector above to switch between QWERTY, Circular, or no
                keyboard
              </div>
            </div>
          </div>
        </div>
      </TextProvider>
    </KeyboardProvider>
  );
}
