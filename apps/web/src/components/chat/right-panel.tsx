'use client';

import { useEffect, useRef, useState } from 'react';

import {
  Clock,
  FileText,
  type LucideIcon,
  MessageSquareQuote,
  Mic,
  PanelRightClose,
  Pin,
  Plug,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';

import { useAccount } from '@/packages/account';
import { TiptapEditor, useEditorContext } from '@/packages/editor';
import { cn } from '@/packages/shared';
import {
  MessageList,
  type SavedPhrase,
  addManualPhrase,
  removePhrase,
  setPhrasePinned,
  updateSpace,
  useMessages,
  useSavedPhrases,
  useSpaces,
} from '@/packages/spaces';
import { SpeechSettings } from '@/packages/speech';
import type { VoiceSettingsFormData } from '@/packages/speech';
import { Button } from '@/packages/ui/components/button';

import { type ChatPanelTab, useChatPanel } from './use-chat-panel';

// ---------------------------------------------------------------------------
// PanelRail — always-present right icon rail that expands to a 320px tool card
// ---------------------------------------------------------------------------

interface PanelRailProps {
  chatId: string;
  onOpenDisplay?: () => void;
}

const TAB_META: Record<ChatPanelTab, { title: string; icon: LucideIcon }> = {
  history: { title: 'History', icon: Clock },
  provider: { title: 'Provider', icon: Plug },
  voice: { title: 'Voice', icon: Mic },
  speech: { title: 'Speech', icon: SlidersHorizontal },
  context: { title: 'Context', icon: FileText },
  phrases: { title: 'Phrases', icon: MessageSquareQuote },
};

const TAB_ORDER: ChatPanelTab[] = ['history', 'provider', 'voice', 'speech', 'context', 'phrases'];

function TabBody({ tab, chatId }: { tab: ChatPanelTab; chatId: string }) {
  switch (tab) {
    case 'history':
      return <HistoryTab chatId={chatId} />;
    case 'context':
      return <ContextTab spaceId={chatId} />;
    case 'phrases':
      return <PhrasesTab spaceId={chatId} />;
    default:
      return <VoiceTab section={tab} />;
  }
}

export function PanelRail({ chatId, onOpenDisplay }: PanelRailProps) {
  const { state, activeTab, expandTab, collapse } = useChatPanel();
  const expanded = state === 'expanded';

  // Esc collapses the expanded card back to the rail.
  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') collapse();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded, collapse]);

  const meta = TAB_META[activeTab];
  const TabIcon = meta.icon;

  return (
    <>
      {expanded && (
        <aside
          aria-label={`${meta.title} panel`}
          className="fixed inset-x-2 top-2 bottom-2 z-40 flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm md:static md:inset-auto md:my-2 md:w-80"
        >
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
            <TabIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">{meta.title}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Collapse panel"
              className="ml-auto size-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={collapse}
            >
              <PanelRightClose className="size-4" />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TabBody tab={activeTab} chatId={chatId} />
          </div>
        </aside>
      )}

      <nav
        aria-label="Panel rail"
        className="my-2 mr-2 hidden w-14 shrink-0 flex-col items-center gap-1 rounded-xl border bg-background py-2 shadow-sm md:flex"
      >
        {TAB_ORDER.map(tab => {
          const { title, icon: Icon } = TAB_META[tab];
          const isActive = expanded && activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              aria-label={title}
              title={title}
              aria-pressed={isActive}
              onClick={() => (isActive ? collapse() : expandTab(tab))}
              className={cn(
                'flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive && 'bg-muted text-foreground'
              )}
            >
              <Icon className="size-5" aria-hidden />
            </button>
          );
        })}

        <div className="my-1 h-px w-6 bg-border" aria-hidden />

        <button
          type="button"
          aria-label="Display"
          title="Display"
          onClick={() => onOpenDisplay?.()}
          className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Tv className="size-5" aria-hidden />
        </button>
      </nav>
    </>
  );
}

// ---------------------------------------------------------------------------
// History tab
// ---------------------------------------------------------------------------

