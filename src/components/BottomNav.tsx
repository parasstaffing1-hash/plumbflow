import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CalendarClock, Users, Wrench, PoundSterling, Menu, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/lib/platform";
import { toast } from "sonner";

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
  const { currentAccount, logout } = usePlatform();
  const navigate = useNavigate();

  const businessName = currentAccount?.businessName || "PlumbFlow";
  const ownerName = currentAccount?.ownerName || "Trade User";

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully.");
    navigate({ to: "/login" });
  };

  return (
    <nav className="fixed top-0 bottom-0 left-0 z-40 hidden w-60 flex-col justify-between border-r border-ink-soft bg-ink px-3 py-6 md:flex">
      <div>
        <div className="px-3 pb-6">
          <p className="text-lg font-bold tracking-tight text-paper truncate">
            {businessName}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber">
            PlumbFlow Trade
          </p>
        </div>
        <ul className="flex flex-col gap-1">
          {TABS.map(({ to, label, icon: Icon }) => {
            const active =
              to === "/app" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "tap flex items-center gap-3 rounded-xl px-3 py-2 text-base font-semibold transition",
                    active
                      ? "bg-ink-soft text-amber"
                      : "text-fog hover:text-paper hover:bg-ink-soft/40",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User profile & Logout */}
      <div className="rounded-xl border border-ink-soft bg-ink-soft/30 p-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber text-xs font-bold text-ink">
            {ownerName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-paper">{ownerName}</p>
            <p className="truncate text-[11px] text-fog">{currentAccount?.email || "Signed In"}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition cursor-pointer"
        >
          <LogOut className="size-3.5" />
          Log out
        </button>
      </div>
    </nav>
  );
}
