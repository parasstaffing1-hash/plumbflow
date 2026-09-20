import { createFileRoute, Link } from "@tanstack/react-router";
import {
  usePlatform,
  daysUntil,
  SUBSCRIPTION_LABELS,
  type SubscriptionStatus,
} from "@/lib/platform";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/owner/")({
  component: OwnerDashboard,
});

function Stat({
  label,
  value,
  hint,
  to,
  search,
}: {
  label: string;
  value: string;
  hint?: string;
  to?: string;
  search?: { status: SubscriptionStatus | "all" };
}) {
  const body = (
    <>
      <p className="label-caps text-slate">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-base text-slate">{hint}</p> : null}
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        search={search ?? {}}
        className="tap block rounded-xl border border-line bg-paper p-4 shadow-card hover:border-amber"
      >
        {body}
      </Link>
    );
  }
  return <div className="rounded-xl border border-line bg-paper p-4 shadow-card">{body}</div>;
}

function OwnerDashboard() {
  const { data } = usePlatform();
  const { accounts, settings } = data;

  const count = (status: SubscriptionStatus) =>
    accounts.filter((a) => a.subscriptionStatus === status).length;

  const activeCount = count("active");
  const compedCount = count("comped");
  const payingCount = activeCount + count("past_due");
  const mrr = activeCount * settings.monthlyPrice;

  const now = new Date();
  const newThisMonth = accounts.filter((a) => {
    const date = new Date(a.signupDate);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const endingSoon = accounts
    .filter((a) => {
      if (a.subscriptionStatus !== "trialing") return false;
      const days = daysUntil(a.trialEndsAt);
      return days !== null && days <= 3;
    })
    .sort((a, b) => (a.trialEndsAt ?? "").localeCompare(b.trialEndsAt ?? ""));

  // Month-by-month count of accounts live at the end of each month.
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index) + 1, 0);
    const live = accounts.filter((a) => {
      const signed = new Date(a.signupDate) <= date;
      const gone = a.subscriptionStatus === "canceled" && new Date(a.lastActiveAt) < date;
      return signed && !gone;
    }).length;
    return {
      label: date.toLocaleDateString("en-GB", { month: "short" }),
      value: live,
    };
  });
  const peak = Math.max(1, ...months.map((m) => m.value));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Platform dashboard</h1>
        <p className="mt-1 text-[16px] text-slate">
          {accounts.length} businesses on RCH PlumbFlow · £{settings.monthlyPrice}/month ·{" "}
          {settings.trialDays}-day trial
        </p>
        <Link
          to="/book"
          className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-line bg-paper px-4 text-[15px] font-semibold text-ink"
        >
          Booking pages
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Active plumbers"
          value={String(payingCount + compedCount)}
          hint={`${payingCount} paying · ${compedCount} comped`}
        />
        <Stat
          label="Monthly recurring revenue"
          value={formatCurrency(mrr)}
          hint={`${activeCount} × ${formatCurrency(settings.monthlyPrice)} · comped ${formatCurrency(0)}`}
        />
        <Stat label="New signups this month" value={String(newThisMonth)} />
        <Stat
          label="Trials ending ≤ 3 days"
          value={String(endingSoon.length)}
          hint="Ring these ones"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["trialing", "past_due", "canceled"] as SubscriptionStatus[]).map((status) => (
          <Stat
            key={status}
            label={SUBSCRIPTION_LABELS[status]}
            value={String(count(status))}
            to="/owner/accounts"
            search={{ status }}
            hint="View accounts"
          />
        ))}
      </div>

      <section className="rounded-xl border border-line bg-paper p-5 shadow-card">
        <h2 className="text-xl font-semibold">Active accounts, month by month</h2>
        <div className="mt-5 flex h-44 items-end gap-1 sm:gap-2">
          {months.map((month) => (
            <div key={month.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-base font-semibold tabular-nums text-slate">{month.value}</span>
              <div
                className="w-full rounded-t bg-amber"
                style={{ height: `${Math.max(4, (month.value / peak) * 120)}px` }}
                aria-hidden
              />
              <span className="text-[15px] text-slate">{month.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-paper p-5 shadow-card">
        <h2 className="text-xl font-semibold">Trials ending in the next 3 days</h2>
        {endingSoon.length === 0 ? (
          <p className="mt-3 text-[16px] text-slate">Nothing needs chasing today.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {endingSoon.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <Link
                    to="/owner/accounts/$accountId"
                    params={{ accountId: account.id }}
                    className="inline-flex min-h-11 items-center text-[17px] font-semibold text-ink hover:text-amber-deep"
                  >
                    {account.businessName}
                  </Link>
                  <p className="text-base text-slate">
                    {account.ownerName} · setup{" "}
                    {Object.values(account.setup).filter(Boolean).length}/5 done
                  </p>
                </div>
                <span className="text-base font-semibold tabular-nums text-amber-deep">
                  ends {formatDate(account.trialEndsAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
