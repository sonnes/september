'use client';

import { cn } from '@/packages/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/packages/ui/components/tabs';

import { CircularKeyboard } from './circular-keyboard';
import { useKeyboardContext } from './keyboard-context';
import { QwertyKeyboard } from './qwerty-keyboard';

interface KeyboardRendererProps {
  className?: string;
  onKeyPress: (key: string) => void;
}

export function KeyboardRenderer({ className = '', onKeyPress }: KeyboardRendererProps) {
  const { isVisible, keyboardType, setKeyboardType } = useKeyboardContext();

  if (!isVisible) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Tabs value={keyboardType === 'none' ? 'qwerty' : keyboardType} onValueChange={v => setKeyboardType(v as 'qwerty' | 'circular')}>
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
    </div>
  );
}
