import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { IMAGE_SLOTS } from "@/lib/image-slots";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import {
  INVOICE_STATUSES,
  STATUS_LABELS,
  invoiceBalance,
  invoiceGross,
  invoicePaid,
  type InvoiceStatus,
} from "@/lib/domain";
import { Lock, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/app/money")({
  head: () => ({
    meta: [
      { title: "Money | RCH PlumbFlow" },
      {
        name: "description",
        content: "Invoices, payments, outstanding balances and overdue totals.",
      },
      { property: "og:title", content: "Money | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Invoices, payments, outstanding balances and overdue totals.",
      },
      { property: "og:url", content: "/money" },
    ],
    links: [{ rel: "canonical", href: "/money" }],
  }),
  component: Money,
});

function Money() {
  const { data, can, customer } = useStore();
  const [filter, setFilter] = useState<InvoiceStatus | "">("");

  if (!can.seeMoney) {
    return (
      <div>
        <PageHeader title="Money" subtitle="Restricted" />
        <main className="px-4 py-5">
          <EmptyState
            icon={Lock}
            title="Not available for your role"
            description="Financial information is limited to the owner and office admins."
          />
        </main>
      </div>
    );
  }

  const vat = data.org.vatRate;
  const open = data.invoices.filter(
    (invoice) => !["paid", "written_off", "credited", "draft"].includes(invoice.status),
  );
  const outstanding = open.reduce((sum, invoice) => sum + invoiceBalance(invoice, vat), 0);
  const overdue = data.invoices.filter((invoice) => invoice.status === "overdue");
  const overdueValue = overdue.reduce((sum, invoice) => sum + invoiceBalance(invoice, vat), 0);
  const received = data.invoices.reduce((sum, invoice) => sum + invoicePaid(invoice), 0);

  const now = Date.now();
  const overdueDays = (due: string | null) =>
    due ? Math.max(0, Math.floor((now - new Date(due).getTime()) / 86_400_000)) : 0;

  const list = data.invoices
    .filter((invoice) => (filter ? invoice.status === filter : true))
    .slice()
    .sort((a, b) => {
      const diff = overdueDays(b.dueAt) - overdueDays(a.dueAt);
      if (diff !== 0) return diff;
      const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (dueA !== dueB) return dueA - dueB;
      return a.invoiceNumber.localeCompare(b.invoiceNumber);
    });

  return (
    <div>
      <PageHeader title="Money" subtitle="Invoices, payments and totals" />
      <main className="space-y-4 px-4 py-5">
        <div className="rounded-2xl bg-ink p-5 text-paper shadow-[var(--shadow-card)]">
          <p className="label-caps">Total outstanding</p>
          <p className="tabular mt-1 text-4xl font-semibold">{formatCurrency(outstanding)}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-wash px-3 py-1.5 text-base font-semibold text-amber-deep">
            <TriangleAlert className="size-4" aria-hidden />
            {formatCurrency(overdueValue)} overdue across {overdue.length} invoices
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Payments received" value={received} />
          <SummaryCard
            label="Invoiced total"
            value={data.invoices.reduce((sum, invoice) => sum + invoiceGross(invoice, vat), 0)}
          />
        </div>

        {open.length === 0 ? (
          <EmptyState
            icon={Lock}
            image={IMAGE_SLOTS.invoicesEmpty}
            title="All clear"
            description="You have no outstanding invoices."
          />
        ) : null}

        <label className="sr-only" htmlFor="invoice-filter">
          Filter invoices
        </label>
        <select
          id="invoice-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value as InvoiceStatus | "")}
          className="tap w-full rounded-xl border border-line bg-paper px-3 text-base text-ink"
        >
          <option value="">All invoices</option>
          {INVOICE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <div className="space-y-3">
          {list.length === 0 ? (
            <EmptyState
              icon={Lock}
              title="No invoices with that status"
              description="Clear the filter to see every invoice raised so far."
              action={
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  className="tap w-full rounded-xl bg-amber text-base font-bold text-ink"
                >
                  Show all invoices
                </button>
              }
            />
          ) : null}
          {list.map((invoice) => {
            const person = customer(invoice.customerId);
            return (
              <Link
                key={invoice.id}
                to="/app/invoices/$invoiceId"
                params={{ invoiceId: invoice.id }}
                className="block rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="tabular label-caps">{invoice.invoiceNumber}</p>
                    <p className="mt-1 truncate text-lg font-semibold text-ink">{person?.name}</p>
                  </div>
                  <StatusChip status={invoice.status} />
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-base text-fog">Due {formatDate(invoice.dueAt)}</p>
                  <p className="tabular text-xl font-semibold text-ink">
                    {formatCurrency(invoiceBalance(invoice, vat))}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]">
      <p className="label-caps">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-ink">{formatCurrency(value)}</p>
    </div>
  );
}
