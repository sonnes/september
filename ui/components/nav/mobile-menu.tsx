import { DisclosureButton, DisclosurePanel } from "@headlessui/react";
import Link from "next/link";
import clsx from "clsx";
import { themes, type ThemeColor } from "@/lib/theme";

interface MobileMenuProps {
  navigation: Array<{ name: string; href: string }>;
  userNavigation: Array<{ name: string; href: string }>;
  currentPath: string;
  color: ThemeColor;
}

export function MobileMenu({
  navigation,
  userNavigation,
  currentPath,
  color,
}: MobileMenuProps) {
  const theme = themes[color];

  return (
    <DisclosurePanel className="lg:hidden">
      <div className="space-y-1 px-2 pb-3 pt-2">
        {navigation.map((item) => {
          const isCurrent = currentPath === item.href;
          return (
            <DisclosureButton
              key={item.name}
              as={Link}
              href={item.href}
              aria-current={isCurrent ? "page" : undefined}
              className={clsx(
                "block rounded-md px-3 py-2 text-base font-medium",
                isCurrent
                  ? clsx(theme.bgActive, "text-white")
                  : clsx("text-white", theme.bgHover)
              )}
            >
              {item.name}
            </DisclosureButton>
          );
        })}
      </div>
      <div className={clsx(`border-t pb-3 pt-4`, theme.borderLg)}>
        <div className="flex items-center px-5">
          <div className="shrink-0">
            <img
              alt=""
              src={
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              }
              className="size-10 rounded-full"
            />
          </div>
        </div>
        <div className="mt-3 space-y-1 px-2">
          {userNavigation.map((item) => (
            <DisclosureButton
              key={item.name}
              as={Link}
              href={item.href}
              className={clsx(
                "block rounded-md px-3 py-2 text-base font-medium text-white",
                theme.bgHover
              )}
            >
              {item.name}
            </DisclosureButton>
          ))}
        </div>
      </div>
    </DisclosurePanel>
  );
}
