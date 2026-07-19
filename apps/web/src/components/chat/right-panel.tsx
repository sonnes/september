'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  Check,
  Hash,
  Lightbulb,
  type LucideIcon,
  MessageSquareQuote,
  PanelRightClose,
  Pin,
  Plus,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';

import { useAccount } from '@/packages/account';
import { useEditorContext } from '@/packages/editor';
import { cn } from '@/packages/shared';
import {
  type MinedShortcut,
  type SavedPhrase,
  addManualPhrase,
  mineShortcuts,
  normalizeMinedText,
  removePhrase,
  rowKind,
  setPhraseCode,
  setPhrasePinned,
  useMessages,
  useSavedPhrases,
  validateCode,
} from '@/packages/spaces';
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
  phrases: { title: 'Phrases', icon: MessageSquareQuote },
};

// Voice settings moved to the dedicated /voice page; History to the main
// column; Context to the space's About note.
const TAB_ORDER: ChatPanelTab[] = ['phrases'];

function TabBody({ tab, chatId }: { tab: ChatPanelTab; chatId: string }) {
  switch (tab) {
    case 'phrases':
    default:
      return <PhrasesTab spaceId={chatId} />;
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
// Phrases tab — per-space saved phrases. Tap to insert into the composer;
// pinned phrases are durable, AI phrases refresh as the conversation grows.
// ---------------------------------------------------------------------------

/** localStorage key holding normalized texts of dismissed shortcut ideas. */
const DISMISSED_KEY = 'september:mined-dismissed';
/** How many recent messages feed shortcut mining. */
const MINE_WINDOW = 300;

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(dismissed: Set<string>): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
  } catch {
    // localStorage unavailable — dismissals just don't persist.
  }
}

function codeWarning(raw: string, validation: ReturnType<typeof validateCode>): string | undefined {
  if (validation.ok) return undefined;
  const code = raw.trim().toLowerCase();
  const tryHint = validation.suggestion ? ` Try "${validation.suggestion}".` : '';
  switch (validation.reason) {
    case 'format':
      return 'Codes are 2–5 letters or digits.';
    case 'dictionary':
      return `"${code}" is a common word — you'd trigger it by accident.${tryHint}`;
    case 'duplicate':
      return `"${code}" is already used by another phrase.${tryHint}`;
  }
}

