'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Clock, LayoutGrid, Mic, Tv, X, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@september/ui/components/button';

import { useAccount } from '@september/account';
import { MessageList, useMessages } from '@september/chats';
import { AudioOutputDeviceSelector } from '@september/audio';
import { SpeechSettings } from '@september/speech';
import type { VoiceSettingsFormData } from '@september/speech';
import {
  CustomKeyboardEditor,
  useCustomKeyboards,
  deleteKeyboard,
  type CustomKeyboard,
} from '@september/keyboards';

import { useChatPanel, type ChatPanelTab } from './use-chat-panel';

// ---------------------------------------------------------------------------
// ChatRightPanel
// ---------------------------------------------------------------------------

interface ChatRightPanelProps {
  chatId: string;
  onOpenDisplay?: () => void;
}

const TAB_TITLE: Record<ChatPanelTab, string> = {
  history: 'History',
  voice: 'Voice',
  boards: 'Boards',
};

export function ChatRightPanel({ chatId, onOpenDisplay }: ChatRightPanelProps) {
  const { activeTab, openTab, home, close } = useChatPanel();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus close button on mount. Esc steps back to the overview, then closes.
  useEffect(() => {
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (activeTab) home();
      else close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeTab, home, close]);

  return (
    <aside
      aria-label="Chat panel"
      className="relative z-10 flex h-full w-full flex-col border-l border-border/60 bg-background"
    >
      {activeTab === null ? (
        <>
          <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
            <span className="text-sm font-semibold">Panel</span>
            <Button
              ref={closeBtnRef}
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close panel"
              className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={close}
            >
              <X className="size-4" />
            </Button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <OverviewCard
                icon={Clock}
                title="History"
                subtitle="Past messages"
                onClick={() => openTab('history')}
              />
              <OverviewCard
                icon={Mic}
                title="Voice"
                subtitle="Voice & speech"
                onClick={() => openTab('voice')}
              />
              <OverviewCard
                icon={LayoutGrid}
                title="Boards"
                subtitle="Phrase boards"
                onClick={() => openTab('boards')}
              />
              <OverviewCard
                icon={Tv}
                title="Display"
                subtitle="Second screen"
                onClick={() => onOpenDisplay?.()}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border/50 px-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Back to panel"
              className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={home}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="flex-1 text-sm font-semibold">{TAB_TITLE[activeTab]}</span>
            <Button
              ref={closeBtnRef}
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close panel"
              className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={close}
            >
              <X className="size-4" />
            </Button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === 'history' && <HistoryTab chatId={chatId} />}
            {activeTab === 'voice' && <VoiceTab />}
            {activeTab === 'boards' && <BoardsTab chatId={chatId} />}
          </div>
        </>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// OverviewCard — large entry tile in the 2×2 grid
// ---------------------------------------------------------------------------

interface OverviewCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function OverviewCard({ icon: Icon, title, subtitle, onClick }: OverviewCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg bg-muted/50 p-6 text-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// History tab
// ---------------------------------------------------------------------------

function HistoryTab({ chatId }: { chatId: string }) {
  const { messages, isLoading } = useMessages({ chatId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading messages…</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <MessageList messages={messages} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice tab
// ---------------------------------------------------------------------------

function VoiceTab() {
  const { account, updateAccount } = useAccount();

  const handleSubmit = async (data: VoiceSettingsFormData) => {
    await updateAccount({
      ai_speech: {
        provider: data.provider,
        voice_id: data.voice_id,
        voice_name: data.voice_name,
        model_id: data.model_id,
        settings: data.settings,
      },
    });
  };

  if (!account) return null;

  return (
    <div className="p-4 space-y-6">
      <SpeechSettings account={account} onSubmit={handleSubmit} />
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium mb-3">Audio Output</h3>
        <AudioOutputDeviceSelector />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boards tab
// ---------------------------------------------------------------------------

type BoardsView =
  | { kind: 'list' }
  | { kind: 'edit'; keyboardId: string }
  | { kind: 'create' };

function BoardsTab({ chatId }: { chatId: string }) {
  const { keyboards, isLoading } = useCustomKeyboards({ chatId });
  const [view, setView] = useState<BoardsView>({ kind: 'list' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading boards…</p>
      </div>
    );
  }

  if (view.kind === 'create') {
    return (
      <CustomKeyboardEditor
        chatId={chatId}
        onSave={() => setView({ kind: 'list' })}
        onCancel={() => setView({ kind: 'list' })}
      />
    );
  }

  if (view.kind === 'edit') {
    return (
      <CustomKeyboardEditor
        keyboardId={view.keyboardId}
        chatId={chatId}
        onSave={() => setView({ kind: 'list' })}
        onCancel={() => setView({ kind: 'list' })}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Boards</h3>
        <Button
          type="button"
          size="sm"
          onClick={() => setView({ kind: 'create' })}
        >
          New board
        </Button>
      </div>

      {keyboards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No boards yet. Create one to add phrase shortcuts to this chat.
        </p>
      ) : (
        <ul className="space-y-2">
          {keyboards.map(kb => (
            <BoardRow
              key={kb.id}
              keyboard={kb}
              onEdit={() => setView({ kind: 'edit', keyboardId: kb.id })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface BoardRowProps {
  keyboard: CustomKeyboard;
  onEdit: () => void;
}

function BoardRow({ keyboard, onEdit }: BoardRowProps) {
  async function handleDelete() {
    try {
      await deleteKeyboard(keyboard.id);
    } catch {
      toast.error('Failed to delete board');
    }
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{keyboard.name}</p>
        <p className="text-xs text-muted-foreground">
          {keyboard.buttons.length} button{keyboard.buttons.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label={`Edit ${keyboard.name}`}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          aria-label={`Delete ${keyboard.name}`}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}
