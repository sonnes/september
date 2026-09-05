import { useState } from "react";

import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  CircleHelp,
  Eye,
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

import { APP_NAV, type AppPath } from "@platform/rules/app-nav";
import { BrandMark, BrandWordmark } from "@september/app-ui/blocks/brand";
import { RightPanelSlot } from "@september/app-ui/blocks/screen";

const COMMON_ICONS: Record<Exclude<AppPath, "/eyetracker">, LucideIcon> = {
  "/dashboard": House,
  "/spaces": MessageSquare,
  "/voice": Mic,
  "/help": CircleHelp,
  "/settings": Settings2,
};

const DESKTOP_ICONS: Record<"/eyetracker", LucideIcon> = {
  "/eyetracker": Eye,
};

// Desktop has one native-only destination. Spreading its icon keeps this
// shared layout exhaustive for both platform route unions.
const ICONS: Record<AppPath, LucideIcon> = {
  ...COMMON_ICONS,
  ...DESKTOP_ICONS,
};

/** The app sidebar starts collapsed; manual toggles survive resizing. */
export function AppShell() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  return (
    <SidebarProvider
      defaultOpen={false}
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
      <SidebarHeader className="group-data-[collapsible=icon]:px-0.5">
        {/* Home, the way every site puts it behind its own name. On the
            desktop app `/` sends the user back to where they were. */}
        <Link
          to="/"
          aria-label="September home"
          className="ring-sidebar-ring group-data-[collapsible=icon]:justify-center flex h-12 items-center gap-2 rounded-lg outline-hidden focus-visible:ring-2"
        >
          <BrandMark size={32} className="size-8 rounded-lg" />
          <BrandWordmark
            tone="inverse"
            aria-hidden="true"
            className="truncate text-xl group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* The group insets the menu by 8px, the same as the header, so the
            brand and the nav icons share one left edge. */}
        <SidebarGroup className="group-data-[collapsible=icon]:px-0.5">
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
                    // Keep a 44px target inside the compact rail.
                    className="group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:p-3!"
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
