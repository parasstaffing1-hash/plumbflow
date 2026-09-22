import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import {
  FileText,
  Download,
  Mail,
  CheckCircle,
  XCircle,
  Mic,
  Lock,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface VoiceInvoiceRecord {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  currency: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: "unpaid" | "partially_paid" | "paid";
  notes: string;
  pdfUrl: string;
  emailSent: boolean;
  createdAt: string;
}

type VoiceInvoiceStatus = VoiceInvoiceRecord["status"];

const VOICE_INVOICE_STATUSES: VoiceInvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
];

const VOICE_STATUS_LABELS: Record<VoiceInvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const Route = createFileRoute("/app/voice-invoices")({
  head: () => ({
    meta: [
      { title: "Voice Invoices | RCH PlumbFlow" },
      {
        name: "description",
        content: "Invoices created via voice commands.",
      },
      { property: "og:title", content: "Voice Invoices | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Invoices created via voice commands.",
      },
      { property: "og:url", content: "/voice-invoices" },
    ],
    links: [{ rel: "canonical", href: "/voice-invoices" }],
  }),
  component: VoiceInvoices,
});

function VoiceInvoices() {
  const { can } = useStore();
  const [invoices, setInvoices] = useState<VoiceInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VoiceInvoiceStatus | "">("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/voice-invoices")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch voice invoices");
        return res.json();
      })
      .then((data: VoiceInvoiceRecord[]) => {
        if (!cancelled) setInvoices(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load voice invoices");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!can.seeMoney) {
    return (
      <div>
        <PageHeader title="Voice Invoices" subtitle="Restricted" />
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

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalOutstanding = invoices
    .filter((inv) => !["paid", "cancelled"].includes(inv.status))
    .reduce((sum, inv) => sum + inv.total, 0);

  const list = invoices
    .filter((inv) => (filter ? inv.status === filter : true))
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  async function handleAction(
    invoiceNumber: string,
    action: "mark-paid" | "cancel",
    label: string,
  ) {
    setActionLoading(`${invoiceNumber}-${action}`);
    try {
      const res = await fetch(`/api/voice-invoices/${invoiceNumber}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.invoiceNumber !== invoiceNumber) return inv;
          if (action === "mark-paid") return { ...inv, status: "paid" as const, paymentStatus: "paid" as const };
          return { ...inv, status: "cancelled" as const };
        }),
      );
      toast.success(`${label} — ${invoiceNumber}`);
    } catch {
      toast.error(`Failed to ${label.toLowerCase()} ${invoiceNumber}`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Voice Invoices"
        subtitle="Created via voice commands"
        action={
          <Link
            to="/app/money"
            className="tap inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1.5 text-sm font-semibold text-paper"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Money
          </Link>
        }
      />
      <main className="space-y-4 px-4 py-5">
        {/* Summary hero card */}
        <div className="rounded-2xl bg-ink p-5 text-paper shadow-[var(--shadow-card)]">
          <p className="label-caps">Total invoiced</p>
          <p className="tabular mt-1 text-4xl font-semibold">{formatCurrency(totalInvoiced)}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-wash px-3 py-1.5 text-base font-semibold text-amber-deep">
            <FileText className="size-4" aria-hidden />
            {invoices.length} voice {invoices.length === 1 ? "invoice" : "invoices"} created
          </p>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Outstanding" value={totalOutstanding} />
          <SummaryCard label="Paid" value={totalPaid} />
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-paper px-6 py-10 text-center">
            <Loader2 className="size-8 animate-spin text-amber-deep" aria-hidden />
            <p className="mt-3 text-base text-slate">Loading voice invoices…</p>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Mic}
            title="No voice invoices yet"
            description="Invoices created via voice commands will appear here."
          />
        ) : (
          <>
            {/* Filter */}
            <label className="sr-only" htmlFor="voice-invoice-filter">
              Filter voice invoices
            </label>
            <select
              id="voice-invoice-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value as VoiceInvoiceStatus | "")}
              className="tap w-full rounded-xl border border-line bg-paper px-3 text-base text-ink"
            >
              <option value="">All invoices</option>
              {VOICE_INVOICE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {VOICE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            {/* Invoice list */}
            <div className="space-y-3">
              {list.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No invoices with that status"
                  description="Clear the filter to see every voice invoice."
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
              {list.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="tabular label-caps">{invoice.invoiceNumber}</p>
                      <p className="mt-1 truncate text-lg font-semibold text-ink">
                        {invoice.customerName}
                      </p>
                    </div>
                    <StatusChip status={invoice.status} />
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-base text-fog">Issued {formatDate(invoice.issueDate)}</p>
                      <p className="text-base text-fog">Due {formatDate(invoice.dueDate)}</p>
                      <p className="text-sm text-slate">
                        {invoice.items.length} {invoice.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <p className="tabular text-xl font-semibold text-ink">
                      {formatCurrency(invoice.total)}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    {invoice.pdfUrl ? (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tap inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-sm font-semibold text-ink"
                      >
                        <Download className="size-3.5" aria-hidden />
                        PDF
                      </a>
                    ) : null}

                    <a
                      href={`mailto:${invoice.customerEmail}?subject=Invoice ${invoice.invoiceNumber}`}
                      className="tap inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-sm font-semibold text-ink"
                    >
                      <Mail className="size-3.5" aria-hidden />
                      Email
                    </a>

                    {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
                      <button
                        type="button"
                        disabled={actionLoading === `${invoice.invoiceNumber}-mark-paid`}
                        onClick={() =>
                          handleAction(invoice.invoiceNumber, "mark-paid", "Marked paid")
                        }
                        className="tap inline-flex items-center gap-1.5 rounded-full bg-go-wash px-3 py-1 text-sm font-semibold text-go"
                      >
                        <CheckCircle className="size-3.5" aria-hidden />
                        Mark Paid
                      </button>
                    ) : null}

                    {invoice.status !== "cancelled" && invoice.status !== "paid" ? (
                      <button
                        type="button"
                        disabled={actionLoading === `${invoice.invoiceNumber}-cancel`}
                        onClick={() =>
                          handleAction(invoice.invoiceNumber, "cancel", "Cancelled")
                        }
                        className="tap inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-sm font-semibold text-fog"
                      >
                        <XCircle className="size-3.5" aria-hidden />
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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
