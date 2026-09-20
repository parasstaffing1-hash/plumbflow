import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  usePlatform,
  SUBSCRIPTION_LABELS,
  type Account,
  type SubscriptionStatus,
} from "@/lib/platform";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = SubscriptionStatus | "all";

export const Route = createFileRoute("/owner/accounts/")({
  validateSearch: (search: Record<string, unknown>): { status?: StatusFilter } => {
    const value = search["status"];
    const allowed: StatusFilter[] = ["all", "trialing", "active", "past_due", "canceled", "comped"];
    return typeof value === "string" && allowed.includes(value as StatusFilter)
      ? { status: value as StatusFilter }
      : {};
  },
  component: AccountsList,
});

const FILTERS: StatusFilter[] = ["all", "trialing", "active", "past_due", "comped", "canceled"];

export function StatusPill({ status }: { status: SubscriptionStatus }) {
  const tones: Record<SubscriptionStatus, string> = {
    active: "bg-go-wash text-go border-go/30",
    comped: "bg-go-wash text-go border-go/30",
    trialing: "bg-amber-wash text-amber-deep border-amber",
    past_due: "bg-amber text-ink border-amber-deep",
    canceled: "bg-surface text-slate border-line",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[15px] font-semibold whitespace-nowrap",
        tones[status],
      )}
    >
      {SUBSCRIPTION_LABELS[status]}
    </span>
  );
}

