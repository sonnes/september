import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";

import { Button } from "@september/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@september/ui/components/dropdown-menu";

import { useChrome } from "@september/app-ui/blocks/chrome";
import { shownModes, spaceParams, useNewSpace } from "@september/app-ui/blocks/space-routes";
import type { Space, SpaceMode } from "@september/core/rules/records";

/** The bottom dock. It holds one tab for each space, and it makes a new one. */
export function SpaceDock(props: DockProps) {
  // The panel header holds the space button and the mode switch instead.
  return useChrome() === "panel" ? null : <Dock {...props} />;
}

interface DockProps {
  current: Space;
  spaces: Space[];
  mode: SpaceMode;
}

function Dock({ current, spaces, mode }: DockProps) {
  const navigate = useNavigate();
  const newSpace = useNewSpace();
  const row = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  // The row stays where it is and turns invisible, so it can still be
  // measured. It overflows its box exactly when the tabs no longer fit.
  useEffect(() => {
    const tabs = row.current;
    if (!tabs) return;

    const measure = () => setFull(tabs.scrollWidth > tabs.clientWidth + 1);
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(tabs);
    return () => watcher.disconnect();
  }, [spaces.length]);

  // A space tab keeps the mode the user is in, so Notes stays Notes.
  const open = (space: Space) => navigate(spaceParams(space, mode));

  const add = newSpace.create;

  const tabClass = (space: Space) =>
    `focus-attention inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors ${
      space.id === current.id
        ? "bg-primary text-primary-foreground border-transparent"
        : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
    }`;

  return (
    // On a narrow screen the modes wrap to a second line, so the space key
    // keeps a full key width beside them. The smaller padding below 40rem
    // keeps the three modes inside a 320px screen.
    <div className="bg-muted/40 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-3 border-t px-2 py-2.5 sm:px-4">
      <nav aria-label="Spaces" data-scan-group className="relative min-w-40 flex-1">
        {/* A row that does not fit is inert: no pointer, key, or screen
            reader reaches it, and the Switch space key takes its place. The
            row keeps its size, so it can still be measured. */}
        <div
          ref={row}
          inert={full}
          className={`flex items-center gap-1.5 overflow-hidden p-1.5 ${
            full ? "opacity-0" : ""
          }`}
        >
          {spaces.map((space) => (
            <button
              key={space.id}
              type="button"
              aria-current={space.id === current.id ? "page" : undefined}
              onClick={() => open(space)}
              className={tabClass(space)}
            >
              {space.id === current.id ? <CurrentDot /> : null}
              {space.title}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="New space"
            className="focus-attention"
            onClick={add}
          >
            <Plus aria-hidden />
          </Button>
        </div>

        {full ? (
          <div className="absolute inset-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Switch space, now ${current.title}`}
                  className="focus-attention bg-card hover:bg-accent flex h-full min-h-12 w-full items-center justify-between gap-2 rounded-full border px-4 text-sm font-medium transition-colors"
                >
                  <span className="truncate">{current.title}</span>
                  <ChevronDown
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-48">
                <DropdownMenuRadioGroup
                  value={current.id}
                  onValueChange={(id) => {
                    const space = spaces.find((one) => one.id === id);
                    if (space) open(space);
                  }}
                >
                  {spaces.map((space) => (
                    <DropdownMenuRadioItem key={space.id} value={space.id}>
                      <span className="truncate">{space.title}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void add()}>
                  <Plus aria-hidden />
                  New space
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </nav>

      {/* A wide gap, so a press meant for a mode cannot land on a space. */}
      <div className="ml-auto shrink-0 pl-5">
        <ModeGroup mode={mode} onMode={(next) => navigate(spaceParams(current, next))} />
      </div>
    </div>
  );
}

/** The dot on the current tab, so the state is not a fill alone. */
function CurrentDot() {
  return <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />;
}

/**
 * Talk, Notes, or Agent, as a segmented switch.
 *
 * Each mode is another page of the space, so the switch is navigation, not a
 * `tablist`. Each key is in the tab order, and the open one is the current
 * page.
 */
function ModeGroup({
  mode,
  onMode,
}: {
  mode: SpaceMode;
  onMode: (mode: SpaceMode) => void;
}) {
  const shown = shownModes();

  return (
    <nav
      aria-label="Space mode"
      data-scan-group
      className="bg-card flex items-center gap-0.5 rounded-full border p-0.5"
    >
      {shown.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          aria-current={key === mode ? "page" : undefined}
          onClick={() => onMode(key)}
          className={`focus-attention inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
            key === mode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  );
}
