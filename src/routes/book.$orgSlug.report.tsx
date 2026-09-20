import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useTenant } from "@/lib/tenant-context";
import { ReportForm } from "@/components/homeowner/ReportForm";

type ReportSearch = Record<string, string>;

export const Route = createFileRoute("/book/$orgSlug/report")({
  validateSearch: (search: Record<string, unknown>): ReportSearch => {
    const next: Record<string, string> = {};
    for (const key of ["problem", "postcode", "phone", "town", "service"]) {
      const value = search[key];
      if (typeof value === "string" && value) next[key] = value;
    }
    return next;
  },
  head: () => ({
    meta: [
      { title: "Tell us what has gone wrong" },
      {
        name: "description",
        content: "Send your local plumber the details and get a call back with a price.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Tell us what has gone wrong" },
      {
        property: "og:description",
        content: "Send your local plumber the details and get a call back with a price.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { orgSlug } = useParams({ from: "/book/$orgSlug/report" });
  const search = Route.useSearch();
  const { tenant, setEmergency } = useTenant();
  const navigate = useNavigate();
  const firstName =
    tenant.account.ownerName?.trim().split(" ")[0] || tenant.account.businessName || "us";

  return (
    <main className="px-4 py-7">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Tell {firstName} what has gone wrong
        </h1>
        <p className="mt-2 text-lg text-slate">
          It takes a minute. We call you back with a price before we come out.
        </p>
        <div className="mt-6">
          <ReportForm
            tenant={tenant}
            initial={{
              problem: search["problem"] ?? "",
              postcode: search["postcode"] ?? "",
              phone: search["phone"] ?? "",
              town: search["town"] ?? "",
              service: search["service"] ?? "",
            }}
            onEmergencyChange={setEmergency}
            onSent={(reference) =>
              void navigate({
                to: "/book/$orgSlug/sent/$ref",
                params: { orgSlug, ref: reference },
              })
            }
          />
        </div>
      </div>
    </main>
  );
}
