'use client';

import React from 'react';

import { cn } from '@/packages/shared';

interface QwertyKeyboardProps {
  className?: string;
  onKeyPress: (key: string) => void;
}

export function QwertyKeyboard({ className = '', onKeyPress }: QwertyKeyboardProps) {
  const [isShiftPressed, setIsShiftPressed] = React.useState(false);

  const handleKeyPress = (key: string) => {
    if (key === 'SHIFT') {
      setIsShiftPressed(prev => !prev);
      return;
    }
    if (key === 'BACKSPACE' || key === 'ENTER' || key === 'SPACE' || /^[0-9]$/.test(key)) {
      onKeyPress(key);
    } else {
      onKeyPress(isShiftPressed ? key.toUpperCase() : key.toLowerCase());
    }
    setIsShiftPressed(false);
  };

  const letter = (key: string) => (isShiftPressed ? key : key.toLowerCase());

  const numpadRows = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['0']];

  return (
    <div className={cn('bg-zinc-100 border-t border-border px-2 pt-2.5 pb-3', className)}>
      <div className="lg:flex lg:gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <Row className="lg:hidden">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(k => (
              <Key key={k} onClick={() => handleKeyPress(k)} variant="letter" flex>
                {k}
              </Key>
            ))}
          </Row>

          <Row>
            {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(k => (
              <Key key={k} onClick={() => handleKeyPress(k)} variant="letter" flex>
                {letter(k)}
              </Key>
            ))}
          </Row>

          <Row className="px-[5%]">
            {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map(k => (
              <Key key={k} onClick={() => handleKeyPress(k)} variant="letter" flex>
                {letter(k)}
              </Key>
            ))}
          </Row>

          <Row>
            <Key
              onClick={() => handleKeyPress('SHIFT')}
              variant={isShiftPressed ? 'letter' : 'func'}
              width="w-14"
            >
              <ShiftIcon active={isShiftPressed} />
            </Key>
            {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(k => (
              <Key key={k} onClick={() => handleKeyPress(k)} variant="letter" flex>
                {letter(k)}
              </Key>
            ))}
            <Key onClick={() => handleKeyPress('BACKSPACE')} variant="func" width="w-14">
              <BackspaceIcon />
            </Key>
          </Row>

          <Row>
            <Key onClick={() => handleKeyPress('😀')} variant="func" width="w-14" className="text-xl">
              😀
            </Key>
            <Key
              onClick={() => handleKeyPress('SPACE')}
              variant="letter"
              flex
              className="text-sm text-muted-foreground"
            >
              space
            </Key>
            <Key onClick={() => handleKeyPress('ENTER')} variant="primary" width="w-20" className="text-sm">
              return
            </Key>
          </Row>
        </div>

        {/* Numpad — lg and above only */}
        <div className="hidden lg:flex lg:flex-col lg:gap-2 lg:w-36">
          {numpadRows.map((row, i) => (
            <Row key={i}>
              {row.map(k => (
                <Key key={k} onClick={() => handleKeyPress(k)} variant="letter" flex>
                  {k}
                </Key>
              ))}
            </Row>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex gap-1.5', className)}>{children}</div>;
}

interface KeyProps {
  children: React.ReactNode;
  onClick: () => void;
  variant: 'letter' | 'func' | 'primary';
  flex?: boolean;
  width?: string;
  className?: string;
}

function Key({ children, onClick, variant, flex, width, className }: KeyProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center h-10',
        'rounded-md border text-[15px] font-normal',
        'select-none cursor-pointer transition-colors',
        variant === 'letter' && 'bg-background border-border text-foreground hover:bg-zinc-50 active:bg-zinc-100',
        variant === 'func' && 'bg-zinc-200 border-zinc-200 text-foreground hover:bg-zinc-300 active:bg-zinc-300',
        variant === 'primary' && 'bg-primary border-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
        flex ? 'flex-1' : width,
        className
      )}
    >
      {children}
    </button>
  );
}

function ShiftIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 1L1.5 8.5H6V14.5H12V8.5H16.5L9 1Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackspaceIcon() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 22 16" fill="none">
      <path
        d="M8 1H20C20.5523 1 21 1.44772 21 2V14C21 14.5523 20.5523 15 20 15H8L1 8L8 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13 5.5L9 10.5M9 5.5L13 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
