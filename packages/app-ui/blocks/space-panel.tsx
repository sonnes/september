import { useEffect, useState } from "react";

import {
  MessageSquareQuote,
  PanelRightClose,
  Volume2,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@september/ui/components/button";

import { Phrases } from "@september/app-ui/blocks/phrase-panel";
import { SpeechSettings } from "@september/app-ui/blocks/speech-settings";
import { currentPanel, rememberPanel } from "@platform/services/os";
import { PANEL_TABS, pressTab, type PanelTab } from "@september/core/rules/panel";

const ICONS: Record<PanelTab, LucideIcon> = {
  phrases: MessageSquareQuote,
  voice: Volume2,
};

/**
 * The right rail of a space, and the card it opens.
 *
 * The rail is always there, so the phrases and the voice are one press away in
 * every mode. The card beside it holds the open tab. This is the shape the web
 * app uses.
 */
export function PanelRail({
  spaceId,
  onInsert,
}: {
  spaceId: string;
  /** Puts a phrase in the composer of the screen that holds the rail. */
  onInsert: (text: string) => void;
}) {
  const [state, setState] = useState(currentPanel);

  const show = (next: typeof state) => {
    setState(next);
    void rememberPanel(next);
  };

  // Escape closes the card and leaves the rail, the same as the web app.
  useEffect(() => {
    if (!state.open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") show({ ...state, open: false });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const open = PANEL_TABS.find((tab) => tab.key === state.tab)!;
  const OpenIcon = ICONS[open.key];

  return (
    <>
      {state.open ? (
        <aside
          aria-label={`${open.title} panel`}
          className="bg-background my-2 flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm"
        >
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
            <OpenIcon className="text-muted-foreground size-4" aria-hidden />
            <span className="text-sm font-semibold">{open.title}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Collapse panel"
              className="text-muted-foreground hover:text-foreground ml-auto shrink-0"
              onClick={() => show({ ...state, open: false })}
            >
              <PanelRightClose aria-hidden />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {state.tab === "voice" ? (
              <SpeechSettings />
            ) : (
              <Phrases spaceId={spaceId} onInsert={onInsert} />
            )}
          </div>
        </aside>
      ) : null}

      <nav
        aria-label="Panel rail"
        className="bg-background my-2 mr-2 flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl border py-2 shadow-sm"
      >
        {PANEL_TABS.map((tab) => {
          const Icon = ICONS[tab.key];
          const showing = state.open && state.tab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              aria-label={tab.title}
              title={tab.title}
              aria-pressed={showing}
              onClick={() => show(pressTab(state, tab.key))}
              className={`text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-10 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                showing ? "bg-muted text-foreground" : ""
              }`}
            >
              <Icon className="size-5" aria-hidden />
            </button>
          );
        })}
      </nav>
    </>
  );
}
