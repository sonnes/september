import { useId, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronLeft,
  Ellipsis,
  LayoutList,
  Plus,
  Search,
} from "lucide-react";

import { cn } from "@september/ui";
import { Input } from "@september/ui/components/input";
import { Label } from "@september/ui/components/label";
import { Separator } from "@september/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@september/ui/components/sheet";

import { APP_NAV } from "@platform/rules/app-nav";
import type { Space } from "@platform/services/data";
import { Phrases } from "@september/app-ui/blocks/phrase-panel";
import { SpeechSettings } from "@september/app-ui/blocks/speech-settings";
import { usePanel } from "@september/app-ui/blocks/chrome";
import { ScanPauseKey } from "@september/app-ui/blocks/access";
import {
  SpaceTitle,
  agentEnabled,
  spaceParams,
  useNewSpace,
} from "@september/app-ui/blocks/space";
import { DeleteSpaceDialog } from "@september/app-ui/pages/spaces";
import {
  filterSpaces,
  timeAgo,
  type SpaceMode,
} from "@september/core/rules/spaces";

/** The sheets and dialogs that open over the panel. */
export type PanelSheet =
  | "spaces"
  | "more"
  | "phrases"
  | "voice"
  | "rename"
  | "delete";

const MODES: { key: SpaceMode; label: string }[] = [
  { key: "talk", label: "Talk" },
  { key: "notes", label: "Notes" },
  { key: "agent", label: "Agent" },
];

const ring = "focus-attention";

/** A page in the panel that is not a space: its title, and the way back. */
export interface PanelPage {
  title: string;
  /** Goes to the space path that was open last, or to the list of spaces. */
  onBack: () => void;
}

/**
 * The header of the floating panel. It is indigo, so the panel reads as
 * September beside any app.
 *
 * In a space, it holds the space button, the Talk, Notes, and Agent switch,
 * and the More key. On a page, such as Settings, it holds Back, the title of
 * the page, and the More key. More opens the More sheet.
 */
