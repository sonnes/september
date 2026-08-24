import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@september/ui";

type BrandMarkProps = Omit<
  ComponentPropsWithoutRef<"img">,
  "src" | "width" | "height"
> & { size?: number };

type BrandWordmarkProps = ComponentPropsWithoutRef<"span"> & {
  tone?: "default" | "inverse";
};

/** The keycap mark, from the file the brand publishes. Do not redraw it. */
export function BrandMark({
  alt = "",
  className,
  size = 32,
  ...props
}: BrandMarkProps) {
  return (
    <img
      src="/logo.svg"
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      {...props}
    />
  );
}

/** `Sep` typed, `tember` completed — the wordmark shows what the app does. */
export function BrandWordmark({
  className,
  tone = "default",
  ...props
}: BrandWordmarkProps) {
  const inverse = tone === "inverse";

  return (
    <span
      className={cn(
        "font-brand inline-flex items-baseline leading-none font-bold tracking-[-0.065em]",
        className,
      )}
      {...props}
    >
      <span className={inverse ? "text-white" : "text-indigo-600"}>Sep</span>
      <span className="text-indigo-200">tember</span>
    </span>
  );
}
