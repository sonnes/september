import Link from "next/link";
import clsx from "clsx";
import { themes, type ThemeColor } from "@/lib/theme";

interface NavigationLinksProps {
  items: Array<{ name: string; href: string }>;
  currentPath: string;
  color: ThemeColor;
}

export function NavigationLinks({
  items,
  currentPath,
  color,
}: NavigationLinksProps) {
  const theme = themes[color];

  return (
    <div className="hidden lg:ml-10 lg:block">
      <div className="flex space-x-4">
        {items.map((item) => {
          const isCurrent = currentPath.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isCurrent ? "page" : undefined}
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-medium",
                isCurrent
                  ? clsx(theme.bgActive, "text-white")
                  : clsx("text-white", theme.bgHover)
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
