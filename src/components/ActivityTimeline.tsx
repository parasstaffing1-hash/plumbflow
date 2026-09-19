import { History } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ActivityEntry } from "@/lib/domain";

function toCsv(entries: ActivityEntry[]): string {
  const rows = [["When", "What happened", "Who"]].concat(
    entries.map((entry) => [formatDateTime(entry.at), entry.message, entry.actor]),
  );
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

/** B7, plain-English audit trail. */
export function ActivityTimeline({
  entityType,
  entityId,
}: {
  entityType: ActivityEntry["entityType"];
  entityId: string;
}) {
  const { activityFor } = useStore();
  const entries = activityFor(entityType, entityId);

  function exportCsv() {
    const blob = new Blob([toCsv(entries)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-${entityType}-${entityId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-line bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="label-caps flex items-center gap-2">
          <History className="size-4" aria-hidden />
          History
        </h2>
        {entries.length > 0 ? (
          <button
            type="button"
            onClick={exportCsv}
            className="hidden text-base font-semibold text-amber-deep sm:block"
          >
            Export CSV
          </button>
        ) : null}
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-base text-fog">Nothing recorded yet.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="border-l-2 border-line pl-3">
              <p className="text-base text-ink">{entry.message}</p>
              <p className="tabular mt-0.5 text-[15px] text-fog">
                {formatDateTime(entry.at)} · {entry.actor}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
