import { useEffect, useRef, useState } from "react";

import {
  MessageSquareQuote,
  PanelRightClose,
  Volume2,
  type LucideIcon,
} from "lucide-react";

import { useIsMobile } from "@september/ui";
import { Button } from "@september/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@september/ui/components/sheet";

import { Phrases } from "@september/app-ui/blocks/phrase-panel";
import { SpeechSettings } from "@september/app-ui/blocks/speech-settings";
import { currentPanel, rememberPanel } from "@platform/services/os";
import { usePanel } from "@september/app-ui/blocks/chrome";
import { HeaderActions } from "@september/app-ui/blocks/screen";
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
 * app uses. On a phone, the two keys sit at the end of the screen header, and
 * a key opens its tab as a sheet from the bottom, so the screen keeps its
 * full width and height.
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
  const phone = useIsMobile();
  // A phone opens the sheet only on a press, never from the remembered state,
  // so a screen does not start under a sheet.
  const [pressed, setPressed] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  // The More menu of the panel asks for a tab here in the wide tier.
  const request = usePanel()?.rail ?? null;

  const show = (next: typeof state) => {
    setState(next);
    void rememberPanel(next);
  };

  useEffect(() => {
    if (request) show({ open: true, tab: request.tab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // Escape closes the card and leaves the rail, the same as the web app.
  useEffect(() => {
    if (!state.open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // The key is used, so the panel does not hide on the same press.
      event.preventDefault();
      show({ ...state, open: false });
    };
    // The capture phase runs before the Escape of the panel.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const open = PANEL_TABS.find((tab) => tab.key === state.tab)!;
  const OpenIcon = ICONS[open.key];
  const body =
    state.tab === "voice" ? (
      <SpeechSettings />
    ) : (
      <Phrases
        spaceId={spaceId}
        onInsert={(text) => {
          onInsert(text);
          // On a phone the sheet covers the composer, so it closes on a press.
          if (phone) show({ ...state, open: false });
        }}
      />
    );

  if (phone) {
    const sheetOpen = pressed && state.open;
    return (
      <>
        <HeaderActions>
          {PANEL_TABS.map((tab) => {
            const Icon = ICONS[tab.key];
            const showing = sheetOpen && state.tab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={showing}
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setPressed(true);
                  show(pressTab({ ...state, open: sheetOpen }, tab.key));
                }}
                className={`focus-attention text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 text-xs font-medium transition-colors ${
                  showing ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {tab.title}
              </button>
            );
          })}
        </HeaderActions>
        <Sheet
          open={sheetOpen}
          onOpenChange={(next) => {
            if (!next) show({ ...state, open: false });
          }}
        >
          <SheetContent
            side="bottom"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              // The focus goes back to the key that opened the sheet.
              event.preventDefault();
              opener.current?.focus();
            }}
            className="max-h-[85svh] gap-0 rounded-t-2xl"
          >
            <SheetHeader className="min-h-14 flex-row items-center gap-2 border-b py-2 pr-16">
              <OpenIcon className="text-muted-foreground size-4" aria-hidden />
              <SheetTitle className="text-sm">{open.title}</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {state.open ? (
        <aside
          aria-label={`${open.title} panel`}
          className="bg-background my-2 flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm"
        >
          <header className="flex min-h-14 shrink-0 items-center gap-2 border-b px-3">
            <OpenIcon className="text-muted-foreground size-4" aria-hidden />
            <span className="text-sm font-semibold">{open.title}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Collapse panel"
              className="hover:text-foreground ml-auto shrink-0"
              onClick={() => show({ ...state, open: false })}
            >
              <PanelRightClose aria-hidden />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
        </aside>
      ) : null}

      <nav
        data-scan-group
        aria-label="Panel rail"
        className="bg-background my-2 mr-2 flex w-20 shrink-0 flex-col items-stretch gap-1.5 rounded-xl border p-1.5 shadow-sm"
      >
        {PANEL_TABS.map((tab) => {
          const Icon = ICONS[tab.key];
          const showing = state.open && state.tab === tab.key;

          return (
            // The key shows its label, so the rail does not ask the user to
            // know the icons. The label is the name.
            <button
              key={tab.key}
              type="button"
              aria-pressed={showing}
              onClick={() => show(pressTab(state, tab.key))}
              className={`focus-attention text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition-colors ${
                showing ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {tab.title}
            </button>
          );
        })}
      </nav>
    </>
  );
}
