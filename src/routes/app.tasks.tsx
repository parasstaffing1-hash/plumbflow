import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { VoiceField } from "@/components/VoiceField";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks | RCH PlumbFlow" },
      { name: "description", content: "Follow-ups, chases and reminders across the business." },
      { property: "og:title", content: "Tasks | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Follow-ups, chases and reminders across the business.",
      },
      { property: "og:url", content: "/tasks" },
    ],
    links: [{ rel: "canonical", href: "/tasks" }],
  }),
  component: Tasks,
});

function Tasks() {
  const { data, setTask, addTask, can } = useStore();
  const [draft, setDraft] = useState("");

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Nothing slips through" />
      <main className="space-y-4 px-4 py-5">
        {can.canEdit ? (
          <section className="rounded-2xl border border-line bg-paper p-4">
            <VoiceField
              label="New task"
              value={draft}
              onChange={setDraft}
              singleLine
              placeholder="Chase the Kettering deposit"
            />
            <button
              type="button"
              onClick={() => {
                if (!draft.trim()) {
                  toast.error("Give the task a title first.");
                  return;
                }
                addTask(draft.trim(), new Date().toISOString());
                setDraft("");
              }}
              className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber text-base font-bold text-ink"
            >
              <Plus className="size-5" aria-hidden />
              Add task
            </button>
          </section>
        ) : null}

        <div className="space-y-3">
          {data.tasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No tasks yet"
              description="Add a follow-up above so nothing gets forgotten."
            />
          ) : null}
          {data.tasks.map((task) => {
            const done = task.status === "complete";
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3"
              >
                <button
                  type="button"
                  aria-label={done ? "Reopen task" : "Complete task"}
                  onClick={() => setTask(task.id, { status: done ? "open" : "complete" })}
                  className="tap shrink-0"
                >
                  {done ? (
                    <CheckCircle2 className="size-6 text-go" aria-hidden />
                  ) : (
                    <Circle className="size-6 text-fog" aria-hidden />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={done ? "text-base text-fog line-through" : "text-base text-ink"}>
                    {task.title}
                  </p>
                  <p className="tabular text-[15px] text-fog">Due {formatDate(task.dueDate)}</p>
                </div>
                <StatusChip status={task.status} />
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
