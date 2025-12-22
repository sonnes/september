'use client';

import { Keyboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useKeyboardContext } from '@/packages/keyboards/components/keyboard-context';

interface KeyboardToggleButtonProps {
  className?: string;
}

export function KeyboardToggleButton({ className }: KeyboardToggleButtonProps) {
  const { isVisible, toggleVisibility } = useKeyboardContext();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleVisibility}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 h-auto text-xs rounded-full border border-zinc-200',
        isVisible ? 'text-primary hover:bg-zinc-100' : 'text-zinc-600 hover:bg-zinc-100',
        className
      )}
      aria-label={isVisible ? 'Hide keyboard' : 'Show keyboard'}
    >
      <Keyboard className="size-4" />
    </Button>
  );
}

