import { Link } from "@tanstack/react-router";
import { MapPin, TriangleAlert } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { formatTime } from "@/lib/format";
import type { Job } from "@/lib/domain";
import { useStore } from "@/lib/store";

export function JobRow({ job, isLate = false }: { job: Job; isLate?: boolean }) {
  const { customer, property, can } = useStore();
  const person = customer(job.customerId);
  const place = property(job.propertyId);

  return (
    <Link
      to="/app/jobs/$jobId"
      params={{ jobId: job.id }}
      className={
        isLate
          ? "block rounded-2xl border border-amber border-l-4 border-l-amber bg-amber-wash p-4 shadow-[var(--shadow-card)]"
          : "block rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tabular text-[15px] font-bold tracking-widest text-fog uppercase">
            {formatTime(job.scheduledStart)} · {job.jobNumber}
            {isLate ? <span className="text-amber-deep"> · running late</span> : null}
          </p>

          <p className="mt-1 truncate text-lg font-semibold text-ink">
            {can.seeCustomerContact ? (person?.name ?? "Customer") : job.title}
          </p>
        </div>
        <StatusChip status={job.status} />
      </div>
      <p className="mt-2 text-base text-slate">{job.title}</p>
      <p className="mt-2 flex items-center gap-1.5 text-base text-fog">
        <MapPin className="size-4 shrink-0" aria-hidden />
        <span className="truncate">
          {place ? `${place.line1}, ${place.town}, ${place.postcode}` : "Address not set"}
        </span>
      </p>
      {job.isEmergency ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emergency-wash px-2.5 py-1 text-[15px] font-bold tracking-wide text-emergency uppercase">
          <TriangleAlert className="size-4" aria-hidden />
          Emergency
        </p>
      ) : null}
    </Link>
  );
}
