'use client';

import React, { useState } from 'react';

import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CircularKeyboard } from '@/packages/keyboards/components/circular-keyboard';
import { CustomKeyboard } from '@/packages/keyboards/components/custom-keyboard';
import { CustomKeyboardEditor } from '@/packages/keyboards/components/custom-keyboard-editor';
import { KeyboardType } from '@/packages/keyboards/components/keyboard-context';
import { QwertyKeyboard } from '@/packages/keyboards/components/qwerty-keyboard';
import { useCustomKeyboards, useDeleteKeyboard } from '@/packages/keyboards/hooks';
import { useKeyboardContext } from '@/packages/keyboards/hooks/use-keyboard-context';

interface KeyboardRendererProps {
  chatId?: string;
  className?: string;
  onKeyPress: (key: string) => void;
}

export function KeyboardRenderer({ chatId, className = '', onKeyPress }: KeyboardRendererProps) {
  const { isVisible, keyboardType, setKeyboardType, setCustomKeyboardId } = useKeyboardContext();
  const { keyboards: customKeyboards } = useCustomKeyboards({ chatId });
  const { deleteKeyboard } = useDeleteKeyboard();
  const [activeTab, setActiveTab] = useState<string>(keyboardType);
  const [editingKeyboardId, setEditingKeyboardId] = useState<string | undefined>(undefined);

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
      // If we're already on add-new and it's in edit mode,
      // clicking the tab again shouldn't necessarily reset it.
      // But if we're coming from another tab, we should reset it
      // unless we just called handleEditKeyboard (which sets it and then sets activeTab).
      // Actually, handleEditKeyboard sets activeTab to 'add-new',
      // so handleTabChange won't be called if we use setActiveTab directly.
      // Tabs component calls onValueChange only when user clicks.
      setEditingKeyboardId(undefined);
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

  const handleEditKeyboard = (keyboardId: string) => {
    setEditingKeyboardId(keyboardId);
    setActiveTab('add-new');
  };

  const handleDeleteKeyboard = async (keyboardId: string) => {
    try {
      await deleteKeyboard(keyboardId);
      // Switch back to QWERTY if deleted keyboard was active
      if (activeTab === `custom-${keyboardId}`) {
        setActiveTab('qwerty');
        setKeyboardType('qwerty');
        setCustomKeyboardId(undefined);
      }
      if (editingKeyboardId === keyboardId) {
        setEditingKeyboardId(undefined);
        if (activeTab === 'add-new') {
          setActiveTab('qwerty');
        }
      }
      toast.success('Keyboard deleted');
    } catch (error) {
      console.error('Failed to delete keyboard:', error);
      toast.error('Failed to delete keyboard');
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
              onEdit={handleEditKeyboard}
              onDelete={handleDeleteKeyboard}
            />
          </TabsContent>
        ))}

        {/* Editor Tab */}
        <TabsContent value="add-new" className="mt-0 overflow-y-auto max-h-[600px]">
          <CustomKeyboardEditor
            chatId={chatId}
            keyboardId={editingKeyboardId}
            onSave={keyboard => {
              setKeyboardType('custom');
              setCustomKeyboardId(keyboard.id);
              setActiveTab(`custom-${keyboard.id}`);
              setEditingKeyboardId(undefined);
            }}
            onCancel={() => {
              // Switch back to first available keyboard
              setActiveTab('qwerty');
              setEditingKeyboardId(undefined);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  ) : null;
}
