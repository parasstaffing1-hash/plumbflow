/**
 * RCH PlumbFlow, domain model (Phase 1).
 *
 * This mirrors the intended Postgres schema one-for-one so the move to a real
 * backend is a transcription job, not a redesign. Every record carries orgId.
 */

export type Role = "owner" | "office_admin" | "engineer" | "subcontractor" | "read_only";

export type EnquiryStatus =
  "new" | "needs_contact" | "awaiting_customer" | "qualified" | "quoted" | "converted" | "declined";

export type QuoteStatus =
  | "draft"
  | "approval_required"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired"
  | "superseded";

export type JobStatus =
  | "ready_to_book"
  | "booked"
  | "en_route"
  | "on_site"
  | "in_progress"
  | "awaiting_close_out"
  | "complete"
  | "return_required"
  | "cancelled";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "part_paid"
  | "paid"
  | "overdue"
  | "disputed"
  | "payment_plan"
  | "credited"
  | "written_off";

export type TaskStatus = "open" | "waiting" | "monitoring" | "due" | "complete" | "cancelled";

export type EvidenceStage = "before" | "during" | "testing" | "after";

export type DepositRule =
  "percentage" | "fixed_amount" | "none_trusted_customer" | "account_customer" | "stage_payments";

export type PropertyRelationship =
  "owner_occupier" | "landlord" | "tenant" | "managing_agent" | "other";

export const STATUS_LABELS: Record<string, string> = {
  // enquiry
  new: "New",
  needs_contact: "Needs contact",
  awaiting_customer: "Awaiting customer",
  qualified: "Qualified",
  quoted: "Quoted",
  converted: "Converted",
  declined: "Declined",
  // quote
  draft: "Draft",
  approval_required: "Approval required",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  expired: "Expired",
  superseded: "Superseded",
  // job
  ready_to_book: "Ready to book",
  booked: "Booked",
  en_route: "En route",
  on_site: "On site",
  in_progress: "In progress",
  awaiting_close_out: "Awaiting close-out",
  complete: "Complete",
  return_required: "Return required",
  cancelled: "Cancelled",
  // invoice
  issued: "Issued",
  part_paid: "Part paid",
  paid: "Paid",
  overdue: "Overdue",
  disputed: "Disputed",
  payment_plan: "Payment plan",
  credited: "Credited",
  written_off: "Written off",
  // task
  open: "Open",
  waiting: "Waiting",
  monitoring: "Monitoring",
  due: "Due",
  // variation
  pending: "Pending",
  approved: "Approved",
};

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  "new",
  "needs_contact",
  "awaiting_customer",
  "qualified",
  "quoted",
  "converted",
  "declined",
];

export const JOB_STATUSES: JobStatus[] = [
  "ready_to_book",
  "booked",
  "en_route",
  "on_site",
  "in_progress",
  "awaiting_close_out",
  "complete",
  "return_required",
  "cancelled",
];

export const QUOTE_STATUSES: QuoteStatus[] = [
  "draft",
  "approval_required",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "superseded",
];

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "issued",
  "part_paid",
  "paid",
  "overdue",
  "disputed",
  "payment_plan",
  "credited",
  "written_off",
];

/** The on-site control only ever offers the next sensible step. */
export const NEXT_JOB_STEP: Partial<Record<JobStatus, { to: JobStatus; label: string }>> = {
  ready_to_book: { to: "booked", label: "Book job" },
  booked: { to: "en_route", label: "Start travel" },
  en_route: { to: "on_site", label: "Arrived on site" },
  on_site: { to: "in_progress", label: "Start work" },
  in_progress: { to: "awaiting_close_out", label: "Finish work" },
};

export interface JobType {
  id: string;
  orgId: string;
  name: string;
  isActive: boolean;
  defaultDurationMinutes: number;
  requiresBefore: boolean;
  requiresDuring: boolean;
  requiresTesting: boolean;
  requiresAfter: boolean;
  minPhotosPerRequiredStage: number;
  notes: string;
}

export interface Customer {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  email: string;
  kind: "residential" | "landlord" | "commercial";
  isAccountCustomer: boolean;
  notes: string;
}

export interface Property {
  id: string;
  orgId: string;
  /** Deliberately nullable: a property outlives any one customer. */
  currentCustomerId: string | null;
  line1: string;
  town: string;
  postcode: string;
  accessNotes: string;
  boilerMake?: string;
  boilerModel?: string;
  boilerSerial?: string;
  boilerInstallYear?: number;
  nextServiceDate?: string;
}

