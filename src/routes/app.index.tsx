import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Inbox,
  CheckCircle2,
  Circle,
  PoundSterling,
  TriangleAlert,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { EmergencyStrip } from "@/components/EmergencyStrip";
import { JobRow } from "@/components/JobRow";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency, formatDayLabel } from "@/lib/format";
import { useStore } from "@/lib/store";
import { usePlatform } from "@/lib/platform";
import { invoiceBalance, invoicePaid, quoteNet } from "@/lib/domain";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Today | RCH PlumbFlow" },
      {
        name: "description",
        content: "Your jobs, emergencies, tasks and money for today, at a glance.",
      },
      { property: "og:title", content: "Today | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "Your jobs, emergencies, tasks and money for today, at a glance.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Today,
});

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function Today() {
  const {
    data,
    can,
    currentUser,
    setTask,
    customer,
    setEnquiry,
    setJob,
    log,
    addQuote,
    isDemoData,
    clearAllData,
  } = useStore();
  const { currentAccount, logout } = usePlatform();

  const navigate = useNavigate();
  const emergencyTrack = useRef<HTMLDivElement | null>(null);
  const [emergencyIndex, setEmergencyIndex] = useState(0);
  const jobsTrack = useRef<HTMLDivElement | null>(null);

  const visibleJobs = can.seeAllJobs
    ? data.jobs
    : data.jobs.filter((job) => job.assignedToId === currentUser.id);
  const todaysJobs = visibleJobs
    .filter((job) => isToday(job.scheduledStart) && job.status !== "cancelled")
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));

  const emergencyJobs = todaysJobs.filter((job) => job.isEmergency);
  const emergencyJobIds = new Set(emergencyJobs.map((job) => job.id));
  const listJobs = todaysJobs.filter((job) => !emergencyJobIds.has(job.id));
  const emergencyEnquiries = data.enquiries.filter(
    (enquiry) =>
      enquiry.isEmergency && enquiry.status !== "declined" && enquiry.status !== "converted",
  );
  const emergencyCount = emergencyJobs.length + emergencyEnquiries.length;
  const newEnquiries = data.enquiries.filter(
    (e) => e.status === "new" || e.status === "needs_contact",
  );

  const openInvoices = data.invoices.filter(
    (invoice) => !["paid", "written_off", "credited", "draft"].includes(invoice.status),
  );
  const outstanding = openInvoices.reduce(
    (sum, invoice) => sum + invoiceBalance(invoice, data.org.vatRate),
    0,
  );
  const overdue = data.invoices.filter((invoice) => invoice.status === "overdue");
  const overdueValue = overdue.reduce(
    (sum, invoice) => sum + invoiceBalance(invoice, data.org.vatRate),
    0,
  );
  const paidThisMonth = data.invoices.reduce((sum, invoice) => sum + invoicePaid(invoice), 0);
  const quotedThisMonth = data.quotes
    .filter((quote) => quote.status !== "draft")
    .reduce((sum, quote) => sum + quoteNet(quote), 0);

  const todaysTasks = data.tasks.filter(
    (task) => task.status !== "complete" && task.status !== "cancelled",
  );

  const nowMs = Date.now();
  const nextJobId =
    listJobs.find(
      (job) => job.status !== "complete" && new Date(job.scheduledStart).getTime() >= nowMs,
    )?.id ??
    [...listJobs].reverse().find((job) => job.status !== "complete")?.id ??
    null;

  useEffect(() => {
    if (!nextJobId) return;
    const row = jobsTrack.current?.querySelector(`[data-job-id="${nextJobId}"]`);
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [nextJobId]);

  /** One tap: draft a quote pre-filled with the minimum call-out charge. */
  function callOutQuote(input: {
    customerId: string | null;
    propertyId: string | null;
    jobTypeId: string | null;
    enquiryId: string | null;
    who: string;
  }) {
    const callOut =
      data.priceBook.find((item) => item.id === data.org.minimumCalloutItemId) ??
      data.priceBook.find((item) => item.code === "CALL-MIN");
    if (!input.customerId || !input.propertyId || !callOut) {
      toast.error("Add the customer and property first, then send the call-out quote.");
      return;
    }
    const quote = addQuote({
      customerId: input.customerId,
      propertyId: input.propertyId,
      enquiryId: input.enquiryId,
      jobTypeId: input.jobTypeId,
      status: "sent",
      lines: [
        {
          id: `ql_${Date.now()}`,
          description: callOut.name,
          quantity: 1,
          unitPrice: callOut.unitPrice,
          isVatable: callOut.isVatable,
        },
      ],
      depositRule: data.org.defaultDepositRule,
      depositPercentage: data.org.defaultDepositPercentage,
      depositFixedAmount: 0,
      stagePayments: [],
      lockedAt: null,
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    if (input.enquiryId) {
      setEnquiry(input.enquiryId, { status: "quoted" });
      log("enquiry", input.enquiryId, `Call-out quote ${quote.quoteNumber} sent to ${input.who}`);
    }
    toast.success(`${quote.quoteNumber} sent, ${callOut.name}`);
  }

  function declineWithReason(enquiryId: string) {
    const reason = window.prompt(
      "Why are you declining or referring this enquiry? At least 10 characters.",
    );
    if (reason === null) return;
    if (reason.trim().length < 10) {
      toast.error("Give a reason of at least 10 characters.");
      return;
    }
    setEnquiry(enquiryId, { status: "declined", declineReason: reason.trim() });
    log("enquiry", enquiryId, `Enquiry declined or referred: ${reason.trim()}`);
    toast.success("Enquiry declined");
  }

  return (
    <div>
      <header className="bg-ink px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-5 text-paper">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps text-fog">
              {formatDayLabel(new Date())} · {currentAccount?.businessName || data.org.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Today</h1>
            <p className="mt-1 text-base text-fog">
              {todaysJobs.length} {todaysJobs.length === 1 ? "job" : "jobs"} booked ·{" "}
              {newEnquiries.length} {newEnquiries.length === 1 ? "enquiry" : "enquiries"} to action
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              toast.success("Signed out successfully.");
              navigate({ to: "/login" });
            }}
            className="tap flex items-center gap-1.5 rounded-lg border border-ink-soft bg-ink-soft/70 px-3 py-1.5 text-xs font-semibold text-fog hover:text-red-400 hover:border-red-400/30 transition cursor-pointer"
            title="Sign out of your account"
          >
            <LogOut className="size-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </header>

      {isDemoData && (
        <div className="bg-amber/15 border-b border-amber/30 px-4 py-3 text-ink">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2">
              <Sparkles className="size-4 text-amber-deep shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-xs text-ink">
                <strong className="font-semibold">Sample Demo Workspace Active:</strong> Showing sample
                jobs (Marie Osei) and mock invoices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Clear demo data and start with a fresh, clean workspace for your real business?",
                  )
                ) {
                  clearAllData();
                  toast.success("Demo data cleared! Workspace ready for real jobs.");
                }
              }}
              className="tap self-start sm:self-auto rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper hover:bg-slate transition cursor-pointer shrink-0"
            >
              Clear Demo Data & Start Fresh
            </button>
          </div>
        </div>
      )}

      {emergencyCount > 0 ? (
        <div>
          <div
            ref={emergencyTrack}
            onScroll={(event) => {
              const el = event.currentTarget;
              const width = el.clientWidth || 1;
              setEmergencyIndex(Math.round(el.scrollLeft / width));
            }}
            className="flex snap-x snap-mandatory overflow-x-auto"
          >
            {emergencyJobs.map((job) => {
              const person = customer(job.customerId);
              return (
                <div key={job.id} className="w-full shrink-0 snap-center">
                  <EmergencyStrip
                    count={emergencyCount}
                    name={person?.name ?? "Emergency job"}
                    phone={person?.phone ?? data.org.phone}
                    summary={job.title}
                    onSendCallOutQuote={() =>
                      callOutQuote({
                        customerId: job.customerId,
                        propertyId: job.propertyId,
                        jobTypeId: job.jobTypeId,
                        enquiryId: job.enquiryId ?? null,
                        who: person?.name ?? "customer",
                      })
                    }
                    onSchedule={() => {
                      const start = new Date();
                      setJob(job.id, { scheduledStart: start.toISOString(), status: "booked" });
                      log("job", job.id, `Scheduled for today, ${formatDayLabel(start)}`);
                      toast.success("Scheduled for today");
                      navigate({ to: "/app/jobs/$jobId", params: { jobId: job.id } });
                    }}
                    onDecline={() => {
                      if (job.enquiryId) {
                        declineWithReason(job.enquiryId);
                        return;
                      }
                      const reason = window.prompt(
                        "Why are you declining or referring this job? At least 10 characters.",
                      );
                      if (reason === null) return;
                      if (reason.trim().length < 10) {
                        toast.error("Give a reason of at least 10 characters.");
                        return;
                      }
                      setJob(job.id, { status: "cancelled" });
                      log("job", job.id, `Declined or referred: ${reason.trim()}`);
                      toast.success("Job declined");
                    }}
                  />
                </div>
              );
            })}
            {emergencyEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="w-full shrink-0 snap-center">
                <EmergencyStrip
                  count={emergencyCount}
                  name={enquiry.contactName}
                  phone={enquiry.phone}
                  summary={enquiry.rawAddress}
                  onSendCallOutQuote={() =>
                    callOutQuote({
                      customerId: enquiry.customerId,
                      propertyId: enquiry.propertyId,
                      jobTypeId: enquiry.jobTypeId,
                      enquiryId: enquiry.id,
                      who: enquiry.contactName,
                    })
                  }
                  onSchedule={() => {
                    setEnquiry(enquiry.id, { status: "converted" });
                    log(
                      "enquiry",
                      enquiry.id,
                      `Job booked for today, ${formatDayLabel(new Date())}`,
                    );
                    navigate({ to: "/app/enquiries" });
                  }}
                  onDecline={() => declineWithReason(enquiry.id)}
                />
              </div>
            ))}
          </div>
          {emergencyCount > 1 ? (
            <div className="flex items-center justify-center gap-2 bg-emergency pb-2">
              {Array.from({ length: emergencyCount }).map((_, index) => (
                <span
                  key={index}
                  aria-hidden
                  className={
                    index === emergencyIndex
                      ? "size-2 rounded-full bg-paper"
                      : "size-2 rounded-full bg-paper/40"
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <main className="space-y-6 px-4 py-5">
        <section className="grid grid-cols-2 gap-3">
          <Link
            to="/app/enquiries"
            className="rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]"
          >
            <p className="label-caps">Enquiries</p>
            <p className="tabular mt-1 text-3xl font-semibold text-ink">{newEnquiries.length}</p>
            <p className="mt-1 flex items-center gap-1 text-base text-amber-deep">
              Review <ChevronRight className="size-4" aria-hidden />
            </p>
          </Link>
          {can.seeMoney ? (
            <Link
              to="/app/money"
              className="rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]"
            >
              <p className="label-caps">Overdue</p>
              <p className="tabular mt-1 text-3xl font-semibold text-ink">
                {formatCurrency(overdueValue)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-base text-amber-deep">
                <TriangleAlert className="size-4" aria-hidden /> {overdue.length} invoices
              </p>
            </Link>
          ) : (
            <Link
              to="/app/jobs"
              className="rounded-2xl border border-line bg-paper p-4 shadow-[var(--shadow-card)]"
            >
              <p className="label-caps">My jobs</p>
              <p className="tabular mt-1 text-3xl font-semibold text-ink">{visibleJobs.length}</p>
              <p className="mt-1 flex items-center gap-1 text-base text-amber-deep">
                Open list <ChevronRight className="size-4" aria-hidden />
              </p>
            </Link>
          )}
        </section>

        <section>
          <h2 className="label-caps mb-3">Today&apos;s jobs</h2>
          {listJobs.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nothing booked today"
              description="Add a job or convert an enquiry to fill the diary."
            />
          ) : (
            <>
              <div className="space-y-3" ref={jobsTrack}>
                {listJobs.slice(0, 4).map((job) => (
                  <div key={job.id} data-job-id={job.id}>
                    <JobRow
                      job={job}
                      isLate={
                        job.status !== "complete" && new Date(job.scheduledStart).getTime() < nowMs
                      }
                    />
                  </div>
                ))}
              </div>
              {listJobs.length > 4 ? (
                <Link
                  to="/app/jobs"
                  search={{ filter: "today" }}
                  className="tap mt-3 flex w-full items-center justify-between rounded-2xl border border-line bg-paper px-4 text-base font-semibold text-amber-deep"
                >
                  See all {listJobs.length} jobs
                  <ChevronRight className="size-5" aria-hidden />
                </Link>
              ) : null}
            </>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="label-caps">Tasks</h2>
          </div>
          <div className="space-y-3">
            {todaysTasks.slice(0, 3).map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setTask(task.id, { status: "complete" })}
                className="tap flex w-full items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-left"
              >
                {task.status === "complete" ? (
                  <CheckCircle2 className="size-6 shrink-0 text-go" aria-hidden />
                ) : (
                  <Circle className="size-6 shrink-0 text-fog" aria-hidden />
                )}
                <span className="text-base text-ink">{task.title}</span>
              </button>
            ))}
          </div>
          {todaysTasks.length > 3 ? (
            <Link
              to="/app/tasks"
              className="tap mt-3 flex w-full items-center justify-between rounded-2xl border border-line bg-paper px-4 text-base font-semibold text-amber-deep"
            >
              See all {todaysTasks.length} tasks
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          ) : null}
        </section>

        {can.seeMoney ? (
          <section className="rounded-2xl border border-line bg-paper p-4">
            <h2 className="label-caps">Money</h2>
            <dl className="mt-3 space-y-2">
              <MoneyRow label="Outstanding" value={outstanding} />
              <MoneyRow label="Payments received" value={paidThisMonth} />
              <MoneyRow label="Quoted" value={quotedThisMonth} />
            </dl>
          </section>
        ) : null}
      </main>

      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex h-14 items-center gap-2 rounded-full bg-amber px-5 text-lg font-semibold text-ink shadow-[var(--shadow-lift)] active:bg-amber-deep"
          >
            <Plus className="size-6" aria-hidden />
            New
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl border-line bg-paper">
          <SheetHeader>
            <SheetTitle className="text-xl">Create</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <SheetLink label="New enquiry" onClick={() => navigate({ to: "/app/enquiries" })} />
            <SheetLink label="New customer" onClick={() => navigate({ to: "/app/customers" })} />
            <SheetLink label="New task" onClick={() => navigate({ to: "/app/tasks" })} />
            <SheetLink label="New quote" onClick={() => navigate({ to: "/app/quotes" })} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SheetLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 text-lg font-semibold text-ink"
    >
      {label}
      <ChevronRight className="size-5 text-fog" aria-hidden />
    </button>
  );
}

function MoneyRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-base text-slate">
        <PoundSterling className="size-4 text-fog" aria-hidden />
        {label}
      </dt>
      <dd className="tabular text-base font-semibold text-ink">{formatCurrency(value)}</dd>
    </div>
  );
}
