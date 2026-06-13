import { cn } from '@/packages/shared';

type PageTitleProps = {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageTitle({ title, description, actions, className }: PageTitleProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 sm:pt-1">{actions}</div>
      ) : null}
    </div>
  );
}
