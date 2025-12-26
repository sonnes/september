'use client';

import React, { useState } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { CircularKeyboard } from '@/packages/keyboards/components/circular-keyboard';
import { CustomKeyboard } from '@/packages/keyboards/components/custom-keyboard';
import { CustomKeyboardEditor } from '@/packages/keyboards/components/custom-keyboard-editor';
import { KeyboardType } from '@/packages/keyboards/components/keyboard-context';
import { QwertyKeyboard } from '@/packages/keyboards/components/qwerty-keyboard';
import { useKeyboardContext } from '@/packages/keyboards/hooks/use-keyboard-context';
import { useCustomKeyboards } from '@/packages/keyboards/hooks/use-custom-keyboards';

interface KeyboardRendererProps {
  className?: string;
  onKeyPress: (key: string) => void;
}

export function KeyboardRenderer({ className = '', onKeyPress }: KeyboardRendererProps) {
  const { isVisible, keyboardType, setKeyboardType } = useKeyboardContext();
  const { keyboards: customKeyboards } = useCustomKeyboards();
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(keyboardType);
  const [customKeyboardId, setCustomKeyboardId] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    setActiveTab(keyboardType);
  }, [keyboardType]);

  // Build tabs array with hardcoded and custom keyboards
  const tabs = [
    { value: 'qwerty', label: 'QWERTY' },
    { value: 'circular', label: 'Circular' },
    // Custom keyboard tabs
    ...customKeyboards.map(kb => ({ value: `custom-${kb.id}`, label: kb.name })),
    { value: 'add-new', label: '+' },
  ];

  const handleTabChange = (tabValue: string) => {
    if (tabValue === 'add-new') {
      setShowEditor(true);
    } else if (tabValue.startsWith('custom-')) {
      const id = tabValue.slice(7); // Remove 'custom-' prefix
      setKeyboardType('custom');
      setCustomKeyboardId(id);
    } else {
      // Hardcoded keyboard (qwerty, circular)
      setKeyboardType(tabValue as KeyboardType);
      setCustomKeyboardId(undefined);
    }
    setActiveTab(tabValue);
  };

  const renderKeyboard = () => {
    if (keyboardType === 'custom' && customKeyboardId) {
      return (
        <CustomKeyboard
          keyboardId={customKeyboardId}
          className={className}
          onKeyPress={onKeyPress}
        />
      );
    }

    // Then continue with existing switch statement for qwerty, circular, etc.
    switch (keyboardType) {
      case 'qwerty':
        return <QwertyKeyboard className={className} onKeyPress={onKeyPress} />;
      case 'circular':
        return <CircularKeyboard className={className} onKeyPress={onKeyPress} />;
      case 'none':
        return null;
      default:
        return null;
    }
  };

  return (
    <>
      {isVisible && (
        <div className={className}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-2">
            <TabsList>
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {renderKeyboard()}
        </div>
      )}

      {showEditor && (
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Keyboard</DialogTitle>
            </DialogHeader>
            <CustomKeyboardEditor
              onSave={(keyboard) => {
                setShowEditor(false);
                setKeyboardType('custom');
                setCustomKeyboardId(keyboard.id);
              }}
              onCancel={() => setShowEditor(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
