import { useCallback, useEffect, useRef, useState } from 'react';

import { TvIcon } from '@heroicons/react/24/outline';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Delete,
  FileText,
  HistoryIcon,
  Loader2,
  MessageSquareQuote,
  MessagesSquare,
  MicIcon,
  PanelRight,
  Plug,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';

import { ChatRightPanel } from '@/components/chat/right-panel';
import { ChatPanelProvider, useChatPanel } from '@/components/chat/use-chat-panel';
import MobileNav from '@/components/nav/mobile';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';
import { useAccount } from '@/packages/account';
import {
  AudioOutputDeviceSelector,
  TextViewer,
  TextViewerWords,
  useAudioPlayer,
} from '@/packages/audio';
import { Autocomplete, useEditorContext } from '@/packages/editor';
import {
  type Note,
  SpaceNotes,
  SpaceNotesPanel,
  createNote,
  updateNote,
  useNotes,
} from '@/packages/notes';
import { noteContentUpdates } from '@/packages/notes/lib/title';
import { DisplayMessage, cn, entitySlug, idFromSlug } from '@/packages/shared';
import {
  EditableSpaceTitle,
  type Message,
  SpaceSwitch,
  addManualPhrase,
  updateSpace,
  useCreateAudioMessage,
  useGenerateSpaceContext,
  useMessages,
  usePlayMessage,
  useSavedPhrases,
  useSpaces,
  useSyncSpacePhrases,
} from '@/packages/spaces';
import { Suggestions } from '@/packages/suggestions';
import { Button } from '@/packages/ui/components/button';
import { Separator } from '@/packages/ui/components/separator';
import { SidebarTrigger } from '@/packages/ui/components/sidebar';

import { type SpaceMode, routeForSpaceMode, shouldShowSpaceSidePanel } from '../-space-mode';

export const Route = createFileRoute('/_app/talk/$spaceSlug/')({
  head: () => ({
    meta: [{ title: pageTitle('Talk') }],
  }),
  component: SpacePageRoot,
});

// ---------------------------------------------------------------------------
// Left-rail icon button (undo / delete-word / clear) — mock composer rail
// ---------------------------------------------------------------------------

function ModeSwitch({
  mode,
  onModeChange,
  className,
}: {
  mode: SpaceMode;
  onModeChange: (mode: SpaceMode) => void;
  className?: string;
}) {
  return (
    <div
      className={cn('flex rounded-lg bg-muted p-1 text-sm font-medium', className)}
      role="tablist"
      aria-label="Space mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'talk'}
        onClick={() => onModeChange('talk')}
        className={cn(
          'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          mode === 'talk' && 'bg-background text-foreground shadow-sm'
        )}
      >
        <MessagesSquare className="size-4" aria-hidden />
        Talk
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'notes'}
        onClick={() => onModeChange('notes')}
        className={cn(
          'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          mode === 'notes' && 'bg-background text-foreground shadow-sm'
        )}
      >
        <FileText className="size-4" aria-hidden />
        Notes
      </button>
    </div>
  );
}

function RailButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Transcript bubble — a spoken message; tap to replay (or pause) its audio.
// ---------------------------------------------------------------------------

