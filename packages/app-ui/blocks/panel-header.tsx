import { useMemo, useRef, useState, type ReactNode } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@september/ui/components/dropdown-menu";
import { Input } from "@september/ui/components/input";
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
export type PanelSheet = "spaces" | "phrases" | "voice" | "rename" | "delete";

const MODES: { key: SpaceMode; label: string }[] = [
  { key: "talk", label: "Talk" },
  { key: "notes", label: "Notes" },
  { key: "agent", label: "Agent" },
];

const ring =
  "focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:outline-none";

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
 * and the More menu. On a page, such as Settings, it holds Back, the title of
 * the page, and the More menu.
 */
export function PanelHeader({
  space,
  mode,
  page,
  onSheet,
  onPanelTab,
}: {
  /** The space on the screen, or nothing when the panel shows no space. */
  space: Space | undefined;
  mode: SpaceMode;
  /** The page on the screen, or null on a space path. */
  page: PanelPage | null;
  onSheet: (sheet: PanelSheet) => void;
  /** Opens Phrases or Voice: a sheet, or the right rail in the wide tier. */
  onPanelTab: (tab: "phrases" | "voice") => void;
}) {
  const navigate = useNavigate();
  const panel = usePanel();
  const shown = MODES.filter(({ key }) => key !== "agent" || agentEnabled());
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // The arrow keys move between the tabs, as a screen reader user expects of
  // a `tablist`. Only the open tab is in the tab order.
  const onTabKey = (event: React.KeyboardEvent, at: number) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    tabs.current[(at + step + shown.length) % shown.length]?.focus();
  };

  // The menu reads the composer as it opens, so it lists only what works now.
  const composer = panel?.composer.current;

  return (
    <header className="bg-sidebar text-sidebar-foreground flex h-16 shrink-0 items-center gap-2 px-2.5">
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
          <span className="min-w-0 flex-1 truncate text-center text-base font-semibold">
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
              "bg-sidebar-primary flex h-11 max-w-40 shrink-0 items-center gap-2 rounded-control pr-3 pl-2.5 text-sm font-semibold",
              ring,
            )}
          >
            {space ? <Initial title={space.title} /> : null}
            <span className="truncate">{space?.title ?? "Spaces"}</span>
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          </button>

          {space ? (
            <div
              role="tablist"
              aria-label="Space mode"
              className="bg-sidebar-primary flex min-w-0 flex-1 gap-0.5 rounded-control p-0.5"
            >
              {shown.map(({ key, label }, at) => (
                <button
                  key={key}
                  ref={(element) => {
                    tabs.current[at] = element;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={key === mode}
                  tabIndex={key === mode ? 0 : -1}
                  onClick={() => navigate(spaceParams(space, key))}
                  onKeyDown={(event) => onTabKey(event, at)}
                  className={cn(
                    "min-h-11 min-w-0 flex-1 rounded-[10px] px-2 text-sm font-medium transition-colors",
                    ring,
                    key === mode
                      ? "bg-sidebar-foreground text-sidebar-primary font-semibold shadow-sm"
                      : "hover:bg-sidebar-border/40",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <span className="flex-1" />
          )}
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More"
            className={cn(
              "data-[state=open]:bg-sidebar-primary hover:bg-sidebar-primary grid size-11 shrink-0 place-items-center rounded-control transition-colors",
              ring,
            )}
          >
            <Ellipsis className="size-5" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 rounded-surface p-1.5">
          {space ? (
            <>
              <MenuItem keys="⌘P" onSelect={() => onPanelTab("phrases")}>
                Phrases
              </MenuItem>
              <MenuItem keys="⌘⇧V" onSelect={() => onPanelTab("voice")}>
                Voice controls
              </MenuItem>
            </>
          ) : null}
          {composer?.speaks ? (
            <MenuItem
              keys="⌘⇧O"
              // The output menu opens once this menu has closed and given
              // the focus back.
              onSelect={() => setTimeout(() => panel?.setOutputOpen(true), 0)}
            >
              Sound output
            </MenuItem>
          ) : null}
          {composer && panel?.tier === "compact" ? (
            <MenuItem
              keys="⌘⌫"
              disabled={!composer.draft}
              onSelect={() => composer.clear()}
            >
              Clear the draft
            </MenuItem>
          ) : null}
          {space ? (
            <>
              <DropdownMenuSeparator />
              <MenuItem onSelect={() => onSheet("rename")}>
                Rename space
              </MenuItem>
              <MenuItem destructive onSelect={() => onSheet("delete")}>
                Delete space
              </MenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          {APP_NAV.map((item) => (
            <MenuItem
              key={item.path}
              keys={item.path === "/help" ? "⌘?" : undefined}
              onSelect={() => void navigate({ to: item.path })}
            >
              {item.title}
            </MenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function MenuItem({
  keys,
  destructive,
  disabled,
  onSelect,
  children,
}: {
  keys?: string;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenuItem
      variant={destructive ? "destructive" : "default"}
      disabled={disabled}
      onSelect={onSelect}
      className="min-h-11 text-sm"
    >
      <span className="flex-1">{children}</span>
      {keys ? <DropdownMenuShortcut>{keys}</DropdownMenuShortcut> : null}
    </DropdownMenuItem>
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
  space,
  spaces,
  mode,
}: {
  sheet: PanelSheet | null;
  onSheet: (sheet: PanelSheet | null) => void;
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
        // Below the 64-point header, inset as a card. The close key of the
        // sheet keeps a 44-point target.
        className="rounded-surface inset-x-2 top-[4.5rem] max-h-[calc(100svh-5rem)] gap-3 overflow-y-auto border p-4 [&>button:last-child]:top-2.5 [&>button:last-child]:right-2.5 [&>button:last-child]:grid [&>button:last-child]:size-11 [&>button:last-child]:place-items-center"
      >
        <SheetTitle className="text-title pr-12">{title}</SheetTitle>
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
      <div className="relative">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          autoFocus
          value={search}
          aria-label="Find a space"
          placeholder="Find a space"
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 pl-9 text-base"
        />
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
                "hover:bg-muted focus-visible:ring-ring flex min-h-13 w-full items-center gap-3 rounded-control px-2 text-left focus-visible:ring-2 focus-visible:outline-none",
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
        className="hover:bg-muted focus-visible:ring-ring flex min-h-13 items-center gap-3 rounded-control px-2 text-base font-semibold focus-visible:ring-2 focus-visible:outline-none"
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
        onClick={() => {
          newSpace.create();
          onCreated();
        }}
        aria-disabled={newSpace.pending}
        className="text-primary hover:bg-muted focus-visible:ring-ring flex min-h-13 items-center gap-3 rounded-control px-2 text-base font-semibold focus-visible:ring-2 focus-visible:outline-none aria-disabled:opacity-50"
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
