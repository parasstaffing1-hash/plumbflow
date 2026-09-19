import { CalendarPlus, MessageSquare, Phone, Receipt, TriangleAlert, X } from "lucide-react";

export function EmergencyStrip({
  count,
  name,
  phone,
  summary,
  onSendCallOutQuote,
  onSchedule,
  onDecline,
}: {
  count: number;
  name: string;
  phone: string;
  summary: string;
  onSendCallOutQuote?: () => void;
  onSchedule?: () => void;
  onDecline?: () => void;
}) {
  if (count < 1) return null;

  return (
    <div className="bg-emergency px-4 py-3 text-paper">
      <div className="flex items-center gap-2 text-[15px] font-bold tracking-widest uppercase">
        <TriangleAlert className="size-4" aria-hidden />
        {count} emergency {count === 1 ? "job" : "jobs"}
      </div>
      <p className="mt-1 text-lg font-semibold">{name}</p>
      <p className="text-base opacity-90">{summary}</p>

      <a
        href={`tel:${phone}`}
        className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-paper text-lg font-semibold text-emergency"
      >
        <Phone className="size-5" aria-hidden />
        Call now
      </a>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {onSendCallOutQuote ? (
          <button
            type="button"
            onClick={onSendCallOutQuote}
            className="tap flex items-center justify-center gap-2 rounded-xl bg-amber text-base font-bold text-ink"
          >
            <Receipt className="size-5" aria-hidden /> Call-out quote
          </button>
        ) : null}
        <a
          href={`sms:${phone}`}
          className="tap flex items-center justify-center gap-2 rounded-xl border border-paper/60 text-base font-semibold text-paper"
        >
          <MessageSquare className="size-5" aria-hidden /> Message
        </a>
        {onSchedule ? (
          <button
            type="button"
            onClick={onSchedule}
            className="tap flex items-center justify-center gap-2 rounded-xl border border-paper/60 text-base font-semibold text-paper"
          >
            <CalendarPlus className="size-5" aria-hidden /> Schedule
          </button>
        ) : null}
        {onDecline ? (
          <button
            type="button"
            onClick={onDecline}
            className="tap flex items-center justify-center gap-2 rounded-xl border border-paper/60 text-base font-semibold text-paper"
          >
            <X className="size-5" aria-hidden /> Decline
          </button>
        ) : null}
      </div>
    </div>
  );
}