export interface CustomerProperty {
  id: string;
  orgId: string;
  customerId: string;
  propertyId: string;
  relationship: PropertyRelationship;
  startedOn: string;
  endedOn: string | null;
  isCurrent: boolean;
}

export interface Enquiry {
  id: string;
  orgId: string;
  reference: string;
  customerId: string | null;
  propertyId: string | null;
  jobTypeId: string | null;
  contactName: string;
  phone: string;
  rawAddress: string;
  description: string;
  isEmergency: boolean;
  urgency: "emergency" | "urgent" | "standard" | "flexible";
  valueBand: "small" | "medium" | "large";
  status: EnquiryStatus;
  declineReason?: string;
  receivedAt: string;
  /** Where the enquiry came from. Web form submissions come in as "web". */
  source?: "web" | "phone" | "manual";
  /** Photos attached by the homeowner on the public booking page. */
  photos?: Photo[];
  /** Free text preference captured by the public form. */
  preferredTiming?: string;
  email?: string;
}

export interface PriceBookItem {
  id: string;
  orgId: string;
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  isVatable: boolean;
  category: "callout" | "labour" | "materials" | "service";
  /** Archived items stay on old quotes but drop out of pickers. */
  isArchived?: boolean;
}

export interface StagePayment {
  id: string;
  name: string;
  amount: number;
}

export interface QuoteLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isVatable: boolean;
}

export interface Quote {
  id: string;
  orgId: string;
  quoteNumber: string;
  customerId: string;
  propertyId: string;
  enquiryId: string | null;
  jobTypeId: string | null;
  status: QuoteStatus;
  lines: QuoteLine[];
  depositRule: DepositRule;
  depositPercentage: number;
  depositFixedAmount: number;
  depositWaivedBy?: string;
  depositWaivedAt?: string;
  stagePayments: StagePayment[];
  /** Accepted quotes lock: no further edits. */
  lockedAt: string | null;
  createdAt: string;
  validUntil: string;
}

export interface Photo {
  id: string;
  stage: EvidenceStage;
  label: string;
  capturedAt: string;
  /** Prototype placeholder, a real build stores a storage path. */
  dataUrl?: string;
}

export interface JobVariation {
  id: string;
  orgId: string;
  jobId: string;
  description: string;
  amount: number;
  isVatable: boolean;
  status: "pending" | "approved" | "declined" | "cancelled";
  approvedAt: string | null;
  approvedByNote: string;
  createdBy: string;
  createdAt: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  isJobCritical: boolean;
  isCollected: boolean;
}

export interface EvidenceWaiver {
  key: string;
  kind: "not_applicable" | "exception";
  reason: string;
  recordedBy: string;
  recordedAt: string;
}

export interface Job {
  id: string;
  orgId: string;
  jobNumber: string;
  customerId: string;
  propertyId: string;
  quoteId: string | null;
  enquiryId: string | null;
  jobTypeId: string;
  title: string;
  reportedIssue: string;
  scope: string;
  assignedToId: string;
  isEmergency: boolean;
  status: JobStatus;
  scheduledStart: string;
  durationMinutes: number;
  workDoneNotes: string;
  partsUsedNotes: string;
  recommendations: string;
  testResults: string;
  photos: Photo[];
  materials: MaterialItem[];
  waivers: EvidenceWaiver[];
  completedAt: string | null;
}

export interface Payment {
  id: string;
  amount: number;
  paidAt: string;
  method: "bank_transfer" | "card" | "cash";
}

export interface Invoice {
  id: string;
  orgId: string;
  invoiceNumber: string;
  customerId: string;
  propertyId: string;
  jobId: string | null;
  status: InvoiceStatus;
  lines: QuoteLine[];
  payments: Payment[];
  issuedAt: string | null;
  dueAt: string | null;
}

export interface TaskItem {
  id: string;
  orgId: string;
  title: string;
  status: TaskStatus;
  dueDate: string;
  linkedType?: "job" | "quote" | "invoice" | "customer";
  linkedId?: string;
}

export interface ActivityEntry {
  id: string;
  orgId: string;
  entityType: "job" | "quote" | "invoice" | "customer" | "enquiry" | "property";
  entityId: string;
  /** Plain English, already rendered for humans. */
  message: string;
  actor: string;
  at: string;
}

export interface TeamMember {
  id: string;
  orgId: string;
  name: string;
  role: Role;
}

