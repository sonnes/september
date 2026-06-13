import { useCallback, useEffect, useRef, useState } from 'react';

import { createFileRoute } from '@tanstack/react-router';

import { TvIcon } from '@heroicons/react/24/outline';
import {
  Delete,
  FileText,
  HistoryIcon,
  MessagesSquare,
  MicIcon,
  Trash2,
  Undo2,
  Volume2,
} from 'lucide-react';

import { useAccount } from '@/packages/account';
import { useAudioPlayer } from '@/packages/audio';
import {
  EditableSpaceTitle,
  updateSpace,
  useSpaces,
  useCreateAudioMessage,
  useGenerateSpaceContext,
  useMessages,
} from '@/packages/spaces';
import { Autocomplete, useEditorContext } from '@/packages/editor';
import { DisplayMessage } from '@/packages/shared';
import { Suggestions, parseMdPhrases } from '@/packages/suggestions';
import { Button } from '@/packages/ui/components/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/packages/ui/components/resizable';
import { Separator } from '@/packages/ui/components/separator';
import { SidebarTrigger } from '@/packages/ui/components/sidebar';

import MobileNav from '@/components/nav/mobile';
import SidebarLayout from '@/components/sidebar/layout';
import { ChatRightPanel } from '@/components/chat/right-panel';
import { ChatPanelProvider, useChatPanel } from '@/components/chat/use-chat-panel';

import { pageTitle } from '@/lib/seo';

export const Route = createFileRoute('/_app/spaces/$id/')({
  head: () => ({
    meta: [{ title: pageTitle('Spaces') }],
  }),
  component: SpacePageRoot,
});

// ---------------------------------------------------------------------------
// Left-rail icon button (undo / delete-word / clear) — mock composer rail
// ---------------------------------------------------------------------------

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
// Inner component — reads useChatPanel() which requires the Provider above it
// ---------------------------------------------------------------------------

