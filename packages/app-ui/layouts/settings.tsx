import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ScreenHeader } from "@september/app-ui/blocks/screen";
import { sectionFor } from "@september/core/rules/navigation";
import { documentTitle } from "@september/core/rules/titles";

import { SETTINGS_NAV } from "@september/app-ui/navigation";

export function SettingsLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const open = sectionFor(pathname);

  return (
    <>
      <title>{documentTitle(open.title, "Settings")}</title>
      <ScreenHeader>
        <span className="text-sm font-medium">Settings</span>
      </ScreenHeader>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 md:p-4">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 md:flex-row md:gap-10 md:py-8">
          {/* On a phone the sections wrap, so every section and the open one
              always show. From md they are a column. */}
          <nav
            aria-label="Settings sections"
            className="flex shrink-0 flex-wrap gap-1 md:w-60 md:flex-col md:flex-nowrap md:self-start">
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              const active = item.path === open.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`focus-attention flex min-h-12 shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors md:items-start ${
                    active ? "bg-muted shadow-[inset_3px_0_0_var(--brand)]" : "hover:bg-muted/60"
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 md:mt-0.5 ${
                      active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium whitespace-nowrap">
                      {item.title}
                    </span>
                    <span className="text-muted-foreground hidden text-xs leading-snug md:block">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
