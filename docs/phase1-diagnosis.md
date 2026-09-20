# Phase 1 — what the app actually stores today

Source of truth read: `src/lib/domain.ts`, `src/lib/seed.ts`, `src/lib/store.tsx`,
`src/lib/tenants.ts`, `src/lib/platform.tsx`, `src/lib/intake.ts`, `src/lib/completion.ts`
and every screen under `src/routes/app.*`, `src/routes/book.*`, `src/routes/owner.*`.

Money is stored as a plain number in pounds (e.g. `78`, `6.4`), never pence.
Dates are ISO strings; `dueDate` / `nextServiceDate` are date-only `YYYY-MM-DD`.
Every record already carries `orgId` (single demo org `org_rch`).

## jobs

| field                                                          | type                        | example                                                                                                                                   |
| -------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| id                                                             | string                      | `j_7`                                                                                                                                     |
| orgId                                                          | string                      | `org_rch`                                                                                                                                 |
| jobNumber                                                      | string                      | `J-0007`                                                                                                                                  |
| customerId / propertyId                                        | string                      | `c_12` / `p_9`                                                                                                                            |
| quoteId / enquiryId                                            | string \| null              | `q_3` / null                                                                                                                              |
| jobTypeId                                                      | string                      | `jt_jetting`                                                                                                                              |
| title                                                          | string                      | `Drain jetting, rear gully`                                                                                                               |
| reportedIssue / scope                                          | string                      | `Kitchen waste backing up`                                                                                                                |
| assignedToId                                                   | string                      | `tm_ray`                                                                                                                                  |
| isEmergency                                                    | boolean                     | `true`                                                                                                                                    |
| status                                                         | enum (9)                    | `in_progress` (`ready_to_book`,`booked`,`en_route`,`on_site`,`in_progress`,`awaiting_close_out`,`complete`,`return_required`,`cancelled`) |
| scheduledStart                                                 | ISO timestamp               | `2026-09-06T09:00:00.000Z`                                                                                                                |
| durationMinutes                                                | number                      | `120`                                                                                                                                     |
| workDoneNotes / partsUsedNotes / recommendations / testResults | string                      | `Jetted 12m, cleared wipes`                                                                                                               |
| photos                                                         | Photo[] (embedded)          | see below                                                                                                                                 |
| materials                                                      | MaterialItem[] (embedded)   | see below                                                                                                                                 |
| waivers                                                        | EvidenceWaiver[] (embedded) | see below                                                                                                                                 |
| completedAt                                                    | ISO \| null                 | null                                                                                                                                      |

Photo: `{ id, stage: before|during|testing|after, label, capturedAt, dataUrl? }`
e.g. `{ id:"ph_a1", stage:"before", label:"Gully before", capturedAt:"…", dataUrl:"data:image/jpeg;base64,…" }`

MaterialItem: `{ id, name, quantity, isJobCritical, isCollected }`
e.g. `{ id:"m1", name:"15mm isolation valve", quantity:2, isJobCritical:true, isCollected:true }`

EvidenceWaiver: `{ key, kind: not_applicable|exception, reason, recordedBy, recordedAt }`
`key` matches a `Requirement.key` from `completion.ts` (e.g. `photos:testing`, `notes:workDone`).

Variations are a separate top-level list, not embedded:
`JobVariation { id, orgId, jobId, description, amount, isVatable, status: pending|approved|declined|cancelled, approvedAt, approvedByNote, createdBy, createdAt }`

## quotes

`{ id, orgId, quoteNumber:"Q-0004", customerId, propertyId, enquiryId|null, jobTypeId|null,
status: draft|approval_required|sent|viewed|accepted|declined|expired|superseded,
lines: QuoteLine[], depositRule, depositPercentage:75, depositFixedAmount:0,
depositWaivedBy?, depositWaivedAt?, stagePayments: {id,name,amount}[],
lockedAt: ISO|null, createdAt, validUntil }`

QuoteLine: `{ id, description, quantity, unitPrice, isVatable }` — VAT is **per line**, boolean,
and the rate comes from `org.vatRate` (0.2). Totals in `domain.ts`: net = Σ qty×price;
vat = Σ over vatable lines only; gross = net + vat. Deposit rules:
`percentage | fixed_amount | none_trusted_customer | account_customer | stage_payments`.

## invoices

`{ id, orgId, invoiceNumber:"INV-0012", customerId, propertyId, jobId|null,
status: draft|issued|part_paid|paid|overdue|disputed|payment_plan|credited|written_off,
lines: QuoteLine[] (same shape as quotes), payments: Payment[], issuedAt, dueAt }`