function SpacePageInner({ spaceId }: { spaceId: string }) {
  const { user } = useAccount();
  const { enqueue } = useAudioPlayer();
  const { spaces } = useSpaces({ userId: user?.id });
  const { messages } = useMessages({ spaceId: spaceId || '' });

  const space = spaces.find(s => s.id === spaceId);

  const { status, createAudioMessage } = useCreateAudioMessage();
  const { generateContext } = useGenerateSpaceContext();
  const { text, setText, trackKeystroke, getAndResetStats } = useEditorContext();
  const popupRef = useRef<Window | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { open, widthPct, setWidthPct, openTab } = useChatPanel();

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

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!spaceId || !user || !text.trim()) return;

      const editorStats = getAndResetStats();

      const { message, audio } = await createAudioMessage({
        space_id: spaceId,
        text: text.trim(),
        type: 'user',
        user_id: user.id,
        editorStats,
      });

      const isDisplayOpen = popupRef.current && !popupRef.current.closed;

      if (audio && !isDisplayOpen) {
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
        generateContext({ messageText: text.trim() })
          .then(result => result && updateSpace(spaceId, { title: result.title, context: result.context }))
          .catch(() => {});
      }
    },
    [spaceId, user, createAudioMessage, enqueue, setText, getAndResetStats, messages, generateContext]
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(text);
        return;
      }
      trackKeystroke();
    },
    [text, handleSubmit, trackKeystroke]
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

  // Pinning: append phrase to space context as a bullet, dedup with parseMdPhrases
  const handlePin = useCallback(
    (phrase: string) => {
      const currentContext = space?.context ?? '';
      const existing = parseMdPhrases(currentContext);
      const isDuplicate = existing.some(p => p.toLowerCase() === phrase.toLowerCase());
      if (isDuplicate) return;
      const next = currentContext.trimEnd() + '\n- ' + phrase;
      updateSpace(spaceId, { context: next }).catch(err => {
        console.error('Failed to pin phrase:', err);
      });
    },
    [space?.context, spaceId]
  );

  // Recently spoken (user) messages — faint log filling the space above the
  // composer, mirroring the mock's spoken-history area.
  const spoken = (messages ?? []).filter(m => m.type === 'user').map(m => m.text).slice(-6);

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
          spoken.map((line, i) => (
            <div
              key={i}
              className="flex animate-in fade-in slide-in-from-bottom-1 justify-end motion-reduce:animate-none"
            >
              <div className="flex max-w-[85%] items-start gap-2 rounded-lg rounded-br-sm bg-accent px-4 py-2.5 text-accent-foreground">
                <Volume2 className="mt-1 size-4 shrink-0 opacity-60" aria-hidden />
                <p className="text-base leading-snug">{line}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Console — suggestions + composer grouped on a calm surface so the
          active zone reads as one grounded unit instead of floating on white. */}
      <div className="flex shrink-0 flex-col gap-3 rounded-lg bg-muted/40 p-3">
        {/* Suggestion surface: stripes + word autocomplete + scan toggle */}
        <Suggestions chatId={spaceId} wordSuggestions={<Autocomplete />} onPin={handlePin} />

        {/* Composer: left rail + big textarea + Speak */}
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col justify-end gap-2">
            <RailButton label="Undo" onClick={undo} disabled={undoStack.length === 0}>
              <Undo2 className="size-5" />
            </RailButton>
            <RailButton label="Delete last word" onClick={deleteLastWord} disabled={!text}>
              <Delete className="size-5" />
            </RailButton>
            <RailButton label="Clear" onClick={clearText} disabled={!text}>
              <Trash2 className="size-5" />
            </RailButton>
          </div>
          <textarea
            ref={inputRef}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Type a message…"
            className="min-h-36 flex-1 resize-none rounded-lg border bg-card p-5 text-3xl leading-snug outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring md:text-4xl"
          />
          <button
            type="button"
            onClick={() => handleSubmit(text)}
            disabled={!text.trim() || status !== 'idle'}
            className="flex flex-col items-center justify-center gap-2 rounded-lg bg-primary px-6 text-lg font-semibold text-primary-foreground transition-[opacity,transform] hover:enabled:scale-[1.02] active:enabled:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <Volume2 className="size-6" aria-hidden />
            Speak
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SidebarLayout.Header>
        {/* Mobile: branded top bar with logo, space title, and actions */}
        <MobileNav title={space?.title ?? 'Space'}>
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
            aria-label="Voice settings"
            className="size-7"
            onClick={() => openTab('voice')}
          >
            <MicIcon className="size-4" />
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
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleOpenDisplay}>
              <TvIcon className="size-4" />
              <span>Display</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="View history"
              onClick={() => openTab('history')}
            >
              <HistoryIcon className="size-4" />
              <span>History</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Voice settings"
              onClick={() => openTab('voice')}
            >
              <MicIcon className="size-4" />
              <span>Voice</span>
            </Button>
            <Button variant="ghost" size="sm" aria-label="Context" onClick={() => openTab('context')}>
              <FileText className="size-4" />
              <span>Context</span>
            </Button>
          </div>
        </div>
      </SidebarLayout.Header>

      <SidebarLayout.Content>
        {open ? (
          <ResizablePanelGroup
            orientation="horizontal"
            onLayoutChanged={(layout: Record<string, number>) => {
              const next = layout['chat-right-panel'];
              if (typeof next === 'number' && Number.isFinite(next)) {
                setWidthPct(next);
              }
            }}
            className="h-full"
          >
            <ResizablePanel id="chat-left-column" defaultSize={`${100 - widthPct}%`} minSize="30%">
              {composeColumn}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="chat-right-panel"
              defaultSize={`${widthPct}%`}
              minSize="20%"
              maxSize="70%"
            >
              <ChatRightPanel
                chatId={spaceId}
                chatTitle={space?.title}
                onOpenDisplay={handleOpenDisplay}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          composeColumn
        )}
      </SidebarLayout.Content>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page root — provides ChatPanelProvider, then delegates to inner component
// ---------------------------------------------------------------------------

function SpacePageRoot() {
  const { id: spaceId } = Route.useParams();

  return (
    <ChatPanelProvider>
      <SpacePageInner spaceId={spaceId} />
    </ChatPanelProvider>
  );
}
