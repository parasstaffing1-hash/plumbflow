import { createFileRoute, Link } from "@tanstack/react-router";
import { usePlatform, setupSteps, daysUntil } from "@/lib/platform";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/owner/onboarding")({
  component: OwnerOnboarding,
});

function OwnerOnboarding() {
  const { data } = usePlatform();

  const rows = data.accounts
    .map((account) => {
      const steps = setupSteps(account);
      return { account, steps, done: steps.filter((step) => step.done).length };
    })
    .filter(({ account }) => account.subscriptionStatus !== "canceled")
    .sort((a, b) => a.done - b.done);

  const stalled = rows.filter(({ done, steps }) => done < steps.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Onboarding</h1>
        <p className="mt-1 text-[16px] text-slate">
          {stalled.length} accounts haven&rsquo;t finished setup. That&rsquo;s where churn starts.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map(({ account, steps, done }) => {
          const trialDays = daysUntil(account.trialEndsAt);
          return (
            <section
              key={account.id}
              className="rounded-xl border border-line bg-paper p-5 shadow-card"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to="/owner/accounts/$accountId"
                  params={{ accountId: account.id }}
                  className="inline-flex min-h-11 items-center text-xl font-semibold hover:text-amber-deep"
                >
                  {account.businessName}
                </Link>
                <span className="text-[15px] text-slate tabular-nums">
                  signed up {formatDate(account.signupDate)}
                  {trialDays !== null ? ` · trial ${trialDays} days left` : ""}
                </span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-amber"
                  style={{ width: `${(done / steps.length) * 100}%` }}
                  aria-hidden
                />
              </div>
              <p className="mt-2 text-base text-slate">
                {done} of {steps.length} steps complete
              </p>

              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {steps.map((step) => (
                  <li
                    key={step.key}
                    className={
                      step.done
                        ? "flex items-center gap-2 text-[15px]"
                        : "flex items-center gap-2 text-[15px] text-slate"
                    }
                  >
                    <span aria-hidden>{step.done ? "✓" : "○"}</span>
                    {step.label}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
