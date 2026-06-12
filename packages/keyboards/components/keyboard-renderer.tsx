'use client';

import React, { useState } from 'react';

import { toast } from 'sonner';

import { cn } from '@september/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@september/ui/components/tabs';

import { CircularKeyboard } from './circular-keyboard';
import { CustomKeyboard } from './custom-keyboard';
import { CustomKeyboardEditor } from './custom-keyboard-editor';
import { KeyboardType, useKeyboardContext } from './keyboard-context';
import { QwertyKeyboard } from './qwerty-keyboard';
import { deleteKeyboard } from '../mutations';
import { useCustomKeyboards } from '../hooks/use-custom-keyboards';

interface KeyboardRendererProps {
  chatId?: string;
  className?: string;
  onKeyPress: (key: string) => void;
  /**
   * When true, the typing keyboards (QWERTY / Circular) are rendered as a
   * persistent group below the custom keyboards instead of living in the same
   * tab strip. The custom keyboards (and the add-new tab) stay switchable
   * above, filling vertical space with a typing keyboard always available.
   */
  stickyQwerty?: boolean;
}

type TypingKeyboard = 'qwerty' | 'circular';

export function KeyboardRenderer({
  chatId,
  className = '',
  onKeyPress,
  stickyQwerty = false,
}: KeyboardRendererProps) {
  const { isVisible, keyboardType, setKeyboardType, setCustomKeyboardId } = useKeyboardContext();
  const { keyboards: customKeyboards } = useCustomKeyboards({ chatId });

  // In split mode, the custom-tabs row never shows qwerty/circular — those live
  // in the sticky typing group below. Fall back to the first custom keyboard,
  // or to an empty value (so only the "+" tab shows, with no content) if none
  // exist yet — clicking "+" still opens the editor.
  const resolveCustomTab = React.useCallback(
    (type: KeyboardType, customId?: string): string => {
      if (type === 'custom' && customId) return `custom-${customId}`;
      if (customKeyboards.length > 0) return `custom-${customKeyboards[0].id}`;
      return '';
    },
    [customKeyboards]
  );

  const resolveTab = React.useCallback(
    (type: KeyboardType): string => {
      if (stickyQwerty) return resolveCustomTab(type);
      return type;
    },
    [stickyQwerty, resolveCustomTab]
  );

  const [activeTab, setActiveTab] = useState<string>(resolveTab(keyboardType));
  const [editingKeyboardId, setEditingKeyboardId] = useState<string | undefined>(undefined);
  const [typingKeyboard, setTypingKeyboard] = useState<TypingKeyboard>(
    keyboardType === 'circular' ? 'circular' : 'qwerty'
  );

  React.useEffect(() => {
    setActiveTab(resolveTab(keyboardType));
  }, [keyboardType, resolveTab]);

  // Build tabs array — in split mode the row only has customs + add-new.
  const tabs = stickyQwerty
    ? [
        ...customKeyboards.map(kb => ({ value: `custom-${kb.id}`, label: kb.name })),
        { value: 'add-new', label: '+' },
      ]
    : [
        { value: 'qwerty', label: 'QWERTY' },
        { value: 'circular', label: 'Circular' },
        ...customKeyboards.map(kb => ({ value: `custom-${kb.id}`, label: kb.name })),
        { value: 'add-new', label: '+' },
      ];

  const handleTabChange = (tabValue: string) => {
    if (tabValue === 'add-new') {
      setEditingKeyboardId(undefined);
      setActiveTab(tabValue);
    } else if (tabValue.startsWith('custom-')) {
      const id = tabValue.slice(7); // Remove 'custom-' prefix
      setKeyboardType('custom');
      setCustomKeyboardId(id);
      setActiveTab(tabValue);
    } else {
      // Hardcoded keyboard (qwerty, circular) — only reachable in non-sticky mode
      setKeyboardType(tabValue as KeyboardType);
      setCustomKeyboardId(undefined);
      setActiveTab(tabValue);
    }
  };

  const handleTypingKeyboardChange = (value: TypingKeyboard) => {
    // Local toggle only — doesn't touch context so the custom keyboard
    // selection above stays intact when switching typing keyboards below.
    setTypingKeyboard(value);
  };

  const handleEditKeyboard = (keyboardId: string) => {
    setEditingKeyboardId(keyboardId);
    setActiveTab('add-new');
  };

  const handleDeleteKeyboard = async (keyboardId: string) => {
    try {
      await deleteKeyboard(keyboardId);
      if (activeTab === `custom-${keyboardId}`) {
        setActiveTab(resolveCustomTab('qwerty'));
        setKeyboardType('qwerty');
        setCustomKeyboardId(undefined);
      }
      if (editingKeyboardId === keyboardId) {
        setEditingKeyboardId(undefined);
        if (activeTab === 'add-new') {
          setActiveTab(resolveCustomTab('qwerty'));
        }
      }
      toast.success('Keyboard deleted');
    } catch (error) {
      console.error('Failed to delete keyboard:', error);
      toast.error('Failed to delete keyboard');
    }
  };

  if (!isVisible) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* QWERTY Tab (only when not sticky) */}
        {!stickyQwerty && (
          <TabsContent value="qwerty" className="mt-0">
            <QwertyKeyboard className={className} onKeyPress={onKeyPress} />
          </TabsContent>
        )}

        {/* Circular Tab (only when not sticky) */}
        {!stickyQwerty && (
          <TabsContent value="circular" className="mt-0">
            <CircularKeyboard className={className} onKeyPress={onKeyPress} />
          </TabsContent>
        )}

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
              setActiveTab(resolveCustomTab('qwerty'));
              setEditingKeyboardId(undefined);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Persistent typing keyboard group (QWERTY + Circular) */}
      {stickyQwerty && (
        <Tabs
          value={typingKeyboard}
          onValueChange={v => handleTypingKeyboardChange(v as TypingKeyboard)}
        >
          <TabsList>
            <TabsTrigger value="qwerty">QWERTY</TabsTrigger>
            <TabsTrigger value="circular">Circular</TabsTrigger>
          </TabsList>
          <TabsContent value="qwerty" className="mt-0">
            <QwertyKeyboard className={className} onKeyPress={onKeyPress} />
          </TabsContent>
          <TabsContent value="circular" className="mt-0">
            <CircularKeyboard className={className} onKeyPress={onKeyPress} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
