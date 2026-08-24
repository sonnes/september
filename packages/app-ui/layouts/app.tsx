import { useEffect, useState } from "react";

import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  CircleHelp,
  House,
  MessageSquare,
  Mic,
  Settings2,
  type LucideIcon,
} from "lucide-react";

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
} from "@september/ui/components/sidebar";

import { APP_NAV, isCompactWidth, type AppPath } from "@platform/rules/app-nav";
import { BrandMark, BrandWordmark } from "@september/app-ui/blocks/brand";
import { RightPanelSlot } from "@september/app-ui/blocks/screen";

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
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  return (
    <SidebarProvider
      key={isCompact ? "compact" : "wide"}
      defaultOpen={!isCompact}
      // A definite height, so the screen body scrolls inside the inset
      // instead of the whole shell growing past the window.
      className="h-svh"
    >
      <RightPanelSlot.Provider value={slot}>
        <AppSidebar />
        {/* min-w-0 lets the surface shrink, so long content wraps. */}
        <SidebarInset className="flex min-h-0 min-w-0 flex-col">
          <Outlet />
        </SidebarInset>
        {/* `display: contents` makes the panel itself the flex child, so it
            sits beside the inset as its own card. */}
        <div ref={setSlot} style={{ display: "contents" }} />
      </RightPanelSlot.Provider>
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
