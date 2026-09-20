import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, ArrowLeft, Lock, Send, PoundSterling } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import {
  invoiceBalance,
  invoiceGross,
  invoiceNet,
  invoicePaid,
  invoiceVat,
  lineTotal,
} from "@/lib/domain";
import { toast } from "sonner";

export const Route = createFileRoute("/app/invoices/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice | RCH PlumbFlow" },
      { name: "description", content: "Invoice lines, VAT, payments and outstanding balance." },
      { property: "og:title", content: "Invoice | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Invoice lines, VAT, payments and outstanding balance.",
      },
    ],
  }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { invoiceId } = Route.useParams();
  const { data, can, update, log, customer, property } = useStore();
  const invoice = data.invoices.find((row) => row.id === invoiceId);

  if (!can.seeMoney) {
    return (
      <div className="p-6">
        <p className="flex items-center gap-2 text-base text-slate">
          <Lock className="size-5 text-fog" aria-hidden />
          Invoices are limited to the owner and office admins.
        </p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <p className="text-base text-slate">That invoice no longer exists.</p>
        <Link to="/app/money" className="mt-3 inline-block font-semibold text-amber-deep">
          Back to money
        </Link>
      </div>
    );
  }

  const inv = invoice;
  const vat = data.org.vatRate;
  const person = customer(inv.customerId);
  const place = property(inv.propertyId);
  const balance = invoiceBalance(inv, vat);

  function issue() {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    update((draft) => {
      const row = draft.invoices.find((i) => i.id === inv.id);
      if (row) {
        row.status = "issued";
        row.issuedAt = new Date().toISOString();
        row.dueAt = due.toISOString();
      }
      return draft;
    });
    log("invoice", inv.id, `Invoice ${inv.invoiceNumber} issued to ${person?.name ?? ""}`);
    toast.success("Invoice issued");
  }

  function recordPayment() {
    const entered = window.prompt("Payment amount in £", balance.toFixed(2));
    if (entered === null) return;
    const amount = Number(entered);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a payment amount greater than zero.");
      return;
    }
    update((draft) => {
      const row = draft.invoices.find((i) => i.id === inv.id);
      if (!row) return draft;
      row.payments.push({
        id: Math.random().toString(36).slice(2),
        amount,
        paidAt: new Date().toISOString(),
        method: "bank_transfer",
      });
      const paid = row.payments.reduce((sum, payment) => sum + payment.amount, 0);
      row.status = paid + 0.005 >= invoiceGross(row, vat) ? "paid" : "part_paid";
      return draft;
    });
    log("invoice", inv.id, `Payment of ${formatCurrency(amount)} recorded`);
    toast.success(`Payment of ${formatCurrency(amount)} recorded`);
  }

  return (
    <div>
      <header className="bg-ink px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-5 text-paper">
        <Link
          to="/app/money"
          className="tap -ml-2 inline-flex items-center gap-1 text-base text-fog"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Money
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <p className="tabular label-caps">{invoice.invoiceNumber}</p>
            <h1 className="mt-1 text-2xl font-semibold">{person?.name}</h1>
          </div>
          <StatusChip status={invoice.status} />
        </div>
        {place ? (
          <p className="mt-1 text-base text-fog">
            {place.line1}, {place.town}, {place.postcode}
          </p>
        ) : null}
      </header>

      <main className="space-y-4 px-4 py-5">
        <section className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">From</h2>
          <p className="mt-2 text-lg font-semibold text-ink">{data.org.tradingName}</p>
          <p className="text-base text-slate">{data.org.town}</p>
          <p className="text-base text-slate">
            {data.org.phone} · {data.org.email}
          </p>
          {vat > 0 ? (
            <p className="text-base text-slate">VAT registered at {Math.round(vat * 100)}%</p>
          ) : (
            <p className="text-base text-slate">Not VAT registered</p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Lines</h2>
          <ul className="mt-3 space-y-2">
            {invoice.lines.map((line) => (
              <li key={line.id} className="flex items-start justify-between gap-3">
                <span className="text-base text-slate">
                  {line.quantity} × {line.description}
                </span>
                <span className="tabular text-base font-semibold text-ink">
                  {formatCurrency(lineTotal(line))}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-line pt-3">
            <Total label="Net" value={invoiceNet(invoice)} />
            {vat > 0 ? (
              <Total label={`VAT at ${Math.round(vat * 100)}%`} value={invoiceVat(invoice, vat)} />
            ) : null}
            <Total label="Gross" value={invoiceGross(invoice, vat)} strong />
            <Total label="Paid" value={invoicePaid(invoice)} />
            <Total label="Balance" value={balance} strong />
          </dl>
        </section>

        {invoice.payments.length > 0 ? (
          <section className="rounded-2xl border border-line bg-paper p-4">
            <h2 className="label-caps">Payments</h2>
            <ul className="mt-3 space-y-2">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3">
                  <span className="text-base text-slate">{formatDate(payment.paidAt)}</span>
                  <span className="tabular text-base font-semibold text-ink">
                    {formatCurrency(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => window.print()}
          className="tap no-print flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-paper text-lg font-semibold text-ink"
        >
          <Printer className="size-5" aria-hidden />
          Print or save as PDF
        </button>

        <ActivityTimeline entityType="invoice" entityId={invoice.id} />

        {can.canEdit ? (
          <div className="space-y-3">
            {invoice.status === "draft" ? (
              <button
                type="button"
                onClick={issue}
                className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-amber text-lg font-bold text-ink"
              >
                <Send className="size-5" aria-hidden />
                Issue invoice
              </button>
            ) : null}
            {invoice.status !== "draft" && balance > 0 ? (
              <button
                type="button"
                onClick={recordPayment}
                className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-ink text-lg font-semibold text-paper"
              >
                <PoundSterling className="size-5" aria-hidden />
                Record payment
              </button>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "text-base font-semibold text-ink" : "text-base text-slate"}>
        {label}
      </dt>
      <dd
        className={
          strong ? "tabular text-lg font-semibold text-ink" : "tabular text-base text-slate"
        }
      >
        {formatCurrency(value)}
      </dd>
    </div>
  );
}
