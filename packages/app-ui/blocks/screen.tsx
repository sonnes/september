import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { Separator } from "@september/ui/components/separator";
import { SidebarTrigger } from "@september/ui/components/sidebar";

import { navFor, type AppPath } from "@platform/rules/app-nav";
import { documentTitle } from "@september/core/rules/titles";
import { useChrome } from "@september/app-ui/blocks/chrome";

/**
 * The slot the app layout gives the right rail.
 *
 * The layout provides it and `RightPanel` reads it, so the panel lands beside
 * the inset instead of inside it.
 */
export const RightPanelSlot = createContext<HTMLElement | null>(null);

/**
 * A panel that belongs beside the screen, not inside it.
 *
 * The inset is one white card. A panel drawn inside it would share that card,
 * and the design gives the rail a card of its own.
 */
export function RightPanel({ children }: { children: ReactNode }) {
  const slot = useContext(RightPanelSlot);
  return slot ? createPortal(children, slot) : null;
}

/**
 * The place at the end of the screen header for keys that a screen adds, and
 * the setter that the header gives its place to. On a phone, the rail keys of
 * a space go here, so the screen keeps the height of a row.
 */
export const HeaderActionsSlot = createContext<{
  slot: HTMLElement | null;
  setSlot: (slot: HTMLElement | null) => void;
} | null>(null);

/** Keys that belong at the end of the screen header. */
export function HeaderActions({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderActionsSlot)?.slot;
  return slot ? createPortal(children, slot) : null;
}

/** The id of the `main` element of a shell. The skip link points to it. */
export const MAIN_ID = "main";

/**
 * The first link of a shell. It shows when it has the focus, and it moves the
 * focus past the navigation to the screen.
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      // A dwell or a scan cannot reach a link that shows only on focus.
      data-access-skip=""
      onClick={(event) => {
        // The focus moves here too, because a browser can leave it on the link.
        event.preventDefault();
        document.getElementById(MAIN_ID)?.focus();
      }}
      className="focus-attention bg-background text-foreground sr-only z-50 rounded-control px-4 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-12 focus:items-center"
    >
      Skip to main content
    </a>
  );
}

/** How many frames the focus waits for the new screen to replace the old one. */
const ROUTE_FOCUS_FRAMES = 20;

/**
 * After a move to another screen, the focus goes to the `h1` of the new
 * screen, so a screen reader reads where the user is. If the new screen has
 * no `h1` yet, the focus goes to `main`.
 *
 * The focus stays where it is on the first screen, and when the new screen
 * has put the focus inside `main` itself, such as on the composer. A screen
 * can load after the path changes, so the hook looks again for some frames.
 * If the old `h1` took the focus and then left the page, the new `h1` gets it.
 */
export function useRouteFocus(
  pathname: string,
  main: RefObject<HTMLElement | null>,
) {
  const last = useRef(pathname);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;

    let placed: HTMLElement | null = null;
    const place = () => {
      const area = main.current;
      if (!area) return;
      const active = document.activeElement;
      const owned =
        active instanceof HTMLElement &&
        active !== document.body &&
        active !== placed &&
        area.contains(active);
      if (owned) return;
      if (placed?.isConnected && active === placed) return;

      const heading = area.querySelector<HTMLElement>("h1");
      if (heading && !heading.hasAttribute("tabindex")) heading.tabIndex = -1;
      placed = heading ?? area;
      placed.focus({ preventScroll: true });
    };

    place();
    let frames = 0;
    let frame = requestAnimationFrame(function again() {
      place();
      if (++frames < ROUTE_FOCUS_FRAMES) frame = requestAnimationFrame(again);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, main]);
}

/**
 * The 64px header of a screen. It carries the sidebar toggle.
 *
 * A screen with no `h1` of its own gives `heading`. The header then holds an
 * `h1` that only a screen reader reads. The panel has no sidebar, and its own
 * header takes this place, so the panel gets the heading alone.
 */
export function ScreenHeader({
  heading,
  children,
}: {
  heading?: string;
  children?: ReactNode;
}) {
  const title = heading ? <h1 className="sr-only">{heading}</h1> : null;
  const actions = useContext(HeaderActionsSlot);
  if (useChrome() === "panel") return title;
  return (
    <header data-scan-group className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      {title}
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      {children}
      <div ref={actions?.setSlot} className="ml-auto flex shrink-0 items-center gap-1.5 empty:hidden" />
    </header>
  );
}

/**
 * One screen inside the shell: the header, then a scrolling body.
 *
 * The body is a div, not a `main`: `SidebarInset` is already the `main`.
 */
export function Screen({
  title,
  description,
  action,
  wide = false,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** A control for the whole screen, beside the title. */
  action?: ReactNode;
  /** Reports use the wider reading surface from the design baseline. */
  wide?: boolean;
  children?: ReactNode;
}) {
  return (
    <>
      {/* React 19 lifts this into the head. Screens that build their own
          header write their own, with the words that tell them apart. */}
      <title>{documentTitle(title)}</title>
      <ScreenHeader>
        <span className="text-sm font-medium">{title}</span>
      </ScreenHeader>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 md:p-4">
        <div
          className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:py-8 ${
            wide ? "max-w-6xl" : "max-w-3xl"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {description ? (
                <p className="text-muted-foreground text-sm sm:text-base">
                  {description}
                </p>
              ) : null}
            </div>
            {action}
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
