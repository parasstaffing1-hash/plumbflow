import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-ink px-4 pt-[env(safe-area-inset-top)] pb-4 text-paper">
      <div className="flex items-start justify-between gap-3 pt-4">
        <div>
          <h1 className="text-2xl leading-tight font-semibold">{title}</h1>
          {subtitle ? <p className="mt-1 text-base text-fog">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}
