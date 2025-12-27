'use client';

import React, { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CircularKeyboard } from '@/packages/keyboards/components/circular-keyboard';
import { CustomKeyboard } from '@/packages/keyboards/components/custom-keyboard';
import { CustomKeyboardEditor } from '@/packages/keyboards/components/custom-keyboard-editor';
import { KeyboardType } from '@/packages/keyboards/components/keyboard-context';
import { QwertyKeyboard } from '@/packages/keyboards/components/qwerty-keyboard';
import { useCustomKeyboards } from '@/packages/keyboards/hooks/use-custom-keyboards';
import { useKeyboardContext } from '@/packages/keyboards/hooks/use-keyboard-context';

interface KeyboardRendererProps {
  className?: string;
  onKeyPress: (key: string) => void;
}

export function KeyboardRenderer({ className = '', onKeyPress }: KeyboardRendererProps) {
  const { isVisible, keyboardType, setKeyboardType, setCustomKeyboardId } = useKeyboardContext();
  const { keyboards: customKeyboards } = useCustomKeyboards();
  const [activeTab, setActiveTab] = useState<string>(keyboardType);

  React.useEffect(() => {
    setActiveTab(keyboardType);
  }, [keyboardType]);

  // Build tabs array with hardcoded keyboards and custom keyboards
  const tabs = [
    { value: 'qwerty', label: 'QWERTY' },
    { value: 'circular', label: 'Circular' },
    // Custom keyboard tabs
    ...customKeyboards.map(kb => ({ value: `custom-${kb.id}`, label: kb.name })),
    { value: 'add-new', label: '+' },
  ];

  const handleTabChange = (tabValue: string) => {
    if (tabValue === 'add-new') {
      // Editor tab is always available
      setActiveTab(tabValue);
    } else if (tabValue.startsWith('custom-')) {
      const id = tabValue.slice(7); // Remove 'custom-' prefix
      setKeyboardType('custom');
      setCustomKeyboardId(id);
      setActiveTab(tabValue);
    } else {
      // Hardcoded keyboard (qwerty, circular)
      setKeyboardType(tabValue as KeyboardType);
      setCustomKeyboardId(undefined);
      setActiveTab(tabValue);
    }
  };

  return isVisible ? (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* QWERTY Tab */}
        <TabsContent value="qwerty" className="mt-0">
          <QwertyKeyboard className={className} onKeyPress={onKeyPress} />
        </TabsContent>

        {/* Circular Tab */}
        <TabsContent value="circular" className="mt-0">
          <CircularKeyboard className={className} onKeyPress={onKeyPress} />
        </TabsContent>

        {/* Custom Keyboard Tabs */}
        {customKeyboards.map(keyboard => (
          <TabsContent
            key={`custom-${keyboard.id}`}
            value={`custom-${keyboard.id}`}
            className="mt-0"
          >
            <CustomKeyboard
              keyboardId={keyboard.id}
              className={className}
              onKeyPress={onKeyPress}
            />
          </TabsContent>
        ))}

        {/* Editor Tab */}
        <TabsContent value="add-new" className="mt-0 overflow-y-auto max-h-[600px]">
          <CustomKeyboardEditor
            onSave={keyboard => {
              setKeyboardType('custom');
              setCustomKeyboardId(keyboard.id);
              setActiveTab(`custom-${keyboard.id}`);
            }}
            onCancel={() => {
              // Switch back to first available keyboard
              setActiveTab('qwerty');
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  ) : null;
}
