import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { JobRow } from "@/components/JobRow";
import { EmptyState } from "@/components/EmptyState";
import { IMAGE_SLOTS } from "@/lib/image-slots";
import { ListScreen, type FilterChip, type SortOption } from "@/components/ListScreen";
import { useStore } from "@/lib/store";
import { STATUS_LABELS, type Job } from "@/lib/domain";
import { JobMapView } from "@/components/JobMapView";
import { List, Map, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/jobs/")({
  validateSearch: (search: Record<string, unknown>): { filter?: string } =>
    typeof search["filter"] === "string" ? { filter: search["filter"] } : {},
  head: () => ({
    meta: [
      { title: "Jobs | RCH PlumbFlow" },
      { name: "description", content: "Every scheduled, active and completed plumbing job." },
      { property: "og:title", content: "Jobs | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Every scheduled, active and completed plumbing job.",
      },
      { property: "og:url", content: "/jobs" },
    ],
    links: [{ rel: "canonical", href: "/jobs" }],
  }),
  component: Jobs,
});

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function Jobs() {
  const { data, can, currentUser, customer, property } = useStore();
  const { filter } = Route.useSearch();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const base = can.seeAllJobs
    ? data.jobs
    : data.jobs.filter((job) => job.assignedToId === currentUser.id);

  const today = startOfToday();
  const dayMs = 86_400_000;

  const filterChips: FilterChip<Job>[] = useMemo(
    () => [
      {
        id: "today",
        label: "Today",
        test: (job) => {
          const time = new Date(job.scheduledStart).getTime();
          return time >= today && time < today + dayMs && job.status !== "complete";
        },
      },
      {
        id: "week",
        label: "This week",
        test: (job) => {
          const time = new Date(job.scheduledStart).getTime();
          return time >= today && time < today + dayMs * 7 && job.status !== "complete";
        },
      },
      {
        id: "upcoming",
        label: "Upcoming",
        test: (job) =>
          new Date(job.scheduledStart).getTime() >= today + dayMs && job.status !== "complete",
      },
      { id: "emergency", label: "Emergency", test: (job) => job.isEmergency },
      { id: "complete", label: "Complete", test: (job) => job.status === "complete" },
    ],
    [today, dayMs],
  );

  const sortOptions: SortOption<Job>[] = useMemo(
    () => [
      {
        id: "date_asc",
        label: "Scheduled date, soonest first",
        compare: (a, b) => a.scheduledStart.localeCompare(b.scheduledStart),
      },
      {
        id: "date_desc",
        label: "Scheduled date, latest first",
        compare: (a, b) => b.scheduledStart.localeCompare(a.scheduledStart),
      },
      {
        id: "number",
        label: "Job number",
        compare: (a, b) => a.jobNumber.localeCompare(b.jobNumber),
      },
      {
        id: "status",
        label: "Status",
        compare: (a, b) =>
          (STATUS_LABELS[a.status] ?? a.status).localeCompare(STATUS_LABELS[b.status] ?? b.status),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Tap a job to work through it on site"
        action={
          <div className="flex rounded-xl border border-line/40 bg-paper/10 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "tap flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                viewMode === "list" ? "bg-paper text-ink shadow-sm" : "text-fog hover:text-paper",
              )}
            >
              <List className="size-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={cn(
                "tap flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                viewMode === "map" ? "bg-paper text-ink shadow-sm" : "text-fog hover:text-paper",
              )}
            >
              <Map className="size-3.5" />
              Map
            </button>
          </div>
        }
      />
      {viewMode === "map" ? (
        <div className="p-4">
          <JobMapView jobs={base} getCustomer={customer} getProperty={property} />
        </div>
      ) : (
        <ListScreen<Job>
          listId="jobs"
          initialFilterId={filter}
          items={base}
          noun="jobs"
          keyFor={(job) => job.id}
          searchFields={(job) => {
            const place = property(job.propertyId);
            return [
              job.jobNumber,
              job.title,
              job.reportedIssue,
              STATUS_LABELS[job.status],
              customer(job.customerId)?.name,
              customer(job.customerId)?.phone,
              place?.line1,
              place?.town,
              place?.postcode,
            ];
          }}
          filterChips={filterChips}
          sortOptions={sortOptions}
          renderRow={(job) => <JobRow job={job} />}
          emptyState={
            <EmptyState
              icon={Wrench}
              image={IMAGE_SLOTS.jobsEmpty}
              title="No jobs here yet"
              description="Completed jobs appear here once the completion gate passes."
            />
          }
        />
      )}
    </div>
  );
}
