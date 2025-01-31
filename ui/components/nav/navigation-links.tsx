import Link from "next/link";
import clsx from "clsx";
import { ColorConfig } from "./types";

interface NavigationLinksProps {
  items: Array<{ name: string; href: string }>;
  currentPath: string;
  colors: ColorConfig;
}

export function NavigationLinks({
  items,
  currentPath,
  colors,
}: NavigationLinksProps) {
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
                  ? clsx(colors.bgActive, "text-white")
                  : clsx("text-white", colors.bgHover)
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