function PhrasesTab({ spaceId }: { spaceId: string }) {
  const { user } = useAccount();
  const { phrases } = useSavedPhrases({ spaceId });
  // All phrases across spaces — codes are unique app-wide (a code defined
  // anywhere works everywhere), so validation and mining see everything.
  const { phrases: allPhrases } = useSavedPhrases();
  const { messages } = useMessages({ spaceId, limit: MINE_WINDOW });
  const { text, setText } = useEditorContext();
  const [draft, setDraft] = useState('');
  const [draftCode, setDraftCode] = useState('');
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  const existingCodes = useMemo(
    () => allPhrases.filter(p => p.code).map(p => p.code as string),
    [allPhrases]
  );

  const codeValidation = useMemo(
    () => (draftCode.trim() ? validateCode(draftCode, { existingCodes }) : undefined),
    [draftCode, existingCodes]
  );
  const codeError = codeValidation && codeWarning(draftCode, codeValidation);

  const proposals = useMemo<MinedShortcut[]>(
    () => mineShortcuts(messages, { existingPhrases: allPhrases, dismissed }),
    [messages, allPhrases, dismissed]
  );

  const insert = (phrase: string) => {
    const next = !text || /\s$/.test(text) ? text + phrase : `${text} ${phrase}`;
    setText(next);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value || !user) return;
    if (codeValidation && !codeValidation.ok) return;
    addManualPhrase(spaceId, user.id, value, {
      code: codeValidation?.ok ? codeValidation.code : undefined,
    }).catch(err => {
      console.error('Failed to add phrase:', err);
    });
    setDraft('');
    setDraftCode('');
  };

  const keepProposal = (proposal: MinedShortcut) => {
    if (!user) return;
    addManualPhrase(spaceId, user.id, proposal.text, { code: proposal.code }).catch(err => {
      console.error('Failed to keep shortcut:', err);
    });
  };

  const dismissProposal = (proposal: MinedShortcut) => {
    const next = new Set(dismissed);
    next.add(normalizeMinedText(proposal.text));
    setDismissed(next);
    saveDismissed(next);
  };

  const pinned = phrases.filter(p => p.pinned);
  const generated = phrases.filter(p => !p.pinned);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Saved phrases</h3>
        <p className="text-xs text-muted-foreground">
          Tap a phrase to drop it into the composer. Pinned phrases stay; AI phrases refresh as the
          conversation grows. A code (like <span className="font-semibold">ty</span>) brings its
          phrase up while you type.
        </p>
      </div>

      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Add a phrase…"
            aria-label="Add a phrase"
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            value={draftCode}
            onChange={e => setDraftCode(e.target.value)}
            placeholder="code"
            aria-label="Code (optional)"
            maxLength={5}
            className={cn(
              'w-16 rounded-md border bg-background px-2 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              codeError && 'border-destructive'
            )}
          />
          <Button
            type="submit"
            size="icon"
            variant="secondary"
            disabled={!draft.trim() || Boolean(codeError)}
            aria-label="Add phrase"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        {codeError && <p className="text-xs text-destructive">{codeError}</p>}
      </form>

      {phrases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Phrases appear here after your first message.
        </p>
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <PhraseGroup
              label="Pinned"
              icon={Pin}
              rows={pinned}
              onInsert={insert}
              existingCodes={existingCodes}
            />
          )}
          {generated.length > 0 && (
            <PhraseGroup
              label="Suggested"
              icon={Sparkles}
              rows={generated}
              onInsert={insert}
              existingCodes={existingCodes}
            />
          )}
        </div>
      )}

      {proposals.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="size-3.5" aria-hidden />
            Shortcut ideas
          </div>
          <ul className="space-y-1.5">
            {proposals.map(proposal => (
              <li
                key={proposal.text}
                className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5"
              >
                <div className="min-w-0 flex-1 px-3 py-2">
                  <p className="truncate text-sm" title={proposal.text}>
                    {proposal.text}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Typed {proposal.count}× — code <CodeBadge code={proposal.code} />
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Keep shortcut"
                  title="Keep as a phrase with this code"
                  onClick={() => keepProposal(proposal)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Check className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Dismiss shortcut idea"
                  title="Don't suggest this again"
                  onClick={() => dismissProposal(proposal)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CodeBadge({ code, muted }: { code: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold',
        muted
          ? 'border-border bg-muted text-muted-foreground'
          : 'border-primary/30 bg-primary/10 text-primary'
      )}
    >
      {code}
    </span>
  );
}

function PhraseGroup({
  label,
  icon: Icon,
  rows,
  onInsert,
  existingCodes,
}: {
  label: string;
  icon: LucideIcon;
  rows: SavedPhrase[];
  onInsert: (text: string) => void;
  existingCodes: string[];
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <ul className="space-y-1.5">
        {rows.map(p => (
          <PhraseRow key={p.id} phrase={p} onInsert={onInsert} existingCodes={existingCodes} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Inline code editor for a pinned row — a tiny input that saves on Enter and
 * cancels on Escape. Validation excludes the row's own current code.
 */
function PhraseCodeEditor({
  phrase,
  existingCodes,
  onDone,
}: {
  phrase: SavedPhrase;
  existingCodes: string[];
  onDone: () => void;
}) {
  const [value, setValue] = useState(phrase.code ?? '');
  const others = existingCodes.filter(c => c !== phrase.code);
  const validation = value.trim() ? validateCode(value, { existingCodes: others }) : undefined;
  const error = validation && codeWarning(value, validation);

  const save = () => {
    if (error) return;
    const code = validation?.ok ? validation.code : undefined;
    setPhraseCode(phrase.id, code).catch(() => {});
    onDone();
  };

  return (
    <input
      autoFocus
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          save();
        }
        if (e.key === 'Escape') onDone();
      }}
      onBlur={save}
      maxLength={5}
      aria-label="Edit code"
      aria-invalid={Boolean(error)}
      title={error}
      className={cn(
        'w-14 shrink-0 rounded-md border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        error && 'border-destructive'
      )}
    />
  );
}

function PhraseRow({
  phrase,
  onInsert,
  existingCodes,
}: {
  phrase: SavedPhrase;
  onInsert: (text: string) => void;
  existingCodes: string[];
}) {
  const [editingCode, setEditingCode] = useState(false);
  const isStarter = rowKind(phrase) === 'starter';

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
      {isStarter && (
        <span className="shrink-0 rounded-md border border-dashed border-primary/40 px-1.5 py-0.5 text-xs text-primary/70">
          starter
        </span>
      )}
      {editingCode ? (
        <PhraseCodeEditor
          phrase={phrase}
          existingCodes={existingCodes}
          onDone={() => setEditingCode(false)}
        />
      ) : phrase.code ? (
        <button
          type="button"
          aria-label={`Edit code ${phrase.code}`}
          title={phrase.pinned ? 'Edit code' : 'Code refreshes with AI phrases — pin to keep it'}
          onClick={() => setEditingCode(true)}
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CodeBadge code={phrase.code} muted={!phrase.pinned} />
        </button>
      ) : (
        phrase.pinned && (
          <button
            type="button"
            aria-label="Add code"
            title="Add a code for this phrase"
            onClick={() => setEditingCode(true)}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Hash className="size-3.5" aria-hidden />
          </button>
        )
      )}
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
