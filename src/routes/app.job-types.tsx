import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/app/job-types")({
  head: () => ({
    meta: [
      { title: "Job types | RCH PlumbFlow" },
      {
        name: "description",
        content: "Job types and the photo evidence each one needs before completion.",
      },
      { property: "og:title", content: "Job types | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Job types and the photo evidence each one needs before completion.",
      },
      { property: "og:url", content: "/job-types" },
    ],
    links: [{ rel: "canonical", href: "/job-types" }],
  }),
  component: JobTypes,
});

function JobTypes() {
  const { data } = useStore();

  return (
    <div>
      <PageHeader title="Job types" subtitle="Evidence each job type needs on site" />
      <main className="space-y-3 px-4 py-5">
        {data.jobTypes.map((type) => {
          const stages = [
            type.requiresBefore ? "Before" : null,
            type.requiresDuring ? "During" : null,
            type.requiresTesting ? "Testing" : null,
            type.requiresAfter ? "After" : null,
          ].filter(Boolean);
          return (
            <section key={type.id} className="rounded-2xl border border-line bg-paper p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">{type.name}</h2>
                <span className="tabular text-base text-fog">
                  {type.defaultDurationMinutes} min
                </span>
              </div>
              <p className="mt-1 text-base text-slate">
                {stages.length > 0 ? stages.join(", ") : "No photo stages required"}
              </p>
              <p className="mt-1 text-[15px] text-fog">
                {type.minPhotosPerRequiredStage} photo minimum per required stage
                {type.isActive ? "" : " · inactive"}
              </p>
              {type.notes ? <p className="mt-2 text-base text-slate">{type.notes}</p> : null}
            </section>
          );
        })}
      </main>
    </div>
  );
}
