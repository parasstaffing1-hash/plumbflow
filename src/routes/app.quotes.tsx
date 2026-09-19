import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { depositDue, quoteGross, type Quote } from "@/lib/domain";
import { Lock, Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/quotes")({
  head: () => ({
    meta: [
      { title: "Quotes | RCH PlumbFlow" },
      {
        name: "description",
        content: "Quotes with deposits on acceptance and locked pricing once accepted.",
      },
      { property: "og:title", content: "Quotes | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Quotes with deposits on acceptance and locked pricing once accepted.",
      },
      { property: "og:url", content: "/quotes" },
    ],
    links: [{ rel: "canonical", href: "/quotes" }],
  }),
  component: Quotes,
});

function Quotes() {
  const { data, can, setQuote, update, log, customer } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const vat = data.org.vatRate;

  function accept(quote: Quote) {
    const deposit = depositDue(quote, vat);
    const ok = window.confirm(
      `Accepting locks ${quote.quoteNumber}, no further edits.\n\nDeposit due: ${formatCurrency(deposit)} (${quote.depositPercentage}%).`,
    );
    if (!ok) return;
    setQuote(quote.id, { status: "accepted", lockedAt: new Date().toISOString() });
    log(
      "quote",
      quote.id,
      `Quote ${quote.quoteNumber} accepted and locked · deposit ${formatCurrency(deposit)}`,
    );
    toast.success("Quote accepted and locked");
  }

  function overrideDeposit(quote: Quote) {
    const entered = window.prompt(
      `Override the ${data.org.defaultDepositPercentage}% default deposit. New percentage:`,
      String(quote.depositPercentage),
    );
    if (entered === null) return;
    const percentage = Number(entered);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Enter a percentage between 0 and 100.");
      return;
    }
    const reason = window.prompt("Why is the deposit being changed?");
    if (!reason?.trim()) {
      toast.error("An override reason is required.");
      return;
    }
    update((draft) => {
      const row = draft.quotes.find((q) => q.id === quote.id);
      if (row) {
        row.depositPercentage = percentage;
        row.depositWaivedBy = reason.trim();
        row.depositWaivedAt = new Date().toISOString();
      }
      return draft;
    });
    log("quote", quote.id, `Deposit overridden to ${percentage}%: ${reason.trim()}`);
  }

  return (
    <div>
      <PageHeader title="Quotes" subtitle="Accepted quotes lock automatically" />
      <main className="space-y-3 px-4 py-5">
        {data.quotes.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No quotes yet"
            description="Quote an enquiry and it will appear here."
          />
        ) : (
          data.quotes.map((quote) => {
            const person = customer(quote.customerId);
            const open = openId === quote.id;
            return (
              <article
                key={quote.id}
                className="rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : quote.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="tabular label-caps">{quote.quoteNumber}</p>
                      <p className="mt-1 truncate text-lg font-semibold text-ink">{person?.name}</p>
                      <p className="text-base text-fog">
                        Valid until {formatDate(quote.validUntil)}
                      </p>
                    </div>
                    <StatusChip status={quote.status} />
                  </div>
                  <p className="tabular mt-2 text-xl font-semibold text-ink">
                    {formatCurrency(quoteGross(quote, vat))}
                  </p>
                </button>

                {open ? (
                  <div className="mt-3 border-t border-line pt-3">
                    <ul className="space-y-1">
                      {quote.lines.map((line) => (
                        <li
                          key={line.id}
                          className="flex items-start justify-between gap-3 text-base text-slate"
                        >
                          <span>
                            {line.quantity} × {line.description}
                          </span>
                          <span className="tabular">
                            {formatCurrency(line.quantity * line.unitPrice)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {can.seeMoney ? (
                      <p className="mt-3 rounded-xl bg-amber-wash p-3 text-base text-amber-deep">
                        Deposit on acceptance: {formatCurrency(depositDue(quote, vat))} (
                        {quote.depositPercentage}%)
                        {quote.depositWaivedBy ? ` · overridden: ${quote.depositWaivedBy}` : ""}
                      </p>
                    ) : null}

                    {quote.lockedAt ? (
                      <p className="mt-3 flex items-center gap-2 text-base text-fog">
                        <Lock className="size-4" aria-hidden />
                        Locked {formatDate(quote.lockedAt)}, raise a variation instead.
                      </p>
                    ) : can.canEdit ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => accept(quote)}
                          className="tap rounded-xl bg-amber text-base font-bold text-ink"
                        >
                          Mark accepted
                        </button>
                        <button
                          type="button"
                          onClick={() => overrideDeposit(quote)}
                          className="tap rounded-xl border border-line bg-surface text-base font-semibold text-ink"
                        >
                          Change deposit
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}
