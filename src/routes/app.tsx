import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertTriangle, Download, Lock } from "lucide-react";

import { BottomNav, SideNav } from "@/components/BottomNav";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { usePlatform } from "@/lib/platform";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/app")({
  // The plumber's app reads localStorage on first paint; skipping SSR keeps
  // server and client markup identical and avoids a hydration mismatch.
  ssr: false,
  head: () => ({
    meta: [
      { title: "RCH PlumbFlow, your jobs" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "The RCH PlumbFlow field app." },
    ],
  }),
  component: AppShell,
});

/**
 * Subscription gate. Mirrors organisations.subscription_status.
 * Stripe lands in Phase 2, the states and the copy are already correct so the
 * integration only has to flip the status field.
 */
function AppShell() {
  const { currentAccount, isAuthenticated } = usePlatform();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname + window.location.search : "/app";
      navigate({ to: "/login", search: { redirect: currentPath } });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const status = currentAccount.subscriptionStatus;

  if (status === "canceled") return <LockedScreen />;

  return (
    <>
      <SideNav />
      <div className="md:pl-60">
        <div className="mx-auto min-h-screen max-w-lg bg-surface pb-[calc(3.5rem+4rem+1.5rem+env(safe-area-inset-bottom))] md:max-w-4xl md:pb-16">
          <OfflineIndicator />
          {status === "past_due" ? <PastDueBanner /> : null}
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </div>
      </div>
      <BottomNav />
    </>
  );
}

function PastDueBanner() {
  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-amber-deep bg-amber px-4 py-3 text-ink">
      <AlertTriangle className="size-5 shrink-0" aria-hidden />
      <p className="text-[15px] leading-snug font-semibold">
        Payment failed, update your card to keep access
      </p>
    </div>
  );
}

function LockedScreen() {
  const { currentAccount } = usePlatform();
  const { data } = useStore();

  const stored = [
    { label: "Customers", value: data.customers.length },
    { label: "Properties", value: data.properties.length },
    { label: "Jobs", value: data.jobs.length },
    { label: "Quotes", value: data.quotes.length },
    { label: "Invoices", value: data.invoices.length },
    { label: "Photos", value: data.jobs.reduce((sum, job) => sum + job.photos.length, 0) },
  ];

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `plumbflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-surface">
      <header className="bg-ink px-4 pt-[env(safe-area-inset-top)] pb-6 text-paper">
        <div className="pt-6">
          <Lock className="size-7 text-amber" aria-hidden />
          <h1 className="mt-3 text-2xl font-semibold">Subscription ended</h1>
          <p className="mt-2 text-base text-fog">
            {currentAccount.businessName}&rsquo;s account is closed. Nothing has been deleted
            everything below is still here and comes straight back when you restart.
          </p>
        </div>
      </header>

      <div className="space-y-4 p-4">
        <section className="rounded-xl border border-line bg-paper p-4 shadow-card">
          <h2 className="label-caps text-slate">What we&rsquo;re holding for you</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            {stored.map((row) => (
              <div key={row.label} className="rounded-lg bg-surface p-3">
                <dt className="text-base text-slate">{row.label}</dt>
                <dd className="text-xl font-semibold tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-base text-slate">
            Last active {formatDate(currentAccount.lastActiveAt)}. Invoiced to date{" "}
            {formatCurrency(currentAccount.invoicedTotal)}.
          </p>
        </section>

        <button
          type="button"
          disabled
          className="tap w-full rounded-xl bg-amber px-4 py-4 text-lg font-semibold text-ink disabled:opacity-60"
        >
          Update payment
        </button>
        <p className="text-center text-base text-slate">
          Card payments arrive shortly. Call us on 01632 960019 to restart today.
        </p>

        <button
          type="button"
          onClick={exportData}
          className="tap flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-paper px-4 py-4 text-base font-semibold text-ink"
        >
          <Download className="size-5" aria-hidden />
          Export all my data
        </button>

        <Link
          to="/"
          className="tap block px-4 py-3 text-center text-base font-semibold text-amber-deep"
        >
          Back to plumbflow.co.uk
        </Link>
      </div>
    </div>
  );
}
