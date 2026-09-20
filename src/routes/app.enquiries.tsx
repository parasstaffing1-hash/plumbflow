import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import { ENQUIRY_STATUSES, STATUS_LABELS, type EnquiryStatus } from "@/lib/domain";
import { CalendarPlus, Inbox, MessageSquare, Phone, Receipt, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/enquiries")({
  head: () => ({
    meta: [
      { title: "Enquiries | RCH PlumbFlow" },
      {
        name: "description",
        content: "Every incoming enquiry, triaged by urgency with emergency actions first.",
      },
      { property: "og:title", content: "Enquiries | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Every incoming enquiry, triaged by urgency with emergency actions first.",
      },
      { property: "og:url", content: "/enquiries" },
    ],
    links: [{ rel: "canonical", href: "/enquiries" }],
  }),
  component: Enquiries,
});

function Enquiries() {
  const { data, setEnquiry, log, can, addQuote } = useStore();
  const [filter, setFilter] = useState<EnquiryStatus | "">("");

  const list = data.enquiries
    .filter((enquiry) => (filter ? enquiry.status === filter : true))
    .sort((a, b) => Number(b.isEmergency) - Number(a.isEmergency));

  function move(id: string, status: EnquiryStatus, message: string) {
    setEnquiry(id, { status });
    log("enquiry", id, message);
    toast.success(message);
  }

  /** One tap: draft a quote pre-filled with the minimum call-out charge. */
  function sendCallOutQuote(enquiry: (typeof data.enquiries)[number]) {
    const callOut =
      data.priceBook.find((item) => item.id === data.org.minimumCalloutItemId) ??
      data.priceBook.find((item) => item.code === "CALL-MIN");
    if (!enquiry.customerId || !enquiry.propertyId || !callOut) {
      move(enquiry.id, "quoted", `Call-out quote sent to ${enquiry.contactName}`);
      return;
    }
    const quote = addQuote({
      customerId: enquiry.customerId,
      propertyId: enquiry.propertyId,
      enquiryId: enquiry.id,
      jobTypeId: enquiry.jobTypeId,
      status: "sent",
      lines: [
        {
          id: `ql_${enquiry.id}`,
          description: callOut.name,
          quantity: 1,
          unitPrice: callOut.unitPrice,
          isVatable: callOut.isVatable,
        },
      ],
      depositRule: data.org.defaultDepositRule,
      depositPercentage: data.org.defaultDepositPercentage,
      depositFixedAmount: 0,
      stagePayments: [],
      lockedAt: null,
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    setEnquiry(enquiry.id, { status: "quoted" });
    log(
      "enquiry",
      enquiry.id,
      `Call-out quote ${quote.quoteNumber} sent to ${enquiry.contactName}`,
    );
    toast.success(`${quote.quoteNumber} sent, ${callOut.name}`);
  }

  return (
    <div>
      <PageHeader title="Enquiries" subtitle="Triage fast, emergencies first" />
      <div className="flex gap-2 overflow-x-auto bg-ink px-4 pb-4">
        <button
          type="button"
          onClick={() => setFilter("")}
          className={cn(
            "tap rounded-full px-4 text-base font-semibold whitespace-nowrap",
            filter === "" ? "bg-amber text-ink" : "bg-ink-soft text-fog",
          )}
        >
          All
        </button>
        {ENQUIRY_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={cn(
              "tap rounded-full px-4 text-base font-semibold whitespace-nowrap",
              filter === status ? "bg-amber text-ink" : "bg-ink-soft text-fog",
            )}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <main className="space-y-3 px-4 py-5">
        {list.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={filter ? "Nothing with that status" : "Nothing to triage"}
            description={
              filter
                ? "Clear the filter to see every enquiry that has come in."
                : "New calls, forms and messages land here."
            }
            action={
              filter ? (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  className="tap w-full rounded-xl bg-amber text-base font-bold text-ink"
                >
                  Show all enquiries
                </button>
              ) : null
            }
          />
        ) : (
          list.map((enquiry) => (
            <article
              key={enquiry.id}
              className={cn(
                "rounded-2xl border bg-paper p-4 shadow-[var(--shadow-card)]",
                enquiry.isEmergency ? "border-emergency" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="tabular label-caps">
                    {enquiry.reference} · {formatDateTime(enquiry.receivedAt)}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-ink">{enquiry.contactName}</p>
                  <p className="text-base text-fog">{enquiry.rawAddress}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {enquiry.source === "web" ? (
                    <span className="rounded-lg bg-amber px-2.5 py-1 text-[15px] font-bold tracking-wide text-ink uppercase">
                      New | web
                    </span>
                  ) : null}
                  <StatusChip status={enquiry.status} />
                </div>
              </div>

              {enquiry.isEmergency ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emergency px-2.5 py-1 text-[15px] font-bold tracking-wide text-white uppercase">
                  <TriangleAlert className="size-4" aria-hidden />
                  Emergency
                </p>
              ) : null}

              <p className="mt-3 text-base text-slate">{enquiry.description}</p>

              {enquiry.photos?.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {enquiry.photos.map((photo) => (
                    <li key={photo.id}>
                      <img
                        src={photo.dataUrl}
                        alt="Photo sent by the customer"
                        className="size-20 rounded-xl border border-line object-cover"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              {can.canEdit ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${enquiry.phone}`}
                    onClick={() => move(enquiry.id, "qualified", `Called ${enquiry.contactName}`)}
                    className="tap flex items-center justify-center gap-2 rounded-xl bg-ink text-base font-semibold text-paper"
                  >
                    <Phone className="size-5" aria-hidden /> Call
                  </a>
                  <a
                    href={`sms:${enquiry.phone}`}
                    className="tap flex items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-semibold text-ink"
                  >
                    <MessageSquare className="size-5" aria-hidden /> Message
                  </a>
                  <button
                    type="button"
                    onClick={() => sendCallOutQuote(enquiry)}
                    className="tap flex items-center justify-center gap-2 rounded-xl bg-amber text-base font-bold text-ink"
                  >
                    <Receipt className="size-5" aria-hidden /> Send call-out quote
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      move(enquiry.id, "converted", `Enquiry ${enquiry.reference} scheduled`)
                    }
                    className="tap flex items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-semibold text-ink"
                  >
                    <CalendarPlus className="size-5" aria-hidden /> Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt(
                        "Why are you declining this enquiry? At least 10 characters.",
                      );
                      if (reason === null) return;
                      if (reason.trim().length < 10) {
                        toast.error("Give a reason of at least 10 characters.");
                        return;
                      }
                      setEnquiry(enquiry.id, { status: "declined", declineReason: reason.trim() });
                      log("enquiry", enquiry.id, `Enquiry declined: ${reason.trim()}`);
                      toast.success(`${enquiry.reference} declined`);
                    }}
                    className="tap col-span-2 flex items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-semibold text-slate"
                  >
                    <X className="size-5" aria-hidden /> Decline
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </main>
    </div>
  );
}