export interface OrgSettings {
  id: string;
  name: string;
  tradingName: string;
  phone: string;
  email: string;
  town: string;
  vatRate: number;
  defaultDepositRule: DepositRule;
  defaultDepositPercentage: number;
  minimumCalloutItemId: string | null;
}

export interface AppData {
  org: OrgSettings;
  team: TeamMember[];
  currentUserId: string;
  jobTypes: JobType[];
  customers: Customer[];
  properties: Property[];
  customerProperties: CustomerProperty[];
  enquiries: Enquiry[];
  priceBook: PriceBookItem[];
  quotes: Quote[];
  jobs: Job[];
  variations: JobVariation[];
  invoices: Invoice[];
  tasks: TaskItem[];
  activity: ActivityEntry[];
  counters: { quote: number; job: number; invoice: number; enquiry: number };
}

/* ---------- role capability matrix (B6) ---------- */

export interface Capabilities {
  seeMoney: boolean;
  editPriceBook: boolean;
  seeOrgSettings: boolean;
  seeCustomerContact: boolean;
  canEdit: boolean;
  seeAllJobs: boolean;
}

export function capabilitiesFor(role: Role): Capabilities {
  switch (role) {
    case "owner":
    case "office_admin":
      return {
        seeMoney: true,
        editPriceBook: role === "owner",
        seeOrgSettings: true,
        seeCustomerContact: true,
        canEdit: true,
        seeAllJobs: true,
      };
    case "engineer":
      return {
        seeMoney: false,
        editPriceBook: false,
        seeOrgSettings: false,
        seeCustomerContact: true,
        canEdit: true,
        seeAllJobs: false,
      };
    case "subcontractor":
      return {
        seeMoney: false,
        editPriceBook: false,
        seeOrgSettings: false,
        seeCustomerContact: false,
        canEdit: true,
        seeAllJobs: false,
      };
    case "read_only":
    default:
      return {
        seeMoney: true,
        editPriceBook: false,
        seeOrgSettings: false,
        seeCustomerContact: true,
        canEdit: false,
        seeAllJobs: true,
      };
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  office_admin: "Office admin",
  engineer: "Engineer",
  subcontractor: "Subcontractor",
  read_only: "Read only",
};

export const RELATIONSHIP_LABELS: Record<PropertyRelationship, string> = {
  owner_occupier: "Owner occupier",
  landlord: "Landlord",
  tenant: "Tenant",
  managing_agent: "Managing agent",
  other: "Other",
};

export const STAGE_LABELS: Record<EvidenceStage, string> = {
  before: "Before",
  during: "During",
  testing: "Testing",
  after: "After",
};

/* ---------- derived money helpers ---------- */

export function lineTotal(line: QuoteLine): number {
  return line.quantity * line.unitPrice;
}

export function quoteNet(quote: Quote): number {
  return quote.lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function quoteVat(quote: Quote, vatRate: number): number {
  return quote.lines
    .filter((line) => line.isVatable)
    .reduce((sum, line) => sum + lineTotal(line) * vatRate, 0);
}

export function quoteGross(quote: Quote, vatRate: number): number {
  return quoteNet(quote) + quoteVat(quote, vatRate);
}

export function invoiceNet(invoice: Invoice): number {
  return invoice.lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function invoiceVat(invoice: Invoice, vatRate: number): number {
  return invoice.lines
    .filter((line) => line.isVatable)
    .reduce((sum, line) => sum + lineTotal(line) * vatRate, 0);
}

export function invoiceGross(invoice: Invoice, vatRate: number): number {
  return invoiceNet(invoice) + invoiceVat(invoice, vatRate);
}

export function invoicePaid(invoice: Invoice): number {
  return invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
}

export function invoiceBalance(invoice: Invoice, vatRate: number): number {
  return invoiceGross(invoice, vatRate) - invoicePaid(invoice);
}

export function depositDue(quote: Quote, vatRate: number): number {
  const gross =
    quoteNet(quote) +
    quote.lines.filter((l) => l.isVatable).reduce((s, l) => s + lineTotal(l) * vatRate, 0);
  switch (quote.depositRule) {
    case "percentage":
      return (gross * quote.depositPercentage) / 100;
    case "fixed_amount":
      return quote.depositFixedAmount;
    case "stage_payments":
      return quote.stagePayments.reduce((sum, stage) => sum + stage.amount, 0);
    default:
      return 0;
  }
}