function TranscriptBubble({ message }: { message: Message }) {
  const { play, isLoading, isPlaying } = usePlayMessage(message);
  return (
    <div className="flex animate-in fade-in slide-in-from-bottom-1 justify-end motion-reduce:animate-none">
      <button
        type="button"
        onClick={play}
        aria-label={isPlaying ? 'Pause message' : 'Play message'}
        className={cn(
          'flex max-w-[85%] items-start gap-2 rounded-lg rounded-br-sm bg-accent px-4 py-2.5 text-left text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isLoading && 'opacity-70'
        )}
      >
        {isLoading ? (
          <Loader2 className="mt-1 size-4 shrink-0 animate-spin opacity-60" aria-hidden />
        ) : (
          <Volume2 className="mt-1 size-4 shrink-0 opacity-60" aria-hidden />
        )}
        <p className="text-base leading-snug">{message.text}</p>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner component — reads useChatPanel() which requires the Provider above it
// ---------------------------------------------------------------------------

export function SpacePageInner({
  spaceId,
  mode,
  noteId,
  noteSlug,
  routeSpaceSlug,
}: {
  spaceId: string;
  mode: SpaceMode;
  noteId?: string | null;
  noteSlug?: string;
  routeSpaceSlug?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAccount();
  const { enqueue, current } = useAudioPlayer();
  const { spaces } = useSpaces({ userId: user?.id });
  const { messages, isLoading: messagesLoading } = useMessages({ spaceId: spaceId || '' });

  const space = spaces.find(s => s.id === spaceId);

  // Saved phrases: seed on first message, regenerate on open when stale.
  const { phrases: savedPhrases } = useSavedPhrases({ spaceId });
  useSyncSpacePhrases({ space, phrases: savedPhrases, messages, messagesLoading });

  const { status, createAudioMessage } = useCreateAudioMessage();
  const { generateContext } = useGenerateSpaceContext();
  const { text, setText, trackKeystroke, getAndResetStats } = useEditorContext();
  const popupRef = useRef<Window | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const { notes } = useNotes({ spaceId });
  const selectedNote = notes.find(note => note.id === selectedNoteId) ?? notes[0];

  const { open, widthPct, setWidthPct, openTab, openOverview, close } = useChatPanel();
  const currentSpaceSlug = entitySlug(space?.title, spaceId, 'space');
  const currentNoteSlug = selectedNote
    ? entitySlug(selectedNote.name, selectedNote.id, 'note')
    : undefined;

  useEffect(() => {
    setSelectedNoteId(noteId ?? null);
  }, [noteId]);

  const handleModeChange = useCallback(
    (nextMode: SpaceMode) => {
      if (nextMode === mode) return;
      navigate({ to: routeForSpaceMode(nextMode), params: { spaceSlug: currentSpaceSlug } });
    },
    [currentSpaceSlug, mode, navigate]
  );

  const handleSelectedNoteIdChange = useCallback(
    (id: string | null, noteOverride?: Note) => {
      setSelectedNoteId(id);
      if (mode !== 'notes' || !id) return;

      const note = noteOverride ?? notes.find(item => item.id === id);
      const nextNoteSlug = entitySlug(note?.name, id, 'note');
      if (routeSpaceSlug === currentSpaceSlug && noteSlug === nextNoteSlug) return;

      navigate({
        to: '/notes/$spaceSlug/$noteSlug',
        params: {
          spaceSlug: currentSpaceSlug,
          noteSlug: nextNoteSlug,
        },
      });
    },
    [currentSpaceSlug, mode, navigate, noteSlug, notes, routeSpaceSlug]
  );

  useEffect(() => {
    if (mode !== 'notes' || !routeSpaceSlug) return;

    if (selectedNote && currentNoteSlug) {
      if (routeSpaceSlug === currentSpaceSlug && noteSlug === currentNoteSlug) return;
      navigate({
        to: '/notes/$spaceSlug/$noteSlug',
        params: { spaceSlug: currentSpaceSlug, noteSlug: currentNoteSlug },
        replace: true,
      });
      return;
    }

    if (!noteSlug && routeSpaceSlug !== currentSpaceSlug) {
      navigate({
        to: '/notes/$spaceSlug',
        params: { spaceSlug: currentSpaceSlug },
        replace: true,
      });
    }
  }, [currentNoteSlug, currentSpaceSlug, mode, navigate, noteSlug, routeSpaceSlug, selectedNote]);

  // Undo stack for the composer. Guarded so programmatic restores don't
  // re-push. Captures every text change (typed or suggestion-driven).
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const prevTextRef = useRef(text);
  const isUndoingRef = useRef(false);

  useEffect(() => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false;
      prevTextRef.current = text;
      return;
    }
    if (text !== prevTextRef.current) {
      setUndoStack(s => [...s.slice(-49), prevTextRef.current]);
      prevTextRef.current = text;
    }
  }, [text]);

  // Auto-grow the composer textarea to fit its content — borrowed from the
  // previous /talk editor (Editor component).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!spaceId || !user || !text.trim()) return;

      const trimmed = text.trim();
      const editorStats = getAndResetStats();

      const previousText = messages[messages.length - 1]?.text;
      // When the display popup plays the audio, the main window must not stream
      // it live — keep the buffered path so the popup gets the full blob.
      const isDisplayOpen = popupRef.current && !popupRef.current.closed;
      const { message, audio, playedLive } = await createAudioMessage(
        {
          space_id: spaceId,
          text: trimmed,
          type: 'user',
          user_id: user.id,
          editorStats,
        },
        { previousText, playLive: !isDisplayOpen }
      );

      // Skip enqueue when streaming already played the audio live.
      if (audio && !isDisplayOpen && !playedLive) {
        enqueue(audio);
      }

      const channel = new BroadcastChannel(`chat-display-${spaceId}`);
      channel.postMessage({
        type: 'new-message',
        message,
        audio: audio?.blob,
        alignment: audio?.alignment,
        timestamp: Date.now(),
      } satisfies DisplayMessage);
      channel.close();

      setText('');
      inputRef.current?.focus();

      if (messages.length === 0) {
        generateContext({ messageText: trimmed })
          .then(
            result =>
              result && updateSpace(spaceId, { title: result.title, context: result.context })
          )
          .catch(() => {});
      }
    },
    [
      spaceId,
      user,
      createAudioMessage,
      enqueue,
      setText,
      getAndResetStats,
      messages,
      generateContext,
    ]
  );

  const handleAppendToNote = useCallback(
    async (draft: string) => {
      const trimmed = draft.trim();
      if (!trimmed) return;

      try {
        if (selectedNote) {
          const nextContent = selectedNote.content.trim()
            ? `${selectedNote.content.trimEnd()}\n\n${trimmed}`
            : trimmed;
          await updateNote(selectedNote.id, noteContentUpdates(selectedNote.name, nextContent));
          handleSelectedNoteIdChange(selectedNote.id, selectedNote);
        } else {
          const note = await createNote({
            space_id: spaceId,
            name: trimmed.split(/\s+/).slice(0, 6).join(' '),
            content: trimmed,
          });
          handleSelectedNoteIdChange(note.id, note);
        }

        setText('');
        inputRef.current?.focus();
        toast.success('Added to note');
      } catch (err) {
        toast.error('Error', {
          description: err instanceof Error ? err.message : 'Failed to add text to note',
        });
      }
    },
    [handleSelectedNoteIdChange, selectedNote, spaceId, setText]
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (mode === 'notes') {
          handleAppendToNote(text);
        } else {
          handleSubmit(text);
        }
        return;
      }
      trackKeystroke();
    },
    [text, mode, handleAppendToNote, handleSubmit, trackKeystroke]
  );

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    isUndoingRef.current = true;
    setText(prev);
    setUndoStack(s => s.slice(0, -1));
    inputRef.current?.focus();
  }, [undoStack, setText]);

  const deleteLastWord = useCallback(() => {
    const trimmed = text.replace(/\s+$/, '');
    const idx = trimmed.search(/\S+$/);
    setText(idx > 0 ? trimmed.slice(0, idx) : '');
    inputRef.current?.focus();
  }, [text, setText]);

  const clearText = useCallback(() => {
    setText('');
    inputRef.current?.focus();
  }, [setText]);

  const handleOpenDisplay = useCallback(() => {
    const width = 375;
    const height = 667;
    const left = 100;
    const top = 100;

    const popup = window.open(
      `/display/${spaceId}`,
      `display-${spaceId}`,
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    if (popup && !popup.closed) {
      popup.focus();
    }

    popupRef.current = popup;
  }, [spaceId]);

  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, [spaceId]);

  // Drag-to-resize the detached panel. The panel now lives outside the inset,
  // so we size it as a share of the sidebar wrapper and adjust widthPct as the
  // left edge is dragged (drag left → wider panel).
  const onPanelResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const wrapper = (e.currentTarget as HTMLElement).closest(
        '[data-slot="sidebar-wrapper"]'
      ) as HTMLElement | null;
      const basis = wrapper?.clientWidth ?? window.innerWidth;
      const startX = e.clientX;
      const startPct = widthPct;
      const onMove = (ev: PointerEvent) => {
        setWidthPct(startPct + ((startX - ev.clientX) / basis) * 100);
      };
      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.removeProperty('user-select');
      };
      document.body.style.userSelect = 'none';
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [widthPct, setWidthPct]
  );

  // Pinning a suggestion saves it as a pinned (durable) phrase for this space.
  const handlePin = useCallback(
    (phrase: string) => {
      if (!user) return;
      addManualPhrase(spaceId, user.id, phrase).catch(err => {
        console.error('Failed to pin phrase:', err);
      });
    },
    [spaceId, user]
  );

  // Recently spoken messages. Tap one to replay it.
  const spoken = (messages ?? []).filter(m => m.type === 'user').slice(-6);
  const showSidePanel = shouldShowSpaceSidePanel(mode, open);

  const handleComposerAction = mode === 'notes' ? handleAppendToNote : handleSubmit;
  const composerButtonLabel = mode === 'notes' ? 'Add to note' : 'Speak';
  const composerButtonDisabled = !text.trim() || (mode === 'talk' && status !== 'idle');
  const ComposerIcon = mode === 'notes' ? FileText : Volume2;

  const composerConsole = (
    <div className="flex shrink-0 flex-col gap-3 rounded-lg bg-muted/40 p-3">
      <Suggestions
        chatId={spaceId}
        historyText={mode === 'notes' ? (selectedNote?.content ?? '') : undefined}
        onPin={handlePin}
        onSubmit={handleComposerAction}
      />

      <div className="flex flex-col gap-2">
        <Autocomplete />
        <div className="rounded-2xl border-2 border-input bg-background p-3 transition-colors focus-within:border-ring">
          <textarea
            ref={inputRef}
            autoFocus
            rows={1}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder={
              mode === 'notes' ? 'Type text to add to this note...' : 'Type a message...'
            }
            className="max-h-60 w-full resize-none overflow-y-auto bg-transparent text-2xl font-medium leading-snug text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <RailButton label="Undo" onClick={undo} disabled={undoStack.length === 0}>
                <Undo2 className="size-5" />
              </RailButton>
              <RailButton label="Delete last word" onClick={deleteLastWord} disabled={!text}>
                <Delete className="size-5" />
              </RailButton>
              <RailButton label="Clear" onClick={clearText} disabled={!text}>
                <Trash2 className="size-5" />
              </RailButton>
              {mode === 'talk' && <AudioOutputDeviceSelector />}
            </div>
            <button
              type="button"
              onClick={() => handleComposerAction(text)}
              disabled={composerButtonDisabled}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[opacity,transform] hover:enabled:scale-[1.02] active:enabled:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <ComposerIcon className="size-4" aria-hidden />
              {composerButtonLabel}
            </button>
          </div>
        </div>
      </div>

      <SpaceSwitch currentSpaceId={spaceId} />
    </div>
  );

  // Compose column — shared between split and full-width layouts
  const composeColumn = (
    <div className="flex h-full w-full flex-col gap-4">
      {/* Transcript — your spoken messages, anchored to the bottom */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-y-auto py-4">
        {spoken.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MessagesSquare className="size-6" aria-hidden />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              Build a sentence below, then tap Speak. What you say appears here.
            </p>
          </div>
        ) : (
          spoken.map((message, i) => <TranscriptBubble key={message.id || i} message={message} />)
        )}

        {/* Now-speaking viewer — borrowed from the old /talk page: live word
            highlighting for the currently-playing message; tap a word to seek. */}
        {current?.alignment && (
          <TextViewer alignment={current.alignment}>
            <TextViewerWords className="wrap-break-word text-foreground" />
          </TextViewer>
        )}
      </div>

      {composerConsole}
    </div>
  );

  const notesColumn = (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <SpaceNotes
        spaceId={spaceId}
        className="min-h-0 flex-1"
        selectedId={selectedNoteId}
        onSelectedIdChange={handleSelectedNoteIdChange}
      />
      <div className="md:hidden">
        <SpaceNotesPanel
          spaceId={spaceId}
          selectedId={selectedNoteId}
          onSelectedIdChange={handleSelectedNoteIdChange}
        />
      </div>
      {composerConsole}
    </div>
  );

  return (
    <>
      <SidebarLayout.Header>
        {/* Mobile: branded top bar with logo, space title, and actions */}
        <MobileNav title={`${space?.title ?? 'Space'} - ${mode === 'notes' ? 'Notes' : 'Talk'}`}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="View history"
            className="size-7"
            onClick={() => openTab('history')}
          >
            <HistoryIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Speech provider"
            className="size-7"
            onClick={() => openTab('provider')}
          >
            <Plug className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voice"
            className="size-7"
            onClick={() => openTab('voice')}
          >
            <MicIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Speech settings"
            className="size-7"
            onClick={() => openTab('speech')}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Saved phrases"
            className="size-7"
            onClick={() => openTab('phrases')}
          >
            <MessageSquareQuote className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Context"
            className="size-7"
            onClick={() => openTab('context')}
          >
            <FileText className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleOpenDisplay} aria-label="Open display">
            <TvIcon className="size-4" />
          </Button>
        </MobileNav>

        {/* Desktop: inline sidebar trigger + title + actions */}
        <div className="hidden w-full items-center gap-2 md:flex">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          {space && <EditableSpaceTitle spaceId={space.id} title={space.title} />}
          <ModeSwitch mode={mode} onModeChange={handleModeChange} className="ml-auto w-64" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle panel"
            aria-pressed={open}
            onClick={() => (open ? close() : openOverview())}
          >
            <PanelRight className="size-4" />
          </Button>
        </div>
      </SidebarLayout.Header>

      <SidebarLayout.Content>
        <div className="flex h-full min-h-0 w-full flex-col gap-3">
          <ModeSwitch mode={mode} onModeChange={handleModeChange} className="md:hidden" />
          {mode === 'notes' ? notesColumn : composeColumn}
        </div>
      </SidebarLayout.Content>

      {/* Panel — detached from the inset (the main container) and rendered as
          its own card in the sidebar flex row. Full-screen overlay on mobile, a
          resizable side card on desktop. */}
      {mode === 'notes' && showSidePanel && (
        <SidebarLayout.RightPanel>
          <div className="fixed inset-x-2 top-2 bottom-2 z-40 hidden shrink-0 grow-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm md:static md:inset-auto md:my-2 md:mr-2 md:flex md:w-80">
            <SpaceNotesPanel
              spaceId={spaceId}
              className="h-full"
              selectedId={selectedNoteId}
              onSelectedIdChange={handleSelectedNoteIdChange}
            />
          </div>
        </SidebarLayout.RightPanel>
      )}

      {mode === 'talk' && showSidePanel && (
        <SidebarLayout.RightPanel>
          <div
            style={{ flexBasis: `${widthPct}%` }}
            className="fixed inset-x-2 top-2 bottom-2 z-40 flex shrink-0 grow-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm md:static md:inset-auto md:my-2 md:mr-2 md:min-w-72 md:max-w-160"
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panel"
              onPointerDown={onPanelResize}
              className="absolute inset-y-0 left-0 z-10 hidden w-1.5 cursor-col-resize hover:bg-border md:block"
            />
            <ChatRightPanel
              chatId={spaceId}
              chatTitle={space?.title}
              onOpenDisplay={handleOpenDisplay}
            />
          </div>
        </SidebarLayout.RightPanel>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page root — provides ChatPanelProvider, then delegates to inner component
// ---------------------------------------------------------------------------

function SpacePageRoot() {
  const { spaceSlug } = Route.useParams();
  const spaceId = idFromSlug(spaceSlug);

  return (
    <ChatPanelProvider>
      <SpacePageInner spaceId={spaceId} mode="talk" routeSpaceSlug={spaceSlug} />
    </ChatPanelProvider>
  );
}
