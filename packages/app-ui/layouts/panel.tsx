import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { MessagesSquare, Plus } from "lucide-react";

import { Button } from "@september/ui/components/button";

import { APP_NAV } from "@platform/rules/app-nav";

import { useSpaces } from "@platform/services/data";
import { stopSpeaking, useSpeaking } from "@platform/services/speech";
import {
  ChromeContext,
  PanelContext,
  tierFor,
  type ComposerHandle,
  type RailRequest,
} from "@september/app-ui/blocks/chrome";
import {
  PanelHeader,
  PanelSheets,
  type PanelSheet,
} from "@september/app-ui/blocks/panel-header";
import { RightPanelSlot } from "@september/app-ui/blocks/screen";
import { spaceParams, useNewSpace } from "@september/app-ui/blocks/space";
import { escapeStep, moodForKey } from "@september/core/rules/panel";
import { spaceFromSlug, type SpaceMode } from "@september/core/rules/spaces";

/**
 * The space and the mode that a space path names: Talk, Notes, a note, or
 * Agent. Any other path is a page.
 */
function spacePath(path: string): { slug: string; mode: SpaceMode } | null {
  const found = /^\/spaces\/([^/]+)\/(talk|agent|notes(?:\/[^/]+)?)$/.exec(path);
  if (!found) return null;
  const mode = found[2].split("/")[0] as SpaceMode;
  return { slug: decodeURIComponent(found[1]), mode };
}

/** The title of the app page that a path belongs to, such as Settings for a section. */
function pageTitle(path: string): string {
  return (
    APP_NAV.find((item) => path === item.path || path.startsWith(`${item.path}/`))
      ?.title ?? ""
  );
}

const MODE_CODES: Record<string, SpaceMode> = {
  Digit1: "talk",
  Digit2: "notes",
  Digit3: "agent",
};

/**
 * The floating panel of the desktop app: the panel header over the Talk,
 * Notes, or Agent screen of one space, or over a page such as Settings.
 *
 * The screens are the same as in the shell. The chrome context tells them to
 * leave out their own header and dock. The right rail has a place only in
 * the wide tier; in the other tiers Phrases and Voice open as sheets.
 */
export function PanelShell({
  onHide,
}: {
  /** Hides the panel window. Escape calls it when there is nothing to stop or close. */
  onHide: () => void;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data: spaces } = useSpaces();
  const speaking = useSpeaking();

  const at = spacePath(pathname);
  const space = at ? spaceFromSlug(at.slug, spaces ?? []) : undefined;
  const mode = at?.mode ?? "talk";

  // Back on a page goes to the space path that was open last.
  const [lastSpacePath, setLastSpacePath] = useState<string | null>(null);
  if (at && pathname !== lastSpacePath) setLastSpacePath(pathname);
  const page = at
    ? null
    : {
        title: pageTitle(pathname),
        onBack: () => void navigate({ to: lastSpacePath ?? "/spaces" }),
      };

  const composer = useRef<ComposerHandle | null>(null);
  const [sheet, setSheet] = useState<PanelSheet | null>(null);
  const [outputOpen, setOutputOpen] = useState(false);
  const [rail, setRail] = useState<RailRequest | null>(null);

  // The tier follows the width of the whole panel, not of the screen body,
  // so the rail does not take the wide tier away by its own width.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!frame) return;
    setWidth(frame.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const watcher = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    watcher.observe(frame);
    return () => watcher.disconnect();
  }, [frame]);
  const tier = tierFor(width);

  const [slot, setSlot] = useState<HTMLElement | null>(null);

  const openTab = (tab: "phrases" | "voice") => {
    if (tier === "wide") setRail({ tab, at: Date.now() });
    else setSheet(tab);
  };

  // The keys of the panel. The handler reads the newest state, so it is
  // added again after each render.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // A menu or a dialog that closed on this key has used it.
        if (event.defaultPrevented) return;
        const step = escapeStep({
          speaking: speaking !== null,
          sheetOpen: sheet !== null,
          draft: composer.current?.draft ?? "",
        });
        if (step === "none") return;
        event.preventDefault();
        if (step === "stop") stopSpeaking();
        else if (step === "close") setSheet(null);
        else onHide();
        return;
      }

      if (event.ctrlKey && !event.metaKey && !event.altKey) {
        const mood = moodForKey(event.key);
        const onMood = composer.current?.onMood;
        if (tier !== "compact" || mood === undefined || !onMood) return;
        event.preventDefault();
        onMood(mood);
        return;
      }

      if (!event.metaKey || event.ctrlKey) return;

      if (event.altKey) {
        // Option changes the character of a digit, so the code names the key.
        const next = MODE_CODES[event.code];
        if (!next || !space) return;
        event.preventDefault();
        void navigate(spaceParams(space, next));
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "k" && !event.shiftKey) setSheet("spaces");
      else if (key === "p" && !event.shiftKey && space) openTab("phrases");
      else if (key === "v" && event.shiftKey && space) openTab("voice");
      else if (key === "o" && event.shiftKey && composer.current?.speaks)
        setOutputOpen(true);
      else if (key === "backspace" && composer.current) composer.current.clear();
      else if (key === "?") void navigate({ to: "/help" });
      else return;
      event.preventDefault();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const empty = spaces !== undefined && spaces.length === 0;

  return (
    <ChromeContext.Provider value="panel">
      <PanelContext.Provider
        value={{ tier, composer, outputOpen, setOutputOpen, rail }}
      >
        <RightPanelSlot.Provider value={tier === "wide" ? slot : null}>
          <div
            ref={setFrame}
            className="bg-muted text-foreground flex h-svh flex-col overflow-hidden"
          >
            <PanelHeader
              space={space}
              mode={mode}
              onSheet={setSheet}
              onPanelTab={openTab}
              page={page}
            />
            <div className="flex min-h-0 flex-1">
              <main className="bg-background flex min-h-0 min-w-0 flex-1 flex-col">
                {empty && at ? <PanelEmpty /> : <Outlet />}
              </main>
              {/* `display: contents` makes the rail itself the flex child. */}
              {tier === "wide" ? (
                <div ref={setSlot} style={{ display: "contents" }} />
              ) : null}
            </div>
            <PanelSheets
              sheet={sheet}
              onSheet={setSheet}
              space={space}
              spaces={spaces ?? []}
              mode={mode}
            />
          </div>
        </RightPanelSlot.Provider>
      </PanelContext.Provider>
    </ChromeContext.Provider>
  );
}

/** The panel with no space to show yet. */
function PanelEmpty() {
  const newSpace = useNewSpace();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <MessagesSquare className="text-muted-foreground size-8" aria-hidden />
      <div className="space-y-1">
        <h1 className="text-title font-semibold">No spaces yet</h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          A space keeps the words you use with one person or in one place.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        onClick={newSpace.create}
        aria-disabled={newSpace.pending}
        className="h-11 rounded-full aria-disabled:opacity-50"
      >
        <Plus aria-hidden />
        New space
      </Button>
      {newSpace.error ? (
        <p role="alert" className="text-destructive text-sm">
          {newSpace.error.message}
        </p>
      ) : null}
    </div>
  );
}
