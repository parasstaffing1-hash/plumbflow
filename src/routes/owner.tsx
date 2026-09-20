import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { usePlatform } from "@/lib/platform";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/owner")({
  // Owner data is read client-side from the platform store; no SSR, no indexing.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Owner console | RCH PlumbFlow" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Platform owner console." },
    ],
  }),
  component: OwnerShell,
});

const TABS = [
  { to: "/owner", label: "Dashboard", exact: true },
  { to: "/owner/accounts", label: "Accounts", exact: false },
  { to: "/owner/onboarding", label: "Onboarding", exact: false },
  { to: "/owner/settings", label: "Settings", exact: false },
] as const;

/**
 * Route guard. The real check is profiles.is_platform_owner enforced in RLS
 * this mirrors it so the surface is never reachable by typing the URL.
 */
function OwnerShell() {
  const { data } = usePlatform();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!data.isPlatformOwner) return <NotAuthorised />;

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ink-soft">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded bg-amber px-2 py-1 text-[15px] font-bold tracking-wide text-ink">
              OWNER
            </span>
            <span className="text-lg font-semibold text-paper">
              RCH Plumb<span className="text-amber">Flow</span> platform
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[15px] text-fog">{data.ownerName}</span>
            <Link
              to="/app"
              className="inline-flex min-h-11 items-center text-[15px] font-semibold text-amber"
            >
              Go to app
            </Link>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
          <ul className="flex w-max gap-1">
            {TABS.map((tab) => {
              const active = tab.exact
                ? pathname === "/owner" || pathname === "/owner/"
                : pathname.startsWith(tab.to);
              return (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    className={cn(
                      "tap block border-b-2 px-4 py-3 text-[15px] font-semibold whitespace-nowrap",
                      active
                        ? "border-amber text-paper"
                        : "border-transparent text-fog hover:text-paper",
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Required: nested routes render here. */}
        <Outlet />
      </main>
    </div>
  );
}

function NotAuthorised() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-sm text-center">
        <ShieldAlert className="mx-auto size-10 text-slate" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">Not available</h1>
        <p className="mt-2 text-[16px] text-slate">This area is for the platform owner only.</p>
        <Link
          to="/app"
          className="tap mt-6 inline-block rounded-xl bg-amber px-5 py-3 font-semibold text-ink"
        >
          Back to the app
        </Link>
      </div>
    </div>
  );
}
