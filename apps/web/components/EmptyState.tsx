import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

export function EmptyState({ description, icon: Icon, title }: EmptyStateProps) {
  return (
    <section className="rounded-md border bg-background p-6">
      <div className="flex max-w-xl flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Icon aria-hidden className="size-6" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
