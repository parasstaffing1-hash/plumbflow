import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/domain";

/** Red is never used here, emergency red belongs to emergency jobs only. */
const TONES: Record<string, string> = {
  // neutral / inactive
  draft: "bg-surface text-slate border border-line",
  ready_to_book: "bg-surface text-slate border border-line",
  cancelled: "bg-surface text-fog border border-line",
  declined: "bg-surface text-slate border border-line",
  expired: "bg-surface text-fog border border-line",
  superseded: "bg-surface text-fog border border-line",
  written_off: "bg-surface text-fog border border-line",
  credited: "bg-surface text-fog border border-line",
  open: "bg-surface text-slate border border-line",
  // in-flight / attention (amber)
  new: "bg-ink text-paper border border-ink",
  needs_contact: "bg-amber-wash text-amber-deep border border-amber",
  awaiting_customer: "bg-amber-wash text-amber-deep border border-amber",
  qualified: "bg-amber-wash text-amber-deep border border-amber",
  quoted: "bg-amber-wash text-amber-deep border border-amber",
  approval_required: "bg-amber-wash text-amber-deep border border-amber-deep",
  sent: "bg-amber-wash text-amber-deep border border-amber",
  viewed: "bg-amber-wash text-amber-deep border border-amber",
  booked: "bg-surface text-slate border border-line",
  en_route: "bg-amber-wash text-amber-deep border border-amber",
  on_site: "bg-amber text-ink border border-amber-deep",
  in_progress: "bg-amber text-ink border border-amber-deep",
  awaiting_close_out: "bg-amber-wash text-amber-deep border border-amber-deep",
  return_required: "bg-amber-wash text-amber-deep border border-amber-deep",
  issued: "bg-amber-wash text-amber-deep border border-amber",
  part_paid: "bg-amber-wash text-amber-deep border border-amber",
  overdue: "bg-amber-wash text-amber-deep border border-amber-deep",
  disputed: "bg-amber-wash text-amber-deep border border-amber-deep",
  payment_plan: "bg-amber-wash text-amber-deep border border-amber",
  waiting: "bg-amber-wash text-amber-deep border border-amber",
  monitoring: "bg-amber-wash text-amber-deep border border-amber",
  due: "bg-amber text-ink border border-amber-deep",
  pending: "bg-amber-wash text-amber-deep border border-amber-deep",
  // done (green)
  complete: "bg-go-wash text-go border border-go/30",
  accepted: "bg-go-wash text-go border border-go/30",
  converted: "bg-go-wash text-go border border-go/30",
  paid: "bg-go-wash text-go border border-go/30",
  approved: "bg-go-wash text-go border border-go/30",
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[15px] font-semibold whitespace-nowrap",
        TONES[status] ?? "bg-surface text-slate border border-line",
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