Payment: `{ id, amount, paidAt, method: bank_transfer|card|cash }`
Balance = gross − Σ payments (same per-line VAT rule).

## price book items

`{ id:"pb_trv", orgId, code:"MAT-TRV", name:"Thermostatic radiator valve", unit:"each",
unitPrice:24.5, isVatable:true, category: callout|labour|materials|service, isArchived? }`

## tasks (standalone list)

`{ id, orgId, title, status: open|waiting|monitoring|due|complete|cancelled, dueDate:"2026-09-08",
linkedType?: job|quote|invoice|customer, linkedId? }` — these are **not** the job materials/evidence
items; jobs have no embedded task array.

## customers / properties

Customer: `{ id, orgId, name, phone, email, kind: residential|landlord|commercial, isAccountCustomer, notes }`
Property: `{ id, orgId, currentCustomerId|null, line1, town, postcode:"NN1 3ER", accessNotes,
boilerMake?, boilerModel?, boilerSerial?, boilerInstallYear?, nextServiceDate? }`
CustomerProperty (occupancy history): `{ id, orgId, customerId, propertyId,
relationship: owner_occupier|landlord|tenant|managing_agent|other, startedOn, endedOn|null, isCurrent }`

## job types

`{ id, orgId, name:"CCTV drain surveys", isActive, defaultDurationMinutes:90,
requiresBefore, requiresDuring, requiresTesting, requiresAfter, minPhotosPerRequiredStage:1, notes }`
Customer-facing problem labels currently live separately in `tenants.ts` as
`problemCards: { label, service }[]`.

## organizations / tenant config

Split across two mock stores today:

- `OrgSettings` (app side): `{ id, name, tradingName, phone, email, town, vatRate:0.2,
defaultDepositRule, defaultDepositPercentage:75, minimumCalloutItemId }`
- `Account` (platform side): `{ id, slug, businessName, ownerName, email, phone, town, postcode,
signupDate, subscriptionStatus, trialEndsAt, lastActiveAt, lastLoginAt, + aggregate counts, setup{5 booleans}, statusReason }`
- `TenantProfile` (booking site): `{ trade, primaryService, positioning, county, hours,
openingHours: {days[],opens,closes}[], serviceArea, towns: {name, prefix, areaIntro?}[],
problems[], gasSafe?, vatNumber?, companyNumber?, address?, noFixNoFee?, photosWithEveryJob?,
websiteUrl?, hasOwnDomain? (default false), rating? {value,count}, reviewsUrl?, legalName?,
registeredOffice?, credentials[]?, services[]?, problemCards[]?, hero {headline,sub,reassurance}?,
waterAuthorityNote? }`

## web enquiries

`{ id, orgId, reference:"E-0031", customerId|null, propertyId|null, jobTypeId|null, contactName,
phone, email?, rawAddress, description (service/area/video lines appended), isEmergency,
urgency: emergency|urgent|standard|flexible, valueBand: small|medium|large,
status: new|needs_contact|awaiting_customer|qualified|quoted|converted|declined, declineReason?,
receivedAt, source: web|phone|manual, photos: Photo[] (max 3, compressed to 1000px JPEG),
preferredTiming }`
The "New | web" chip is driven by `status === "new"` + `source === "web"`.
Videos are stored as **references only** (`{id,name,size}`, max 2, 50MB) folded into `description`.
The honeypot field is form-only and never persisted.

## demo owner console

12 fictional `Account` rows in `platform.tsx` + `audit[]`, `contactSubmissions[]`,
`settings { monthlyPrice:69, trialDays:14, contactEmail, contactPhone }`, `currentAccountId`,
`isPlatformOwner`. MRR = `accounts.filter(active).length × monthlyPrice`. Growth chart is built
from `signupDate`. Comp feature = `setStatus(id,"comped",reason)` writing an audit row.
**Nothing here will ever touch Supabase.**

## Two blockers before Phase 2

1. Your project is not connected to this app, so I cannot run SQL against it. Anon-key probes
   confirm the nine tables exist and RLS is on (every read returns `[]`, OpenAPI introspection is
   disabled), but I cannot read their columns. Connect it under Project Settings → Connectors →
   Supabase, or paste the column list of `organizations`, `jobs`, `customers`, `quotes`,
   `invoices`, so the ALTERs below match reality.
2. The migration's ALTER statements are written defensively (`ADD COLUMN IF NOT EXISTS`) for that
   reason; the CREATE TABLE statements are safe as-is.
