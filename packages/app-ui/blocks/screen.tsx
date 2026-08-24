import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Separator } from "@september/ui/components/separator";
import { SidebarTrigger } from "@september/ui/components/sidebar";

import { navFor, type AppPath } from "@platform/rules/app-nav";

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

/** The 64px header of a screen. It carries the sidebar toggle. */
export function ScreenHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      {children}
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

/**
 * A destination that has a place in the shell but no ported screen yet.
 *
 * ponytail: one component for all five, so a ported screen replaces its route
 * component and this stays the same size.
 */
export function AppScreen({ path }: { path: AppPath }) {
  const item = navFor(path);

  return (
    <Screen title={item.title} description={item.description}>
      <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
        This screen is not available yet.
      </p>
    </Screen>
  );
}
