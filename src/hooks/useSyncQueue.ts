import { useEffect, useState } from "react";

const QUEUE_KEY = "rch-plumbflow:sync-queue";

export interface QueuedChange {
  id: string;
  jobId: string;
  kind: "photo" | "note";
  label: string;
  queuedAt: string;
}

function read(): QueuedChange[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedChange[];
  } catch {
    return [];
  }
}

function write(queue: QueuedChange[]): void {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent("rch:queue"));
}

/** B5, queued changes are never discarded; they drain on reconnect. */
export function enqueueChange(change: Omit<QueuedChange, "id" | "queuedAt">): void {
  if (typeof window === "undefined" || navigator.onLine) return;
  write([
    ...read(),
    { ...change, id: Math.random().toString(36).slice(2), queuedAt: new Date().toISOString() },
  ]);
}

export function useSyncQueue() {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedChange[]>([]);

  useEffect(() => {
    const refresh = () => setQueue(read());
    const goOnline = () => {
      setOnline(true);
      // Reconnected: drain the queue. Changes are already applied locally.
      write([]);
    };
    const goOffline = () => setOnline(false);

    setOnline(navigator.onLine);
    refresh();
    window.addEventListener("rch:queue", refresh);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("rch:queue", refresh);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return { online, queue };
}
