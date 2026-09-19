import { CloudOff } from "lucide-react";
import { useSyncQueue } from "@/hooks/useSyncQueue";

/** B5, persistent, unobtrusive queue indicator. Nothing is ever discarded. */
export function OfflineIndicator() {
  const { online, queue } = useSyncQueue();
  if (online && queue.length === 0) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-fit max-w-[92vw] rounded-full bg-ink px-4 py-2 text-[15px] font-semibold text-paper shadow-[var(--shadow-lift)]"
    >
      <span className="flex items-center gap-2">
        <CloudOff className="size-4 text-amber" aria-hidden />
        {online ? "Syncing" : "Offline"}
        {queue.length > 0
          ? `, ${queue.length} change${queue.length === 1 ? "" : "s"} waiting to sync`
          : ", working from cached jobs"}
      </span>
    </div>
  );
}
