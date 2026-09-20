import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Phone, Mail } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { RELATIONSHIP_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/app/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer | RCH PlumbFlow" },
      {
        name: "description",
        content: "Customer record, linked properties and their full job history.",
      },
      { property: "og:title", content: "Customer | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Customer record, linked properties and their full job history.",
      },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { data, can, property } = useStore();
  const customer = data.customers.find((row) => row.id === customerId);

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-base text-slate">That customer no longer exists.</p>
        <Link to="/app/customers" className="mt-3 inline-block font-semibold text-amber-deep">
          Back to customers
        </Link>
      </div>
    );
  }

  const links = data.customerProperties.filter((row) => row.customerId === customer.id);
  const jobs = data.jobs.filter((job) => job.customerId === customer.id);

  return (
    <div>
      <header className="bg-ink px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-5 text-paper">
        <Link
          to="/app/customers"
          className="tap -ml-2 inline-flex items-center gap-1 text-base text-fog"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Customers
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{customer.name}</h1>
        <p className="mt-1 text-base text-fog">
          {customer.kind === "landlord"
            ? "Landlord"
            : customer.kind === "commercial"
              ? "Commercial"
              : "Residential"}
          {customer.isAccountCustomer ? " · Account customer" : ""}
        </p>
      </header>

      <main className="space-y-5 px-4 py-5">
        {can.seeCustomerContact ? (
          <section className="grid grid-cols-2 gap-3">
            <a
              href={`tel:${customer.phone}`}
              className="tap flex items-center justify-center gap-2 rounded-xl bg-ink text-base font-semibold text-paper"
            >
              <Phone className="size-5" aria-hidden /> Call
            </a>
            <a
              href={`mailto:${customer.email}`}
              className="tap flex items-center justify-center gap-2 rounded-xl border border-line bg-paper text-base font-semibold text-ink"
            >
              <Mail className="size-5" aria-hidden /> Email
            </a>
          </section>
        ) : null}

        <section className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Properties</h2>
          <ul className="mt-3 space-y-3">
            {links.map((link) => {
              const place = property(link.propertyId);
              if (!place) return null;
              return (
                <li key={link.id} className="rounded-xl border border-line bg-surface p-3">
                  <p className="flex items-start gap-1.5 text-base font-semibold text-ink">
                    <MapPin className="mt-1 size-4 shrink-0 text-fog" aria-hidden />
                    {place.line1}, {place.town}, {place.postcode}
                  </p>
                  <p className="mt-1 text-base text-slate">
                    {RELATIONSHIP_LABELS[link.relationship]} · from {formatDate(link.startedOn)}
                    {link.endedOn ? ` to ${formatDate(link.endedOn)}` : " (current)"}
                  </p>
                </li>
              );
            })}
            {links.length === 0 ? (
              <li className="text-base text-fog">No properties linked yet.</li>
            ) : null}
          </ul>
          <p className="mt-3 text-[15px] text-fog">
            Properties keep their own history, job records stay with the address even when the
            occupier changes.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Job history</h2>
          <ul className="mt-3 space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  to="/app/jobs/$jobId"
                  params={{ jobId: job.id }}
                  className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface p-3"
                >
                  <div className="min-w-0">
                    <p className="tabular label-caps">{job.jobNumber}</p>
                    <p className="mt-1 truncate text-base font-semibold text-ink">{job.title}</p>
                    <p className="mt-1 text-base text-fog">{formatDate(job.scheduledStart)}</p>
                  </div>
                  <StatusChip status={job.status} />
                </Link>
              </li>
            ))}
            {jobs.length === 0 ? <li className="text-base text-fog">No jobs yet.</li> : null}
          </ul>
        </section>

        <ActivityTimeline entityType="customer" entityId={customer.id} />
      </main>
    </div>
  );
}