function AccountsList() {
  const { data, setStatus } = usePlatform();
  const search = Route.useSearch();
  const [filter, setFilter] = useState<StatusFilter>(search.status ?? "all");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<{
    account: Account;
    status: SubscriptionStatus;
    title: string;
  } | null>(null);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.accounts.filter((account) => {
      if (filter !== "all" && account.subscriptionStatus !== filter) return false;
      if (!needle) return true;
      return (
        account.businessName.toLowerCase().includes(needle) ||
        account.ownerName.toLowerCase().includes(needle) ||
        account.email.toLowerCase().includes(needle)
      );
    });
  }, [data.accounts, filter, query]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Accounts</h1>
        <p className="mt-1 text-[16px] text-slate">
          {rows.length} of {data.accounts.length} businesses
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              "tap rounded-full border px-4 py-2 text-[15px] font-semibold",
              filter === option
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper text-slate",
            )}
          >
            {option === "all" ? "All" : SUBSCRIPTION_LABELS[option]}
          </button>
        ))}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or email"
          type="search"
          autoComplete="off"
          aria-label="Search accounts"
          className="tap w-full min-w-0 rounded-lg border border-line bg-paper px-3 py-2 text-[16px] sm:ml-auto sm:w-auto sm:min-w-[220px]"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((account) => (
          <article
            key={account.id}
            className="rounded-xl border border-line bg-paper p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to="/owner/accounts/$accountId"
                  params={{ accountId: account.id }}
                  className="flex min-h-11 items-center truncate text-[17px] font-semibold text-ink"
                >
                  {account.businessName}
                </Link>
                <p className="text-[15px] text-slate">
                  {account.town || "n/a"} {account.postcode}
                </p>
              </div>
              <StatusPill status={account.subscriptionStatus} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[15px]">
              <div>
                <dt className="label-caps">Owner</dt>
                <dd className="truncate text-ink">{account.ownerName}</dd>
              </div>
              <div>
                <dt className="label-caps">Signed up</dt>
                <dd className="tabular-nums text-ink">{formatDate(account.signupDate)}</dd>
              </div>
              <div>
                <dt className="label-caps">Jobs done</dt>
                <dd className="tabular-nums text-ink">{account.jobsCompleted}</dd>
              </div>
              <div>
                <dt className="label-caps">Last active</dt>
                <dd className="tabular-nums text-ink">{formatDate(account.lastActiveAt)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/owner/accounts/$accountId"
                params={{ accountId: account.id }}
                className="tap flex items-center rounded-lg border border-line px-4 text-[15px] font-semibold"
              >
                View
              </Link>
              {account.subscriptionStatus !== "comped" ? (
                <button
                  type="button"
                  onClick={() =>
                    setAction({ account, status: "comped", title: "Comp this account" })
                  }
                  className="tap rounded-lg border border-line px-4 text-[15px] font-semibold"
                >
                  Comp
                </button>
              ) : null}
              {account.subscriptionStatus !== "canceled" ? (
                <button
                  type="button"
                  onClick={() =>
                    setAction({ account, status: "canceled", title: "Suspend access" })
                  }
                  className="tap rounded-lg border border-line px-4 text-[15px] font-semibold"
                >
                  Suspend
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAction({ account, status: "active", title: "Restore access" })}
                  className="tap rounded-lg border border-line px-4 text-[15px] font-semibold"
                >
                  Restore
                </button>
              )}
            </div>
          </article>
        ))}
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-paper px-4 py-10 text-center">
            <p className="text-[16px] font-semibold text-ink">No accounts match that</p>
            <p className="mt-1 text-[15px] text-slate">Clear the search or choose All.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="tap mt-4 rounded-lg border border-line px-4 text-[15px] font-semibold"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-line bg-paper shadow-card md:block">
        <table className="w-full min-w-[900px] text-left text-[15px]">
          <thead className="border-b border-line bg-surface">
            <tr className="label-caps text-slate">
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Signed up</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Jobs done</th>
              <th className="px-4 py-3">Last active</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((account) => (
              <tr key={account.id}>
                <td className="px-4 py-3">
                  <Link
                    to="/owner/accounts/$accountId"
                    params={{ accountId: account.id }}
                    className="inline-flex min-h-11 items-center font-semibold text-ink hover:text-amber-deep"
                  >
                    {account.businessName}
                  </Link>
                  <div className="text-base text-slate">{account.town || "n/a"}</div>
                </td>
                <td className="px-4 py-3">
                  {account.ownerName}
                  <div className="text-base text-slate">{account.email}</div>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatDate(account.signupDate)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={account.subscriptionStatus} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{account.jobsCompleted}</td>
                <td className="px-4 py-3 tabular-nums">{formatDate(account.lastActiveAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/owner/accounts/$accountId"
                      params={{ accountId: account.id }}
                      className="rounded-lg border border-line px-3 py-1.5 text-base font-semibold"
                    >
                      View
                    </Link>
                    {account.subscriptionStatus !== "comped" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setAction({ account, status: "comped", title: "Comp this account" })
                        }
                        className="rounded-lg border border-line px-3 py-1.5 text-base font-semibold"
                      >
                        Comp
                      </button>
                    ) : null}
                    {account.subscriptionStatus !== "canceled" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setAction({ account, status: "canceled", title: "Suspend access" })
                        }
                        className="rounded-lg border border-line px-3 py-1.5 text-base font-semibold"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setAction({ account, status: "active", title: "Restore access" })
                        }
                        className="rounded-lg border border-line px-3 py-1.5 text-base font-semibold"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate">
                  No accounts match that.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {action ? (
        <ReasonDialog
          title={action.title}
          account={action.account}
          onCancel={() => setAction(null)}
          onConfirm={(reason) => {
            setStatus(action.account.id, action.status, reason);
            toast.success(`${action.account.businessName}, ${SUBSCRIPTION_LABELS[action.status]}`);
            setAction(null);
          }}
        />
      ) : null}
    </div>
  );
}

export function ReasonDialog({
  title,
  account,
  onCancel,
  onConfirm,
}: {
  title: string;
  account: Account;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-paper p-5 shadow-lift">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-[15px] text-slate">{account.businessName}</p>
        <label className="mt-4 block">
          <span className="label-caps text-slate">Reason (written to the audit log)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={400}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[16px]"
          />
          <span className="mt-1 block text-base text-slate">At least 10 characters.</span>
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="tap flex-1 rounded-xl border border-line px-4 py-3 font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onConfirm(reason.trim())}
            className="tap flex-1 rounded-xl bg-amber px-4 py-3 font-semibold text-ink disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
