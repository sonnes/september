'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Clock,
  FileText,
  Grid2x2,
  MessageSquareQuote,
  Mic,
  Pin,
  Plug,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Tv,
  X,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/packages/ui/components/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/packages/ui/components/breadcrumb';

import { cn } from '@/packages/shared';
import { useAccount } from '@/packages/account';
import {
  MessageList,
  updateSpace,
  useMessages,
  useSpaces,
  useSavedPhrases,
  addManualPhrase,
  removePhrase,
  setPhrasePinned,
  type SavedPhrase,
} from '@/packages/spaces';
import { SpeechSettings } from '@/packages/speech';
import type { VoiceSettingsFormData } from '@/packages/speech';
import { TiptapEditor, useEditorContext } from '@/packages/editor';

import { useChatPanel, type ChatPanelTab } from './use-chat-panel';

// ---------------------------------------------------------------------------
// ChatRightPanel
// ---------------------------------------------------------------------------

interface ChatRightPanelProps {
  chatId: string;
  /** Parent chat title — shown as the breadcrumb root in the panel header. */
  chatTitle?: string;
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

export function ChatRightPanel({ chatId, chatTitle, onOpenDisplay }: ChatRightPanelProps) {
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
      className="relative z-10 flex h-full w-full flex-col bg-background"
    >
      <PanelHeader
        chatTitle={chatTitle ?? 'Chat'}
        tab={activeTab}
        onHome={home}
        onClose={close}
        closeRef={closeBtnRef}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === null ? (
          <div className="grid grid-cols-2 gap-3 p-4">
            <OverviewCard
              icon={Clock}
              title="History"
              subtitle="Past messages"
              onClick={() => openTab('history')}
            />
            <OverviewCard
              icon={Plug}
              title="Provider"
              subtitle="Speech engine"
              onClick={() => openTab('provider')}
            />
            <OverviewCard
              icon={MessageSquareQuote}
              title="Phrases"
              subtitle="Quick phrases"
              onClick={() => openTab('phrases')}
            />
            <OverviewCard
              icon={Mic}
              title="Voice"
              subtitle="Pick a voice"
              onClick={() => openTab('voice')}
            />
            <OverviewCard
              icon={SlidersHorizontal}
              title="Speech"
              subtitle="Speed & tuning"
              onClick={() => openTab('speech')}
            />
            <OverviewCard
              icon={FileText}
              title="Context"
              subtitle="Space context"
              onClick={() => openTab('context')}
            />
            <OverviewCard
              icon={Tv}
              title="Display"
              subtitle="Second screen"
              onClick={() => onOpenDisplay?.()}
            />
          </div>
        ) : activeTab === 'history' ? (
          <HistoryTab chatId={chatId} />
        ) : activeTab === 'context' ? (
          <ContextTab spaceId={chatId} />
        ) : activeTab === 'phrases' ? (
          <PhrasesTab spaceId={chatId} />
        ) : (
          <VoiceTab section={activeTab} />
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// PanelHeader — tab-bar chrome: a tab-bar row (grid switcher + active
// tab pill + close) above a breadcrumb row (chat › section).
// ---------------------------------------------------------------------------

interface PanelHeaderProps {
  chatTitle: string;
  /** null = overview card grid; a tab = that section is active. */
  tab: ChatPanelTab | null;
  onHome: () => void;
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
}

function PanelHeader({ chatTitle, tab, onHome, onClose, closeRef }: PanelHeaderProps) {
  const meta = tab ? TAB_META[tab] : null;
  const TabIcon = meta?.icon;

  return (
    <header className="shrink-0 border-b border-border/60">
      {/* Row 1 — tab bar: overview switcher · active tab pill · close */}
      <div className="flex h-12 items-center gap-1.5 px-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="All panels"
          aria-pressed={tab === null}
          className={cn(
            'size-9 shrink-0 text-muted-foreground hover:text-foreground',
            tab === null && 'bg-muted text-foreground',
          )}
          onClick={onHome}
        >
          <Grid2x2 className="size-4" />
        </Button>

        {meta && TabIcon ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm font-medium text-foreground">
            <TabIcon className="size-4" aria-hidden />
            {meta.title}
          </span>
        ) : (
          <span className="px-1 text-sm font-semibold">Panel</span>
        )}

        <Button
          ref={closeRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close panel"
          className="ml-auto size-9 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Row 2 — breadcrumb: chat title › active section */}
      <div className="flex h-9 items-center px-3 pb-1.5">
        <Breadcrumb>
          <BreadcrumbList className="gap-1 sm:gap-1.5">
            <BreadcrumbItem className="min-w-0">
              {meta ? (
                <BreadcrumbLink asChild>
                  <button type="button" onClick={onHome} className="truncate">
                    {chatTitle}
                  </button>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate">{chatTitle}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {meta && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{meta.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
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
          Tap a phrase to drop it into the composer. Pinned phrases stay; AI phrases
          refresh as the conversation grows.
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
        <Button type="submit" size="icon" variant="secondary" disabled={!draft.trim()} aria-label="Add phrase">
          <Plus className="size-4" />
        </Button>
      </form>

      {phrases.length === 0 ? (
        <p className="text-sm text-muted-foreground">Phrases appear here after your first message.</p>
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && <PhraseGroup label="Pinned" icon={Pin} rows={pinned} onInsert={insert} />}
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

function PhraseRow({ phrase, onInsert }: { phrase: SavedPhrase; onInsert: (text: string) => void }) {
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
