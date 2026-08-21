import { useEffect, useState, type ReactNode } from "react";

import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  CircleHelp,
  House,
  MessageSquare,
  Mic,
  Settings2,
  type LucideIcon,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import {
  APP_NAV,
  isCompactWidth,
  navFor,
  type AppPath,
} from "./app-nav";
import { BrandMark, BrandWordmark } from "./brand";

const ICONS: Record<AppPath, LucideIcon> = {
  "/dashboard": House,
  "/spaces": MessageSquare,
  "/voice": Mic,
  "/help": CircleHelp,
  "/settings": Settings2,
};

/** True at or below the base design viewport, where the sidebar is a rail. */
function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const read = () => setIsCompact(isCompactWidth(window.innerWidth));
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return isCompact;
}

/**
 * The app shell: the indigo sidebar beside an inset white surface.
 *
 * The provider is keyed on the breakpoint, so a resize past the base viewport
 * applies the new default. A manual toggle (the rail or Command-B) wins until
 * then.
 */
export function AppShell() {
  const isCompact = useIsCompact();

  return (
    <SidebarProvider
      key={isCompact ? "compact" : "wide"}
      defaultOpen={!isCompact}
      // A definite height, so the screen body scrolls inside the inset
      // instead of the whole shell growing past the window.
      className="h-svh"
    >
      <AppSidebar />
      {/* min-w-0 lets the surface shrink, so long content wraps. */}
      <SidebarInset className="flex min-h-0 min-w-0 flex-col">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div aria-label="September" className="flex h-12 items-center gap-2">
          <BrandMark size={32} className="size-8 rounded-lg" />
          <BrandWordmark
            tone="inverse"
            aria-hidden="true"
            className="truncate text-xl group-data-[collapsible=icon]:hidden"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* The group insets the menu by 8px, the same as the header, so the
            brand and the nav icons share one left edge. */}
        <SidebarGroup>
          <SidebarMenu>
            {APP_NAV.map((item) => {
              const Icon = ICONS[item.path];
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    tooltip={item.title}
                    data-active={pathname.startsWith(item.path)}
                    // A 48px row is a calmer target than the 32px default.
                    // `lg` drops the rail padding, so put it back for the rail.
                    className="group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!"
                  >
                    <Link to={item.path}>
                      <Icon />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

/**
 * One screen inside the shell: a 64px header that carries the sidebar toggle,
 * then a scrolling body.
 *
 * The body is a div, not a `main`: `SidebarInset` is already the `main`.
 */
export function Screen({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <span className="text-sm font-medium">{title}</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 md:p-4">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:py-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description ? (
              <p className="text-muted-foreground text-sm sm:text-base">
                {description}
              </p>
            ) : null}
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
        This screen is not ported from the web app yet.
      </p>
    </Screen>
  );
}
