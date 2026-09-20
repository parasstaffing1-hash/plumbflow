import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  usePlatform,
  setupSteps,
  SUBSCRIPTION_LABELS,
  type SubscriptionStatus,
} from "@/lib/platform";
import { formatCurrency, formatDate } from "@/lib/format";
import { ReasonDialog, StatusPill } from "./owner.accounts.index";

export const Route = createFileRoute("/owner/accounts/$accountId")({
  component: AccountDetail,
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="label-caps text-slate">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function AccountDetail() {
  const { accountId } = Route.useParams();
  const { data, setStatus } = usePlatform();
  const account = data.accounts.find((item) => item.id === accountId);
  const [action, setAction] = useState<{ status: SubscriptionStatus; title: string } | null>(null);

  if (!account) {
    return (
      <div className="rounded-xl border border-line bg-paper p-6">
        <h1 className="text-2xl font-semibold">Account not found</h1>
        <Link to="/owner/accounts" className="mt-3 inline-block font-semibold text-amber-deep">
          Back to accounts
        </Link>
      </div>
    );
  }

  const history = data.audit.filter((entry) => entry.accountId === account.id);
  const steps = setupSteps(account);
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/owner/accounts" className="text-[15px] font-semibold text-amber-deep">
          ← Accounts
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{account.businessName}</h1>
          <StatusPill status={account.subscriptionStatus} />
        </div>
        <p className="mt-1 text-[16px] text-slate">
          {account.ownerName} · {account.email} · {account.phone} · {account.town}
        </p>
      </div>

      <div className="rounded-xl border border-line bg-amber-wash p-4 text-[15px] text-ink">
        Aggregate figures only. Customer names, addresses, job details and invoices belong to this
        business and are not visible here.
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Signed up" value={formatDate(account.signupDate)} />
        <Metric label="Last login" value={formatDate(account.lastLoginAt)} />
        <Metric label="Last active" value={formatDate(account.lastActiveAt)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Customers" value={String(account.customersCount)} />
        <Metric label="Jobs completed" value={String(account.jobsCompleted)} />
        <Metric label="Quotes sent" value={String(account.quotesSent)} />
        <Metric label="Quotes accepted" value={String(account.quotesAccepted)} />
        <Metric label="Invoiced" value={formatCurrency(account.invoicedTotal)} />
        <Metric label="Collected" value={formatCurrency(account.collectedTotal)} />
      </div>

      <section className="rounded-xl border border-line bg-paper p-5 shadow-card">
        <h2 className="text-xl font-semibold">
          Setup wizard, {doneCount}/{steps.length} complete
        </h2>
        <ul className="mt-3 space-y-2">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-3 text-[16px]">
              <span
                className={
                  step.done
                    ? "inline-flex size-6 items-center justify-center rounded-full bg-go text-paper"
                    : "inline-flex size-6 items-center justify-center rounded-full border border-line text-slate"
                }
                aria-hidden
              >
                {step.done ? "✓" : ""}
              </span>
              <span className={step.done ? "" : "text-slate"}>{step.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-paper p-5 shadow-card">
        <h2 className="text-xl font-semibold">Subscription</h2>
        <p className="mt-1 text-[16px] text-slate">
          {SUBSCRIPTION_LABELS[account.subscriptionStatus]}
          {account.trialEndsAt ? ` · trial ends ${formatDate(account.trialEndsAt)}` : ""}
          {account.statusReason ? ` · ${account.statusReason}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {account.subscriptionStatus !== "comped" ? (
            <button
              type="button"
              onClick={() => setAction({ status: "comped", title: "Comp this account" })}
              className="tap rounded-xl border border-line px-4 py-3 font-semibold"
            >
              Comp this account
            </button>
          ) : null}
          {account.subscriptionStatus !== "canceled" ? (
            <button
              type="button"
              onClick={() => setAction({ status: "canceled", title: "Suspend access" })}
              className="tap rounded-xl border border-line px-4 py-3 font-semibold"
            >
              Suspend access
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAction({ status: "active", title: "Restore access" })}
              className="tap rounded-xl bg-amber px-4 py-3 font-semibold text-ink"
            >
              Restore access
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-paper p-5 shadow-card">
        <h2 className="text-xl font-semibold">Audit log</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-[16px] text-slate">Nothing recorded for this account yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {history.map((entry) => (
              <li key={entry.id} className="py-3">
                <p className="text-[16px] font-semibold">{entry.action}</p>
                <p className="text-[15px] text-slate">{entry.reason}</p>
                <p className="mt-1 text-base text-slate tabular-nums">
                  {formatDate(entry.at)} · {entry.actor}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {action ? (
        <ReasonDialog
          title={action.title}
          account={account}
          onCancel={() => setAction(null)}
          onConfirm={(reason) => {
            setStatus(account.id, action.status, reason);
            toast.success(`${account.businessName}, ${SUBSCRIPTION_LABELS[action.status]}`);
            setAction(null);
          }}
        />
      ) : null}
    </div>
  );
}