function HistoryTab({ chatId }: { chatId: string }) {
  const { messages, isLoading } = useMessages({ spaceId: chatId });

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

function VoiceTab({ section }: { section: 'provider' | 'voice' | 'speech' }) {
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
    <div className="@container p-4 space-y-6">
      <SpeechSettings account={account} onSubmit={handleSubmit} section={section} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Context tab
// ---------------------------------------------------------------------------

function ContextTab({ spaceId }: { spaceId: string }) {
  const { spaces } = useSpaces();
  const space = spaces.find(s => s.id === spaceId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdate = (_html: string, markdown: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSpace(spaceId, { context: markdown }).catch(err => {
        console.error('Failed to save context:', err);
      });
    }, 500);
  };

  return (
    <div className="p-4 space-y-3">
      <div>
        <h3 className="text-sm font-medium mb-1">Space context</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Add bullet points (- phrase) to seed suggestions for this space.
        </p>
      </div>
      <TiptapEditor
        content={space?.context ?? ''}
        placeholder="- I need some water&#10;- Can you help me"
        onUpdate={handleUpdate}
        className="min-h-48"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phrases tab — per-space saved phrases. Tap to insert into the composer;
// pinned phrases are durable, AI phrases refresh as the conversation grows.
// ---------------------------------------------------------------------------

function PhrasesTab({ spaceId }: { spaceId: string }) {
  const { user } = useAccount();
  const { phrases } = useSavedPhrases({ spaceId });
  const { text, setText } = useEditorContext();
  const [draft, setDraft] = useState('');

  const insert = (phrase: string) => {
    const next = !text || /\s$/.test(text) ? text + phrase : `${text} ${phrase}`;
    setText(next);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value || !user) return;
    addManualPhrase(spaceId, user.id, value).catch(err => {
      console.error('Failed to add phrase:', err);
    });
    setDraft('');
  };

  const pinned = phrases.filter(p => p.pinned);
  const generated = phrases.filter(p => !p.pinned);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Saved phrases</h3>
        <p className="text-xs text-muted-foreground">
          Tap a phrase to drop it into the composer. Pinned phrases stay; AI phrases refresh as the
          conversation grows.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add a phrase…"
          aria-label="Add a phrase"
          className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          type="submit"
          size="icon"
          variant="secondary"
          disabled={!draft.trim()}
          aria-label="Add phrase"
        >
          <Plus className="size-4" />
        </Button>
      </form>

      {phrases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Phrases appear here after your first message.
        </p>
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <PhraseGroup label="Pinned" icon={Pin} rows={pinned} onInsert={insert} />
          )}
          {generated.length > 0 && (
            <PhraseGroup label="Suggested" icon={Sparkles} rows={generated} onInsert={insert} />
          )}
        </div>
      )}
    </div>
  );
}

function PhraseGroup({
  label,
  icon: Icon,
  rows,
  onInsert,
}: {
  label: string;
  icon: LucideIcon;
  rows: SavedPhrase[];
  onInsert: (text: string) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <ul className="space-y-1.5">
        {rows.map(p => (
          <PhraseRow key={p.id} phrase={p} onInsert={onInsert} />
        ))}
      </ul>
    </section>
  );
}

function PhraseRow({
  phrase,
  onInsert,
}: {
  phrase: SavedPhrase;
  onInsert: (text: string) => void;
}) {
  return (
    <li className="flex items-center gap-1 rounded-md border bg-card">
      <button
        type="button"
        onClick={() => onInsert(phrase.text)}
        title={phrase.text}
        className="flex min-h-11 min-w-0 flex-1 items-center truncate px-3 py-2 text-left text-sm text-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {phrase.text}
      </button>
      <button
        type="button"
        aria-label={phrase.pinned ? 'Unpin phrase' : 'Keep phrase'}
        title={phrase.pinned ? 'Unpin' : 'Keep'}
        onClick={() => setPhrasePinned(phrase.id, !phrase.pinned).catch(() => {})}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          phrase.pinned && 'text-primary'
        )}
      >
        <Pin className={cn('size-4', phrase.pinned && 'fill-current')} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Remove phrase"
        title="Remove"
        onClick={() => removePhrase(phrase.id).catch(() => {})}
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </li>
  );
}