export function PanelHeader({
  space,
  mode,
  page,
  onSheet,
}: {
  /** The space on the screen, or nothing when the panel shows no space. */
  space: Space | undefined;
  mode: SpaceMode;
  /** The page on the screen, or null on a space path. */
  page: PanelPage | null;
  onSheet: (sheet: PanelSheet) => void;
}) {
  const navigate = useNavigate();
  const shown = MODES.filter(({ key }) => key !== "agent" || agentEnabled());

  return (
    // The header is the title bar of the desktop window: a press on its free
    // space drags the window, and the left inset keeps clear of the window
    // buttons, which macOS draws over it.
    // One scan group. The scan band on the indigo is a ring alone.
    <header
      data-tauri-drag-region
      data-scan-group
      data-housing
      className="bg-sidebar text-sidebar-foreground flex h-16 shrink-0 items-center gap-2 pr-2.5 pl-21"
    >
      {page ? (
        <>
          <button
            type="button"
            onClick={page.onBack}
            className={cn(
              "bg-sidebar-primary flex h-11 shrink-0 items-center gap-1 rounded-control pr-3 pl-2 text-sm font-semibold",
              ring,
            )}
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            Back
          </button>
          <span
            data-tauri-drag-region
            className="min-w-0 flex-1 truncate text-center text-base font-semibold"
          >
            {page.title}
          </span>
        </>
      ) : (
        <>
          <button
            type="button"
            aria-label={
              space ? `Switch space, now ${space.title}` : "Switch space"
            }
            aria-haspopup="dialog"
            onClick={() => onSheet("spaces")}
            className={cn(
              "bg-sidebar-primary flex h-11 max-w-56 min-w-0 items-center gap-2 rounded-control pr-3 pl-2.5 text-sm font-semibold whitespace-nowrap",
              ring,
            )}
          >
            {space ? <Initial title={space.title} /> : null}
            <span className="truncate">{space?.title ?? "Spaces"}</span>
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          </button>

          {space ? (
            // Each mode is another page of the space, so the switch is
            // navigation, and the open mode is the current page.
            <nav
              aria-label="Space mode"
              className="bg-sidebar-primary flex h-12 min-w-40 flex-1 rounded-control"
            >
              {shown.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-current={key === mode ? "page" : undefined}
                  onClick={() => navigate(spaceParams(space, key))}
                  // The whole 48-point height takes the press. The pill inside
                  // is inset, as the mock draws it.
                  className={cn(
                    "group h-12 min-w-0 flex-1 rounded-control p-1 text-sm font-medium",
                    ring,
                  )}
                >
                  <span
                    className={cn(
                      "grid h-full place-items-center rounded-[9px] px-2 transition-colors",
                      key === mode
                        ? "bg-sidebar-foreground text-sidebar-primary font-semibold shadow-sm"
                        : "group-hover:bg-sidebar-border/40",
                    )}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </nav>
          ) : (
            <span className="flex-1" />
          )}
        </>
      )}

      <ScanPauseKey />
      <button
        type="button"
        aria-label="More"
        aria-haspopup="dialog"
        onClick={() => onSheet("more")}
        className={cn(
          "hover:bg-sidebar-primary grid size-12 shrink-0 place-items-center rounded-control transition-colors",
          ring,
        )}
      >
        <Ellipsis className="size-5" aria-hidden />
      </button>
    </header>
  );
}

/**
 * The rows of the More sheet: the space, the composer, and the pages of the
 * app. The sheet reads the composer as it opens, so it lists only what works
 * now. Each row is a 48-point key.
 */
function MoreRows({
  space,
  onSheet,
  onPanelTab,
}: {
  space: Space | undefined;
  onSheet: (sheet: PanelSheet | null) => void;
  onPanelTab: (tab: "phrases" | "voice") => void;
}) {
  const navigate = useNavigate();
  const panel = usePanel();
  const composer = panel?.composer.current;
  const close = () => onSheet(null);

  return (
    <div className="flex flex-col gap-1">
      {space ? (
        <>
          <MoreRow
            keys="⌘P"
            shortcut="Meta+P"
            onSelect={() => {
              close();
              onPanelTab("phrases");
            }}
          >
            Phrases
          </MoreRow>
          <MoreRow
            keys="⌘⇧V"
            shortcut="Meta+Shift+V"
            onSelect={() => {
              close();
              onPanelTab("voice");
            }}
          >
            Voice controls
          </MoreRow>
        </>
      ) : null}
      {composer?.speaks ? (
        <MoreRow
          keys="⌘⇧O"
          shortcut="Meta+Shift+O"
          onSelect={() => {
            close();
            // The output menu opens once the sheet has closed and given the
            // focus back.
            setTimeout(() => panel?.setOutputOpen(true), 0);
          }}
        >
          Sound output
        </MoreRow>
      ) : null}
      {composer?.clear && panel?.tier === "compact" ? (
        <MoreRow
          keys="⌘⌫"
          shortcut="Meta+Backspace"
          disabled={!composer.draft}
          onSelect={() => {
            composer.clear?.();
            close();
          }}
        >
          Clear the draft
        </MoreRow>
      ) : null}
      {space ? (
        <>
          <Separator className="my-1" />
          <MoreRow onSelect={() => onSheet("rename")}>Rename space</MoreRow>
          <MoreRow destructive onSelect={() => onSheet("delete")}>
            Delete space
          </MoreRow>
        </>
      ) : null}
      <Separator className="my-1" />
      {APP_NAV.map((item) => (
        <MoreRow
          key={item.path}
          keys={item.path === "/help" ? "⌘?" : undefined}
          shortcut={item.path === "/help" ? "Meta+?" : undefined}
          onSelect={() => {
            close();
            void navigate({ to: item.path });
          }}
        >
          {item.title}
        </MoreRow>
      ))}
    </div>
  );
}

function MoreRow({
  keys,
  shortcut,
  destructive,
  disabled,
  onSelect,
  children,
}: {
  /** The keys as the row shows them, such as ⌘P. */
  keys?: string;
  /** The same keys for `aria-keyshortcuts`, such as Meta+P. */
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-keyshortcuts={shortcut}
      onClick={onSelect}
      className={cn(
        "focus-attention-inset key-disabled hover:bg-muted flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-base font-medium transition-colors",
        destructive && "text-destructive",
      )}
    >
      <span className="flex-1">{children}</span>
      {keys ? (
        <kbd aria-hidden className="text-muted-foreground font-sans text-sm">
          {keys}
        </kbd>
      ) : null}
    </button>
  );
}

/** The first letter of a space, as its mark. */
function Initial({ title, list }: { title?: string; list?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-bold",
        list
          ? "bg-accent text-accent-foreground size-8 rounded-[10px] text-sm"
          : "bg-sidebar-foreground text-sidebar-primary size-6 rounded-lg text-xs",
      )}
    >
      {(title ?? "").trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/**
 * The sheets of the panel. Each opens below the header, and Escape closes it.
 */
export function PanelSheets({
  sheet,
  onSheet,
  onPanelTab,
  space,
  spaces,
  mode,
}: {
  sheet: PanelSheet | null;
  onSheet: (sheet: PanelSheet | null) => void;
  /** Opens Phrases or Voice: a sheet, or the right rail in the wide tier. */
  onPanelTab: (tab: "phrases" | "voice") => void;
  space: Space | undefined;
  spaces: Space[];
  mode: SpaceMode;
}) {
  const navigate = useNavigate();
  const panel = usePanel();
  const close = () => onSheet(null);

  return (
    <>
      <PanelSheet open={sheet === "spaces"} onClose={close} title="Spaces">
        <SpaceSwitcher
          spaces={spaces}
          current={space}
          onOpen={(chosen) => {
            close();
            void navigate(spaceParams(chosen, mode));
          }}
          onCreated={close}
          onAllSpaces={() => {
            close();
            void navigate({ to: "/spaces" });
          }}
        />
      </PanelSheet>

      <PanelSheet open={sheet === "more"} onClose={close} title="More">
        <MoreRows space={space} onSheet={onSheet} onPanelTab={onPanelTab} />
      </PanelSheet>

      {space ? (
        <>
          <PanelSheet
            open={sheet === "phrases"}
            onClose={close}
            title={`Phrases of ${space.title}`}
          >
            <Phrases
              spaceId={space.id}
              onInsert={(text) => panel?.composer.current?.insert(text)}
            />
          </PanelSheet>

          <PanelSheet
            open={sheet === "voice"}
            onClose={close}
            title="Voice controls"
          >
            <SpeechSettings />
          </PanelSheet>

          <PanelSheet
            open={sheet === "rename"}
            onClose={close}
            title="Rename space"
          >
            <SpaceTitle space={space} mode={mode} />
          </PanelSheet>

          <DeleteSpaceDialog
            space={sheet === "delete" ? space : null}
            onClose={close}
            onDeleted={() => void navigate({ to: "/" })}
          />
        </>
      ) : null}
    </>
  );
}

function PanelSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="top"
        aria-describedby={undefined}
        // Below the 64-point header, inset as a card.
        className="rounded-surface inset-x-2 top-[4.5rem] max-h-[calc(100svh-5rem)] gap-3 overflow-y-auto border p-4"
      >
        <SheetTitle className="text-title flex min-h-10 items-center pr-14">
          {title}
        </SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/**
 * The spaces, the most recent first, with a search field, All spaces, and New
 * space. While it is open, the digits 1 to 9 open the space in that row.
 */
function SpaceSwitcher({
  spaces,
  current,
  onOpen,
  onCreated,
  onAllSpaces,
}: {
  spaces: Space[];
  current: Space | undefined;
  onOpen: (space: Space) => void;
  onCreated: () => void;
  /** Opens the list of spaces. */
  onAllSpaces: () => void;
}) {
  const [search, setSearch] = useState("");
  const searchId = useId();
  const newSpace = useNewSpace();
  const shown = useMemo(
    () =>
      filterSpaces(spaces, search).sort(
        (a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0),
      ),
    [spaces, search],
  );

  return (
    <div
      className="flex flex-col gap-2"
      onKeyDown={(event) => {
        // A digit types into a search that has words. Otherwise it opens a row.
        if (search || event.metaKey || event.ctrlKey || event.altKey) return;
        if (!/^[1-9]$/.test(event.key)) return;
        const chosen = shown[Number(event.key) - 1];
        if (!chosen) return;
        event.preventDefault();
        onOpen(chosen);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={searchId}>Find a space</Label>
        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            id={searchId}
            type="search"
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ul className="flex flex-col gap-0.5">
        {shown.map((space, at) => (
          <li key={space.id}>
            <button
              type="button"
              aria-label={space.title}
              aria-current={space.id === current?.id ? "true" : undefined}
              onClick={() => onOpen(space)}
              className={cn(
                "focus-attention-inset hover:bg-muted flex min-h-13 w-full items-center gap-3 rounded-control px-2 text-left",
                space.id === current?.id && "bg-accent/60",
              )}
            >
              <Initial title={space.title} list />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">
                  {space.title}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {timeAgo(space.updated_at)}
                </span>
              </span>
              {at < 9 ? (
                <span
                  aria-hidden
                  className="text-muted-foreground text-xs font-semibold"
                >
                  {at + 1}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {shown.length === 0 ? (
        <p className="text-muted-foreground px-2 text-sm">
          No title holds those words.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onAllSpaces}
        className="focus-attention-inset hover:bg-muted flex min-h-13 items-center gap-3 rounded-control px-2 text-base font-semibold"
      >
        <span
          aria-hidden
          className="bg-accent text-accent-foreground grid size-8 place-items-center rounded-[10px]"
        >
          <LayoutList className="size-4" />
        </span>
        All spaces
      </button>

      <button
        type="button"
        // The switcher stays open until the space opens, so a failure shows
        // its reason here.
        onClick={() =>
          void newSpace.create().then((made) => made && onCreated())
        }
        aria-disabled={newSpace.pending}
        className="text-brand focus-attention-inset hover:bg-muted flex min-h-13 items-center gap-3 rounded-control px-2 text-base font-semibold aria-disabled:opacity-50"
      >
        <span
          aria-hidden
          className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-[10px]"
        >
          <Plus className="size-4" />
        </span>
        New space
      </button>
      {newSpace.error ? (
        <p role="alert" className="text-destructive px-2 text-sm">
          {newSpace.error.message}
        </p>
      ) : null}
    </div>
  );
}
