import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** An error that stops a screen, in words the person can read. */
export function Problem({ error }: { error: Error }) {
  return (
    <p className="text-destructive rounded-xl border border-dashed p-8 text-center text-sm">
      {error.message}
    </p>
  );
}

/**
 * A screen with nothing to show yet, and the key that starts it. With `fill`,
 * it takes the whole pane and centres itself there.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  fill = false,
}: {
  icon: LucideIcon;
  title?: string;
  body: string;
  action?: ReactNode;
  fill?: boolean;
}) {
  if (fill) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <Icon className="size-6" aria-hidden />
        </div>
        {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
        <p className="text-muted-foreground max-w-xs text-sm">{body}</p>
        {action}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
      <Icon className="text-muted-foreground size-8" aria-hidden />
      <div className="space-y-1">
        {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
      {action}
    </div>
  );
}
