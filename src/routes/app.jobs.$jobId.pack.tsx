import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import { usePlatform } from "@/lib/platform";
import { STAGE_LABELS, type EvidenceStage } from "@/lib/domain";

const ORDER: EvidenceStage[] = ["before", "during", "testing", "after"];

export const Route = createFileRoute("/app/jobs/$jobId/pack")({
  head: () => ({
    meta: [
      { title: "Completion pack | RCH PlumbFlow" },
      {
        name: "description",
        content: "The customer completion pack: scope, evidence, tests, variations and sign-off.",
      },
      { property: "og:title", content: "Completion pack | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "The customer completion pack: scope, evidence, tests, variations and sign-off.",
      },
    ],
  }),
  component: Pack,
});

function Pack() {
  const { jobId } = Route.useParams();
  const { data, customer, property, jobType, variationsFor } = useStore();
  const { currentAccount } = usePlatform();
  const job = data.jobs.find((row) => row.id === jobId);

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-base text-slate">That job no longer exists.</p>
        <Link to="/app/jobs" className="mt-3 inline-block font-semibold text-amber-deep">
          Back to jobs
        </Link>
      </div>
    );
  }

  const person = customer(job.customerId);
  const place = property(job.propertyId);
  const type = jobType(job.jobTypeId);
  const variations = variationsFor(job.id).filter((v) => v.status === "approved");
  const invoice = data.invoices.find((row) => row.jobId === job.id);
  const org = data.org;
  const businessName = currentAccount?.businessName || org.tradingName;
  const phone = currentAccount?.phone || org.phone;
  const email = currentAccount?.email || org.email;
  const town = currentAccount?.town || org.town;

  return (
    <div>
      <header className="bg-ink px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-5 text-paper">
        <Link
          to="/app/jobs/$jobId"
          params={{ jobId: job.id }}
          className="tap no-print -ml-2 inline-flex items-center gap-1 text-base text-fog"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Job {job.jobNumber}
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
          <FileText className="size-6 text-amber" aria-hidden />
          Completion pack
        </h1>
        <p className="mt-1 text-base text-fog">
          Completed {job.completedAt ? formatDateTime(job.completedAt) : "n/a"}
        </p>
      </header>

      <main className="space-y-4 px-4 py-5">
        <Block title="Prepared by">
          <Row label="Business" value={businessName} />
          <Row label="Phone" value={phone} />
          <Row label="Email" value={email} />
          <Row label="Area" value={town} />
          {org.vatRate > 0 ? (
            <Row label="VAT" value={`Registered, ${Math.round(org.vatRate * 100)}%`} />
          ) : null}
        </Block>

        <Block title="1. Job summary">
          <Row label="Job number" value={job.jobNumber} />
          <Row label="Job type" value={type?.name ?? "n/a"} />
          <Row label="Customer" value={person?.name ?? "n/a"} />
          <Row
            label="Property"
            value={place ? `${place.line1}, ${place.town}, ${place.postcode}` : "n/a"}
          />
          <Row label="Attended" value={formatDate(job.scheduledStart)} />
        </Block>

        <Block title="2. Reported issue and agreed scope">
          <p className="text-base text-slate">{job.reportedIssue}</p>
          <p className="mt-2 text-base text-slate">{job.scope}</p>
        </Block>

        <Block title="3. Work carried out">
          <p className="text-base text-slate">{job.workDoneNotes || "n/a"}</p>
        </Block>

        <Block title="4. Parts used">
          <p className="text-base text-slate">{job.partsUsedNotes || "n/a"}</p>
        </Block>

        <Block title="5. Test results">
          <p className="text-base text-slate">
            {job.testResults || "Not required for this job type."}
          </p>
        </Block>

        {job.photos.length > 0 ? (
          <Block title="6. Photo evidence">
            {ORDER.map((stage) => {
              const photos = job.photos.filter((photo) => photo.stage === stage);
              if (photos.length === 0) return null;
              return (
                <div key={stage} className="mt-2 first:mt-0">
                  <p className="label-caps">{STAGE_LABELS[stage]}</p>
                  <ul className="mt-1 space-y-1">
                    {photos.map((photo) => (
                      <li key={photo.id} className="text-base text-slate">
                        {photo.label}{" "}
                        <span className="tabular text-[15px] text-fog">
                          {formatDateTime(photo.capturedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Block>
        ) : null}

        <Block title="7. Variations">
          {variations.length === 0 ? (
            <p className="text-base text-fog">None recorded.</p>
          ) : (
            <ul className="space-y-2">
              {variations.map((variation) => (
                <li key={variation.id} className="flex items-start justify-between gap-3">
                  <span className="text-base text-slate">{variation.description}</span>
                  <span className="tabular text-base font-semibold text-ink">
                    {formatCurrency(variation.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="8. Exceptions and waivers">
          {job.waivers.length === 0 ? (
            <p className="text-base text-fog">None, every requirement was met on site.</p>
          ) : (
            <ul className="space-y-2">
              {job.waivers.map((waiver) => (
                <li key={waiver.key} className="text-base text-slate">
                  <span className="font-semibold text-ink">
                    {waiver.kind === "not_applicable" ? "Not applicable" : "Exception"}:
                  </span>{" "}
                  {waiver.reason}
                  <span className="block text-[15px] text-fog">
                    {waiver.recordedBy} · {formatDateTime(waiver.recordedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="9. Recommendations and next steps">
          <p className="text-base text-slate">{job.recommendations || "n/a"}</p>
        </Block>

        <Block title="10. Invoice">
          {invoice ? (
            <Link
              to="/app/invoices/$invoiceId"
              params={{ invoiceId: invoice.id }}
              className="tap inline-flex items-center text-base font-semibold text-amber-deep"
            >
              {invoice.invoiceNumber}, open draft invoice
            </Link>
          ) : (
            <p className="text-base text-fog">No invoice raised.</p>
          )}
        </Block>

        <button
          type="button"
          onClick={() => window.print()}
          className="tap no-print flex w-full items-center justify-center gap-2 rounded-xl bg-ink text-lg font-semibold text-paper"
        >
          <Printer className="size-5" aria-hidden />
          Print or save as PDF
        </button>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-4">
      <h2 className="label-caps">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line py-1.5 last:border-0">
      <span className="text-base text-fog">{label}</span>
      <span className="text-right text-base font-semibold text-ink">{value}</span>
    </div>
  );
}
