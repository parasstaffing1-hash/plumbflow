import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarClock, Users, Wrench, PoundSterling, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/app", label: "Today", icon: CalendarClock },
  { to: "/app/jobs", label: "Jobs", icon: Wrench },
  { to: "/app/customers", label: "Customers", icon: Users },
  { to: "/app/money", label: "Money", icon: PoundSterling },
  { to: "/app/more", label: "More", icon: Menu },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-soft bg-ink pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/app" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "tap flex flex-col items-center justify-center gap-1 py-2 text-[15px] font-semibold",
                  active ? "text-amber" : "text-fog",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed top-0 bottom-0 left-0 z-40 hidden w-60 flex-col border-r border-ink-soft bg-ink px-3 py-6 md:flex">
      <p className="px-3 pb-6 text-lg font-bold tracking-tight text-paper">
        RCH <span className="text-amber">PlumbFlow</span>
      </p>
      <ul className="flex flex-col gap-1">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/app" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "tap flex items-center gap-3 rounded-xl px-3 text-base font-semibold",
                  active ? "bg-ink-soft text-amber" : "text-fog hover:text-paper",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
