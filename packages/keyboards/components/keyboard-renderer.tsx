'use client';

import React from 'react';

import { Plus } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CircularKeyboard } from '@/packages/keyboards/components/circular-keyboard';
import { KeyboardType } from '@/packages/keyboards/components/keyboard-context';
import { QwertyKeyboard } from '@/packages/keyboards/components/qwerty-keyboard';
import { useKeyboardContext } from '@/packages/keyboards/hooks/use-keyboard-context';

interface KeyboardRendererProps {
  className?: string;
  onKeyPress: (key: string) => void;
}

const keyboardOptions: { id: KeyboardType; label: string }[] = [
  { id: 'qwerty', label: 'QWERTY' },
  { id: 'circular', label: 'Circular' },
];

export function KeyboardRenderer({ className = '', onKeyPress }: KeyboardRendererProps) {
  const { isVisible, keyboardType, setKeyboardType } = useKeyboardContext();

  const [activeTab, setActiveTab] = React.useState<string>(keyboardType);

  React.useEffect(() => {
    setActiveTab(keyboardType);
  }, [keyboardType]);

  const renderKeyboard = () => {
    if (activeTab === 'add-new') {
      return (
        <div className="p-4 text-center text-muted-foreground">
          <p className="text-sm">Add a new keyboard layout</p>
          <p className="text-xs mt-1">Coming soon</p>
        </div>
      );
    }

    switch (activeTab as KeyboardType) {
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'add-new') {
      // TODO: Handle add new keyboard action
      return;
    }
    setKeyboardType(value as KeyboardType);
  };

  return (
    <>
      {isVisible && (
        <div className={className}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-2">
            <TabsList>
              {keyboardOptions.map(option => (
                <TabsTrigger key={option.id} value={option.id}>
                  {option.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="add-new">
                <Plus className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {renderKeyboard()}
        </div>
      )}
    </>
  );
}
