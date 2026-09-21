import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  FileText,
  MapPin,
  MessageSquare,
  PenTool,
  Phone,
  Plus,
  ScanBarcode,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { VoiceField } from "@/components/VoiceField";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { SignatureModal } from "@/components/SignatureModal";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { triggerSuccessConfetti } from "@/lib/confetti";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import { NEXT_JOB_STEP, STAGE_LABELS, type EvidenceStage } from "@/lib/domain";
import {
  MIN_REASON_LENGTH,
  outstandingRequirements,
  requiredStages,
  type Requirement,
} from "@/lib/completion";
import { enqueueChange } from "@/hooks/useSyncQueue";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/jobs/$jobId/")({
  head: () => ({
    meta: [
      { title: "Job | RCH PlumbFlow" },
      { name: "description", content: "On-site job workflow, evidence capture and close-out." },
      { property: "og:title", content: "Job | RCH PlumbFlow" },
      {
        property: "og:description",
        content: "On-site job workflow, evidence capture and close-out.",
      },
    ],
  }),
  component: JobDetail,
});

const ALL_STAGES: EvidenceStage[] = ["before", "during", "testing", "after"];

function JobDetail() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const store = useStore();
  const {
    data,
    can,
    setJob,
    log,
    addVariation,
    update,
    customer,
    property,
    jobType,
    variationsFor,
  } = store;

  const job = data.jobs.find((row) => row.id === jobId);
  const [showGate, setShowGate] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const variationsRef = useRef<HTMLDivElement>(null);
  const materialsRef = useRef<HTMLDivElement>(null);

  const type = jobType(job?.jobTypeId ?? null);
  const variations = useMemo(() => (job ? variationsFor(job.id) : []), [job, variationsFor]);
  const outstanding = useMemo(
    () => (job ? outstandingRequirements(job, type, variations) : []),
    [job, type, variations],
  );

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
  const address = place ? `${place.line1}, ${place.town}, ${place.postcode}` : "";
  const next = NEXT_JOB_STEP[job.status];
  const stages = requiredStages(type);

  function scrollTo(target: Requirement["target"]) {
    const map = {
      evidence: evidenceRef,
      notes: notesRef,
      variations: variationsRef,
      materials: materialsRef,
    } as const;
    setShowGate(false);
    window.setTimeout(() => map[target].current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function addPhoto(stage: EvidenceStage) {
    const label = window.prompt(`Label for this ${STAGE_LABELS[stage].toLowerCase()} photo`);
    if (label === null) return;
    setJob(job!.id, {
      photos: [
        ...job!.photos,
        {
          id: Math.random().toString(36).slice(2),
          stage,
          label: label.trim() || `${STAGE_LABELS[stage]} evidence`,
          capturedAt: new Date().toISOString(),
        },
      ],
    });
    enqueueChange({ jobId: job!.id, kind: "photo", label: `${STAGE_LABELS[stage]} photo` });
    log("job", job!.id, `${STAGE_LABELS[stage]} evidence captured`);
    toast.success(`${STAGE_LABELS[stage]} photo added`);
  }

  function advance() {
    if (!next) return;
    setJob(job!.id, { status: next.to });
    log("job", job!.id, `Job ${job!.jobNumber} set to ${next.label.toLowerCase()}`);
  }

  function attemptComplete() {
    if (outstanding.length > 0) {
      setShowGate(true);
      return;
    }
    const number = data.counters.invoice + 1;
    const invoiceNumber = `INV-${String(number).padStart(4, "0")}`;
    const approved = variations.filter((v) => v.status === "approved");

    update((draft) => {
      const target = draft.jobs.find((row) => row.id === job!.id);
      if (target) {
        target.status = "complete";
        target.completedAt = new Date().toISOString();
      }
      draft.counters.invoice = number;
      draft.invoices.unshift({
        id: `i_${Math.random().toString(36).slice(2)}`,
        orgId: draft.org.id,
        invoiceNumber,
        customerId: job!.customerId,
        propertyId: job!.propertyId,
        jobId: job!.id,
        status: "draft",
        lines: [
          { id: "l1", description: job!.title, quantity: 1, unitPrice: 0, isVatable: true },
          ...approved.map((v) => ({
            id: v.id,
            description: `Variation, ${v.description}`,
            quantity: 1,
            unitPrice: v.amount,
            isVatable: v.isVatable,
          })),
        ],
        payments: [],
        issuedAt: null,
        dueAt: null,
      });
      return draft;
    });
    log("job", job!.id, `Job ${job!.jobNumber} marked complete`);
    log("job", job!.id, `Draft invoice ${invoiceNumber} and completion pack generated`);
    toast.success(`Job complete, draft ${invoiceNumber} created`);
    triggerSuccessConfetti();
    navigate({ to: "/app/jobs/$jobId/pack", params: { jobId: job!.id } });
  }

  function handleSaveSignature(dataUrl: string, signatoryName: string) {
    if (!job) return;
    setJob(job.id, {
      customerSignature: {
        dataUrl,
        signatoryName,
        signedAt: new Date().toISOString(),
      },
    });
    log("job", job.id, `Customer sign-off captured for ${signatoryName}`);
    toast.success(`Customer sign-off saved for ${signatoryName}`);
    triggerSuccessConfetti();
  }

  function handleScanBarcode(scannedText: string) {
    if (!job) return;
    const currentNotes = job.partsUsedNotes?.trim() || "";
    const appendText = `[Serial/Barcode: ${scannedText}]`;
    const updatedNotes = currentNotes ? `${currentNotes}\n${appendText}` : appendText;
    setJob(job.id, { partsUsedNotes: updatedNotes });
    log("job", job.id, `Scanned serial/barcode: ${scannedText}`);
    toast.success(`Scanned: ${scannedText} added to parts used notes`);
  }

  function resolveRequirement(requirement: Requirement, kind: "not_applicable" | "exception") {
    const wording = kind === "not_applicable" ? "not applicable" : "exception";
    const reason = window.prompt(
      `Why is this ${wording}? Minimum ${MIN_REASON_LENGTH} characters.`,
      "",
    );
    if (reason === null) return;
    if (reason.trim().length < MIN_REASON_LENGTH) {
      toast.error(`A reason of at least ${MIN_REASON_LENGTH} characters is required.`);
      return;
    }
    setJob(job!.id, {
      waivers: [
        ...job!.waivers,
        {
          key: requirement.key,
          kind,
          reason: reason.trim(),
          recordedBy: store.currentUser.name,
          recordedAt: new Date().toISOString(),
        },
      ],
    });
    log(
      "job",
      job!.id,
      `${requirement.title} marked ${kind === "not_applicable" ? "not applicable" : "as an exception"}: ${reason.trim()}`,
    );
  }

  return (
    <div className="pb-8">
      <header className="sticky top-0 z-30 bg-ink px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-4 text-paper">
        <Link
          to="/app/jobs"
          className="tap -ml-2 inline-flex items-center gap-1 text-base text-fog"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Jobs
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="tabular label-caps">
              {job.jobNumber} · {formatTime(job.scheduledStart)}
            </p>
            <h1 className="mt-1 text-2xl leading-tight font-semibold">{job.title}</h1>
          </div>
          <StatusChip status={job.status} />
        </div>
        {job.isEmergency ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emergency px-2.5 py-1 text-[15px] font-bold tracking-wide uppercase">
            <TriangleAlert className="size-4" aria-hidden />
            Emergency
          </p>
        ) : null}
      </header>

      <main className="space-y-5 px-4 py-5">
        <section className="rounded-2xl border border-line bg-paper p-4">
          <p className="label-caps">{type?.name ?? "Job type not set"}</p>
          {can.seeCustomerContact ? (
            <>
              <p className="mt-2 text-lg font-semibold text-ink">{person?.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <a
                  href={`tel:${person?.phone ?? ""}`}
                  className="tap flex items-center justify-center gap-2 rounded-xl bg-ink text-base font-semibold text-paper"
                >
                  <Phone className="size-5" aria-hidden /> Call
                </a>
                <a
                  href={`sms:${person?.phone ?? ""}`}
                  className="tap flex items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-semibold text-ink"
                >
                  <MessageSquare className="size-5" aria-hidden /> Message
                </a>
              </div>
            </>
          ) : (
            <p className="mt-2 text-base text-fog">
              Customer contact details are hidden for subcontractors.
            </p>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-base text-slate">
            <MapPin className="mt-1 size-4 shrink-0 text-fog" aria-hidden />
            {address}
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noreferrer"
            className="tap mt-2 inline-flex items-center text-base font-semibold text-amber-deep"
          >
            Open in maps
          </a>
          {place?.accessNotes ? (
            <p className="mt-3 rounded-xl bg-amber-wash p-3 text-base text-amber-deep">
              <span className="font-semibold">Access:</span> {place.accessNotes}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Reported issue</h2>
          <p className="mt-2 text-base text-slate">{job.reportedIssue}</p>
          <h2 className="label-caps mt-4">Agreed scope</h2>
          <p className="mt-2 text-base text-slate">{job.scope}</p>
        </section>

        {/* Evidence */}
        <section ref={evidenceRef} className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Evidence</h2>
          <p className="mt-1 text-base text-fog">
            Required for {type?.name ?? "this job"}: {stages.map((s) => STAGE_LABELS[s]).join(", ")}
          </p>
          <div className="mt-3 space-y-3">
            {ALL_STAGES.map((stage) => {
              const photos = job.photos.filter((photo) => photo.stage === stage);
              const required = stages.includes(stage);
              return (
                <div
                  key={stage}
                  className={cn(
                    "rounded-xl border p-3",
                    required && photos.length === 0
                      ? "border-amber-deep bg-amber-wash"
                      : "border-line bg-surface",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-semibold text-ink">
                      {STAGE_LABELS[stage]}
                      {required ? <span className="text-amber-deep"> · required</span> : null}
                    </p>
                    <button
                      type="button"
                      onClick={() => addPhoto(stage)}
                      className="tap flex items-center gap-1.5 rounded-lg bg-ink px-3 text-base font-semibold text-paper"
                    >
                      <Camera className="size-5" aria-hidden />
                      Capture
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {photos.map((photo) => (
                      <li key={photo.id} className="text-base text-slate">
                        {photo.label}{" "}
                        <span className="tabular text-[15px] text-fog">
                          {formatDateTime(photo.capturedAt)}
                        </span>
                      </li>
                    ))}
                    {photos.length === 0 ? (
                      <li className="text-base text-fog">No photos captured.</li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Notes */}
        <section ref={notesRef} className="space-y-4 rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
            <h2 className="label-caps">Work & Parts Notes</h2>
            <button
              type="button"
              onClick={() => setShowBarcodeScanner(true)}
              className="tap flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:bg-paper"
            >
              <ScanBarcode className="size-3.5 text-blue-600 dark:text-blue-400" />
              Scan Boiler Serial / Barcode
            </button>
          </div>
          <VoiceField
            label="Work done notes"
            value={job.workDoneNotes}
            onChange={(next) => setJob(job.id, { workDoneNotes: next })}
            placeholder="What did you actually do on site?"
          />
          <VoiceField
            label="Parts used"
            value={job.partsUsedNotes}
            onChange={(next) => setJob(job.id, { partsUsedNotes: next })}
          />
          <VoiceField
            label="Recommendations"
            value={job.recommendations}
            onChange={(next) => setJob(job.id, { recommendations: next })}
          />
          {type?.requiresTesting ? (
            <VoiceField
              label="Test results"
              value={job.testResults}
              onChange={(next) => setJob(job.id, { testResults: next })}
            />
          ) : null}
        </section>

        {/* Materials */}
        <section ref={materialsRef} className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Materials</h2>
          {job.materials.length === 0 ? (
            <p className="mt-2 text-base text-fog">Nothing listed for this job.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {job.materials.map((material) => (
                <li key={material.id} className="flex items-center justify-between gap-3">
                  <span className="text-base text-ink">
                    {material.quantity} × {material.name}
                    {material.isJobCritical ? (
                      <span className="text-amber-deep"> · job critical</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setJob(job.id, {
                        materials: job.materials.map((row) =>
                          row.id === material.id ? { ...row, isCollected: !row.isCollected } : row,
                        ),
                      })
                    }
                    className={cn(
                      "tap rounded-lg px-3 text-base font-semibold",
                      material.isCollected
                        ? "bg-go-wash text-go"
                        : "border border-line bg-surface text-slate",
                    )}
                  >
                    {material.isCollected ? "Collected" : "Mark collected"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Variations */}
        <section ref={variationsRef} className="rounded-2xl border border-line bg-paper p-4">
          <h2 className="label-caps">Variations</h2>
          <ul className="mt-3 space-y-3">
            {variations.map((variation) => (
              <li key={variation.id} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base text-ink">{variation.description}</p>
                  <StatusChip status={variation.status} />
                </div>
                <p className="tabular mt-1 text-base font-semibold text-ink">
                  {formatCurrency(variation.amount)}
                </p>
                {variation.status === "pending" ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const note = window.prompt("How was this approved by the customer?");
                        if (!note || note.trim().length < MIN_REASON_LENGTH) {
                          toast.error(
                            `Record how it was approved (min ${MIN_REASON_LENGTH} characters).`,
                          );
                          return;
                        }
                        update((draft) => {
                          const row = draft.variations.find((v) => v.id === variation.id);
                          if (row) {
                            row.status = "approved";
                            row.approvedAt = new Date().toISOString();
                            row.approvedByNote = note.trim();
                          }
                          return draft;
                        });
                        log("job", job.id, `Variation approved: ${note.trim()}`);
                        toast.success("Variation approved");
                      }}
                      className="tap rounded-lg bg-ink text-base font-semibold text-paper"
                    >
                      Mark approved
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        update((draft) => {
                          const row = draft.variations.find((v) => v.id === variation.id);
                          if (row) row.status = "cancelled";
                          return draft;
                        });
                        log("job", job.id, `Variation cancelled: ${variation.description}`);
                        toast.success("Variation cancelled");
                      }}
                      className="tap rounded-lg border border-line bg-surface text-base font-semibold text-slate"
                    >
                      Cancel
                    </button>
                  </div>
                ) : variation.approvedByNote ? (
                  <p className="mt-1 text-[15px] text-fog">{variation.approvedByNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              const description = window.prompt("Describe the variation");
              if (description === null) return;
              if (!description.trim()) {
                toast.error("Describe the variation before saving it.");
                return;
              }
              const entered = window.prompt("Amount in £", "0");
              if (entered === null) return;
              const amount = Number(entered);
              if (!Number.isFinite(amount) || amount < 0) {
                toast.error("Enter a variation amount of zero or more.");
                return;
              }
              addVariation(job.id, description.trim(), amount);
              toast.success("Variation recorded, it must be approved before completion");
            }}
            className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-semibold text-ink"
          >
            <Plus className="size-5" aria-hidden />
            Record variation
          </button>
        </section>

        {/* Customer Sign-Off */}
        <section className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="label-caps">Customer Sign-Off</h2>
              <p className="mt-1 text-sm text-slate">
                {job.customerSignature
                  ? `Signed by ${job.customerSignature.signatoryName} on ${formatDateTime(job.customerSignature.signedAt)}`
                  : "Capture customer signature on mobile or tablet upon work completion."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSignatureModal(true)}
              className="tap flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-paper"
            >
              <PenTool className="size-4 text-amber-deep" />
              {job.customerSignature ? "Re-sign" : "Capture Signature"}
            </button>
          </div>

          {job.customerSignature && (
            <div className="mt-3 flex items-center gap-4 rounded-xl border border-line/70 bg-surface p-3">
              <div className="h-16 w-36 shrink-0 rounded-lg border border-line bg-paper p-1 flex items-center justify-center overflow-hidden">
                <img
                  src={job.customerSignature.dataUrl}
                  alt={`Signature of ${job.customerSignature.signatoryName}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="text-xs text-slate">
                <p className="font-semibold text-ink">{job.customerSignature.signatoryName}</p>
                <p className="text-fog">{formatDateTime(job.customerSignature.signedAt)}</p>
                <span className="inline-flex items-center gap-1 text-emerald-600 mt-1 font-semibold">
                  <Check className="size-3.5" /> Customer approved on site
                </span>
              </div>
            </div>
          )}
        </section>

        <ActivityTimeline entityType="job" entityId={job.id} />

        {job.status === "complete" ? (
          <Link
            to="/app/jobs/$jobId/pack"
            params={{ jobId: job.id }}
            className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-ink text-lg font-semibold text-paper"
          >
            <FileText className="size-5" aria-hidden />
            View completion pack
          </Link>
        ) : null}
      </main>

      {job.status !== "complete" && job.status !== "cancelled" ? (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4">
          {next ? (
            <button
              type="button"
              onClick={advance}
              className="tap flex h-14 w-full items-center justify-center rounded-2xl bg-amber text-lg font-bold text-ink shadow-[var(--shadow-lift)] active:bg-amber-deep"
            >
              {next.label}
            </button>
          ) : (
            <button
              type="button"
              onClick={attemptComplete}
              className="tap flex h-14 w-full items-center justify-center rounded-2xl bg-ink text-lg font-bold text-paper shadow-[var(--shadow-lift)]"
            >
              JOB COMPLETE
            </button>
          )}
        </div>
      ) : null}

      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSaveSignature}
        defaultName={person?.name || ""}
      />

      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleScanBarcode}
      />

      {showGate ? (
        <CompletionGate
          requirements={outstanding}
          onClose={() => setShowGate(false)}
          onAddNow={scrollTo}
          onResolve={resolveRequirement}
        />
      ) : null}
    </div>
  );
}

function CompletionGate({
  requirements,
  onClose,
  onAddNow,
  onResolve,
}: {
  requirements: Requirement[];
  onClose: () => void;
  onAddNow: (target: Requirement["target"]) => void;
  onResolve: (requirement: Requirement, kind: "not_applicable" | "exception") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <header className="bg-ink px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-5 text-paper">
        <p className="flex items-center gap-2 text-[15px] font-bold tracking-widest uppercase">
          <ShieldAlert className="size-4 text-amber" aria-hidden />
          Completion blocked
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          {requirements.length} thing{requirements.length === 1 ? "" : "s"} still needed
        </h2>
        <p className="mt-1 text-base text-fog">
          Resolve every item below. Not applicable and exceptions both need a written reason and are
          recorded against the job.
        </p>
      </header>

      <ul className="space-y-3 p-4">
        {requirements.map((requirement) => (
          <li key={requirement.key} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-lg font-semibold text-ink">{requirement.title}</p>
            <p className="mt-1 text-base text-slate">{requirement.detail}</p>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => onAddNow(requirement.target)}
                className="tap flex w-full items-center justify-between rounded-xl bg-amber px-4 text-base font-bold text-ink"
              >
                Add it now
                <ChevronRight className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onResolve(requirement, "not_applicable")}
                className="tap w-full rounded-xl border border-line bg-paper text-base font-semibold text-ink"
              >
                Mark not applicable
              </button>
              <button
                type="button"
                onClick={() => onResolve(requirement, "exception")}
                className="tap w-full rounded-xl border border-line bg-paper text-base font-semibold text-ink"
              >
                Record exception
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onClose}
          className="tap w-full rounded-xl border border-line bg-surface text-base font-semibold text-slate"
        >
          Back to the job
        </button>
      </div>
    </div>
  );
}
