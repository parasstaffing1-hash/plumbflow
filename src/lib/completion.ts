/**
 * A2/A3, JOB COMPLETE validation gate.
 *
 * This BLOCKS completion. A job can never reach `complete` with an unresolved
 * requirement: every miss must be fixed, marked not applicable with a reason,
 * or recorded as an exception with a reason.
 */
import type { EvidenceStage, Job, JobType, JobVariation } from "./domain";
import { STAGE_LABELS } from "./domain";

export interface Requirement {
  key: string;
  title: string;
  detail: string;
  /** Where "Add it now" should jump to on the job screen. */
  target: "evidence" | "notes" | "variations" | "materials";
  stage?: EvidenceStage;
}

export const MIN_REASON_LENGTH = 10;

export function requiredStages(jobType: JobType | undefined): EvidenceStage[] {
  if (!jobType) return ["before", "after"];
  const stages: EvidenceStage[] = [];
  if (jobType.requiresBefore) stages.push("before");
  if (jobType.requiresDuring) stages.push("during");
  if (jobType.requiresTesting) stages.push("testing");
  if (jobType.requiresAfter) stages.push("after");
  return stages;
}

export function outstandingRequirements(
  job: Job,
  jobType: JobType | undefined,
  variations: JobVariation[],
): Requirement[] {
  const misses: Requirement[] = [];
  const min = jobType?.minPhotosPerRequiredStage ?? 1;

  for (const stage of requiredStages(jobType)) {
    const count = job.photos.filter((photo) => photo.stage === stage).length;
    if (count < min) {
      misses.push({
        key: `evidence:${stage}`,
        title: `${STAGE_LABELS[stage]} evidence missing`,
        detail: `${jobType?.name ?? "This job type"} requires at least ${min} ${stage} photo${min === 1 ? "" : "s"}. ${count} captured.`,
        target: "evidence",
        stage,
      });
    }
  }

  if (job.workDoneNotes.trim().length === 0) {
    misses.push({
      key: "notes:work_done",
      title: "Work-done notes are empty",
      detail: "Record what you actually did on site before closing the job.",
      target: "notes",
    });
  }

  for (const variation of variations) {
    if (variation.status === "pending") {
      misses.push({
        key: `variation:${variation.id}`,
        title: "Unresolved variation",
        detail: variation.description,
        target: "variations",
      });
    }
  }

  for (const material of job.materials) {
    if (material.isJobCritical && !material.isCollected) {
      misses.push({
        key: `material:${material.id}`,
        title: "Job-critical material not collected",
        detail: `${material.quantity} × ${material.name}`,
        target: "materials",
      });
    }
  }

  const waived = new Set(job.waivers.map((waiver) => waiver.key));
  return misses.filter((miss) => !waived.has(miss.key));
}

export function canComplete(
  job: Job,
  jobType: JobType | undefined,
  variations: JobVariation[],
): boolean {
  return outstandingRequirements(job, jobType, variations).length === 0;
}
