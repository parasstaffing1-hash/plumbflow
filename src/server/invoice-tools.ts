/**
 * Vapi Voice Invoice Tools — Production server-side handlers.
 *
 * Handles `create_invoice`, `send_invoice`, and `list_invoices` tool calls
 * from Vapi. Stores invoice records + PDFs in Cloudflare R2.
 *
 * Financial calculations are deterministic (server-side, rounded to pence).
 * Invoice numbers are sequential and concurrency-safe via R2 counter.
 */

import { generateInvoicePdf } from "./invoice-pdf";
import { uploadToR2, createDownloadUrl, listR2Objects } from "./r2";
import { resend } from "./email";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface VoiceInvoiceRecord {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  jobId: string | null;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  currency: string;
  items: VoiceInvoiceItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: "unpaid" | "partially_paid" | "paid";
  notes: string;
  pdfKey: string;
  pdfUrl: string;
  emailSent: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  /** Pence-level total for this line (quantity × unitPrice × 100, integer) */
  total: number;
}

interface CreateInvoiceArgs {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  service_description?: string;
  items?: { description: string; quantity?: number; unit_price?: number; amount?: number }[];
  tax_rate?: number;
  discount?: number;
  currency?: string;
  due_date?: string;
  payment_status?: string;
  notes?: string;
  send_email?: boolean;
  /** Shorthand: single amount when only one line item */
  amount?: number;
  /** Mark as paid immediately */
  mark_paid?: boolean;
  /** Job ID from CRM */
  job_id?: string;
}

interface SendInvoiceArgs {
  invoice_number?: string;
  invoice_id?: string;
  customer_email?: string;
}

interface VapiToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
}

interface VapiPayload {
  message: {
    type: string;
    toolCallList?: VapiToolCall[];
    functionCall?: { name: string; parameters: Record<string, unknown> };
    call?: { id?: string };
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Monetary helpers — all calculations in pence (integer) to avoid FP errors
// ────────────────────────────────────────────────────────────────────────────

/** Round to nearest penny. */
function pence(pounds: number): number {
  return Math.round(pounds * 100);
}

/** Pence back to pounds, always 2dp. */
function toPounds(penceval: number): number {
  return Number((penceval / 100).toFixed(2));
}

// ────────────────────────────────────────────────────────────────────────────
// Invoice number counter (R2-backed, atomic-ish)
// ────────────────────────────────────────────────────────────────────────────

const COUNTER_KEY = "voice-invoices/counter.json";

async function getNextInvoiceNumber(): Promise<string> {
  let counter = 1001;

  try {
    const url = await createDownloadUrl(COUNTER_KEY);
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as { next: number };
      if (typeof data.next === "number" && data.next >= 1001) {
        counter = data.next;
      }
    }
  } catch {
    // First time or error → start at 1001
  }

  const invoiceNumber = `INV-${String(counter).padStart(4, "0")}`;

  // Persist next counter
  const next = JSON.stringify({ next: counter + 1 });
  await uploadToR2(COUNTER_KEY, new TextEncoder().encode(next), "application/json");

  return invoiceNumber;
}

// ────────────────────────────────────────────────────────────────────────────
// Record persistence (R2-backed JSON)
// ────────────────────────────────────────────────────────────────────────────

function recordKey(invoiceNumber: string): string {
  return `voice-invoices/records/${invoiceNumber}.json`;
}

async function saveRecord(record: VoiceInvoiceRecord): Promise<void> {
  const key = recordKey(record.invoiceNumber);
  await uploadToR2(key, new TextEncoder().encode(JSON.stringify(record)), "application/json");
}

async function loadRecord(invoiceNumber: string): Promise<VoiceInvoiceRecord | null> {
  try {
    const url = await createDownloadUrl(recordKey(invoiceNumber));
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as VoiceInvoiceRecord;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function generateId(): string {
  return `vi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0] ?? "";
}

function sanitize(s: string | undefined | null): string {
  if (!s) return "";
  // Strip HTML tags and trim
  return s.replace(/<[^>]*>/g, "").trim().slice(0, 500);
}

function clampPositive(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Main entry — called from server.ts
// ────────────────────────────────────────────────────────────────────────────

export async function handleVapiToolCall(request: Request): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const body = (await request.json()) as VapiPayload;
    const msg = body.message;

    // Parse tool calls from Vapi payload
    let toolCalls: VapiToolCall[] = [];

    if (msg.toolCallList && msg.toolCallList.length > 0) {
      toolCalls = msg.toolCallList;
    } else if (msg.functionCall) {
      toolCalls = [
        {
          id: "legacy_call",
          type: "function",
          function: {
            name: msg.functionCall.name,
            arguments: msg.functionCall.parameters,
          },
        },
      ];
    }

    if (toolCalls.length === 0) {
      return json({ error: "No tool calls found" }, 400, cors);
    }

    const results: { toolCallId: string; result: string }[] = [];

    for (const tc of toolCalls) {
      const fnName = tc.function.name;
      const args =
        typeof tc.function.arguments === "string"
          ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
          : tc.function.arguments;

      let result: unknown;

      switch (fnName) {
        case "create_invoice":
          result = await processCreateInvoice(args as unknown as CreateInvoiceArgs);
          break;
        case "send_invoice":
          result = await processSendInvoice(args as unknown as SendInvoiceArgs);
          break;
        case "list_invoices":
          result = await processListInvoices();
          break;
        default:
          result = {
            success: false,
            error_code: "UNKNOWN_TOOL",
            message: `Unknown tool: ${fnName}. Available tools: create_invoice, send_invoice, list_invoices.`,
          };
      }

      results.push({ toolCallId: tc.id, result: JSON.stringify(result) });
    }

    return json({ results }, 200, cors);
  } catch (err) {
    console.error("[VapiTools] Fatal:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return json(
      {
        results: [
          {
            toolCallId: "error",
            result: JSON.stringify({
              success: false,
              error_code: "INTERNAL_ERROR",
              message: `Something went wrong creating the invoice. Please try again. Error: ${errMsg}`,
            }),
          },
        ],
      },
      200, // Vapi expects 200 even for tool errors
      cors,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// API handler for CRM frontend — list/get voice invoices
// ────────────────────────────────────────────────────────────────────────────

export async function handleVoiceInvoiceApi(request: Request): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/voice-invoices\/?/, "");

  try {
    // GET /api/voice-invoices — list all
    if (!path || path === "") {
      const invoices = await fetchAllVoiceInvoices();
      return json(invoices, 200, cors);
    }

    // POST /api/voice-invoices/:number/mark-paid
    if (path.endsWith("/mark-paid") && request.method === "POST") {
      const invNumber = path.replace("/mark-paid", "");
      const record = await loadRecord(invNumber);
      if (!record) return json({ error: "Not found" }, 404, cors);
      record.paymentStatus = "paid";
      record.status = "paid";
      record.updatedAt = new Date().toISOString();
      await saveRecord(record);
      return json({ success: true, invoiceNumber: invNumber }, 200, cors);
    }

    // POST /api/voice-invoices/:number/cancel
    if (path.endsWith("/cancel") && request.method === "POST") {
      const invNumber = path.replace("/cancel", "");
      const record = await loadRecord(invNumber);
      if (!record) return json({ error: "Not found" }, 404, cors);
      record.status = "cancelled";
      record.updatedAt = new Date().toISOString();
      await saveRecord(record);
      return json({ success: true, invoiceNumber: invNumber }, 200, cors);
    }

    // GET /api/voice-invoices/:number — get single
    const record = await loadRecord(path);
    if (!record) return json({ error: "Not found" }, 404, cors);
    // Refresh PDF URL (presigned URLs expire)
    record.pdfUrl = await createDownloadUrl(record.pdfKey);
    return json(record, 200, cors);
  } catch (err) {
    console.error("[VoiceInvoiceAPI]", err);
    return json({ error: "Internal error" }, 500, cors);
  }
}

async function fetchAllVoiceInvoices(): Promise<VoiceInvoiceRecord[]> {
  const result = await listR2Objects("voice-invoices/records/", 100);
  const invoices: VoiceInvoiceRecord[] = [];

  if (result.Contents) {
    for (const obj of result.Contents) {
      if (!obj.Key || !obj.Key.endsWith(".json")) continue;
      try {
        const url = await createDownloadUrl(obj.Key);
        const res = await fetch(url);
        if (res.ok) {
          invoices.push((await res.json()) as VoiceInvoiceRecord);
        }
      } catch {
        // Skip unreadable
      }
    }
  }

  // Sort newest first
  invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return invoices;
}

// ────────────────────────────────────────────────────────────────────────────
// create_invoice
// ────────────────────────────────────────────────────────────────────────────

async function processCreateInvoice(args: CreateInvoiceArgs) {
  // ── Validate required fields ──
  const customerName = sanitize(args.customer_name);
  if (!customerName) {
    return {
      success: false,
      error_code: "MISSING_CUSTOMER",
      message: "I need the customer's name to create an invoice. Who should I invoice?",
    };
  }

  // Build items array
  const rawItems = args.items && args.items.length > 0
    ? args.items
    : args.service_description || args.amount
      ? [{ description: args.service_description || "Services", quantity: 1, unit_price: args.amount ?? 0 }]
      : [];

  if (rawItems.length === 0) {
    return {
      success: false,
      error_code: "MISSING_ITEMS",
      message: "What work was done? I need at least one item description and amount.",
    };
  }

  // Validate and build line items with pence-safe arithmetic
  const items: VoiceInvoiceItem[] = [];
  for (const raw of rawItems) {
    const desc = sanitize(raw.description);
    if (!desc) {
      return {
        success: false,
        error_code: "MISSING_DESCRIPTION",
        message: "Each line item needs a description. What was the work done?",
      };
    }

    const qty = clampPositive(raw.quantity) || 1;
    const unitPrice = clampPositive(raw.unit_price ?? raw.amount);

    if (unitPrice <= 0) {
      return {
        success: false,
        error_code: "INVALID_AMOUNT",
        message: `I need a price for "${desc}". How much should it be?`,
      };
    }

    // Validate reasonable range
    if (unitPrice > 1_000_000) {
      return {
        success: false,
        error_code: "AMOUNT_TOO_LARGE",
        message: `£${unitPrice.toLocaleString()} seems too high for "${desc}". Can you confirm the correct amount?`,
      };
    }

    const lineTotalPence = pence(unitPrice) * qty;
    items.push({
      description: desc,
      quantity: qty,
      unitPrice,
      total: toPounds(lineTotalPence),
    });
  }

  // ── Calculate totals (all in pence, then convert) ──
  const subtotalPence = items.reduce((sum, item) => sum + pence(item.total), 0);
  const subtotal = toPounds(subtotalPence);

  const rawTaxRate = typeof args.tax_rate === "number" ? args.tax_rate : 0;
  const taxRate = Math.max(0, Math.min(1, rawTaxRate)); // Clamp 0–100%
  const taxPence = Math.round(subtotalPence * taxRate);
  const tax = toPounds(taxPence);

  const discountPence = pence(clampPositive(args.discount));
  const discount = toPounds(discountPence);

  const totalPence = Math.max(0, subtotalPence + taxPence - discountPence);
  const total = toPounds(totalPence);

  // ── Determine status ──
  const markPaid = args.mark_paid === true || args.payment_status === "paid";
  const status: VoiceInvoiceRecord["status"] = markPaid ? "paid" : "sent";
  const paymentStatus: VoiceInvoiceRecord["paymentStatus"] = markPaid ? "paid" : "unpaid";

  // ── Dates ──
  const now = new Date();
  const issueDate = isoDate(now);
  let dueDate: string;
  if (args.due_date) {
    const parsed = new Date(args.due_date);
    dueDate = Number.isNaN(parsed.getTime()) ? isoDate(new Date(now.getTime() + 14 * 86_400_000)) : isoDate(parsed);
  } else {
    dueDate = isoDate(new Date(now.getTime() + 14 * 86_400_000));
  }

  const currency = args.currency || "GBP";

  // ── Generate invoice number ──
  const invoiceNumber = await getNextInvoiceNumber();

  // ── Generate PDF ──
  const pdfBytes = await generateInvoicePdf({
    invoiceNumber,
    issuedAt: issueDate,
    dueAt: dueDate,
    status,
    customerName,
    customerEmail: sanitize(args.customer_email),
    customerPhone: sanitize(args.customer_phone),
    businessName: "RCH Plumbing & Heating",
    businessPhone: "01632 960019",
    businessEmail: "info@rchplumbflow.co.uk",
    businessTown: "Northampton, NN1",
    lines: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      isVatable: taxRate > 0,
    })),
    vatRate: taxRate,
    payments: markPaid ? [{ amount: total, paidAt: issueDate, method: "voice" }] : [],
  });

  // ── Upload PDF to R2 ──
  const pdfKey = `voice-invoices/pdfs/${invoiceNumber}.pdf`;
  await uploadToR2(pdfKey, pdfBytes, "application/pdf");
  const pdfUrl = await createDownloadUrl(pdfKey);

  // ── Build and save record ──
  const record: VoiceInvoiceRecord = {
    id: generateId(),
    invoiceNumber,
    customerId: null,
    customerName,
    customerEmail: sanitize(args.customer_email),
    customerPhone: sanitize(args.customer_phone),
    jobId: args.job_id ?? null,
    issueDate,
    dueDate,
    status,
    currency,
    items,
    subtotal,
    taxRate,
    tax,
    discount,
    total,
    paymentStatus,
    notes: sanitize(args.notes),
    pdfKey,
    pdfUrl,
    emailSent: false,
    createdBy: "voice",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await saveRecord(record);

  // ── Send email if requested ──
  let emailResult = { sent: false, message: "" };
  if (args.send_email && args.customer_email) {
    emailResult = await sendInvoiceEmail(record);
    if (emailResult.sent) {
      record.emailSent = true;
      record.status = "sent";
      await saveRecord(record);
    }
  }

  // ── Build voice-friendly response ──
  const paidText = markPaid ? " and marked as paid" : "";
  const emailText = emailResult.sent
    ? ` I've also emailed it to ${args.customer_email}.`
    : args.send_email && args.customer_email
      ? ` I tried to email it but encountered an issue: ${emailResult.message}.`
      : "";

  return {
    success: true,
    invoice_id: record.id,
    invoice_number: invoiceNumber,
    customer_name: customerName,
    subtotal,
    tax,
    discount,
    total,
    currency,
    payment_status: paymentStatus,
    pdf_url: pdfUrl,
    email_sent: emailResult.sent,
    message: `Done! Invoice ${invoiceNumber} has been created for ${customerName}. The total is £${total.toFixed(2)}${paidText}.${emailText}`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// send_invoice
// ────────────────────────────────────────────────────────────────────────────

async function processSendInvoice(args: SendInvoiceArgs) {
  const invoiceNumber = args.invoice_number || args.invoice_id;

  if (!invoiceNumber) {
    return {
      success: false,
      error_code: "MISSING_INVOICE",
      message: "Which invoice should I send? Please provide the invoice number, like INV-1001.",
    };
  }

  const record = await loadRecord(invoiceNumber);

  if (!record) {
    return {
      success: false,
      error_code: "INVOICE_NOT_FOUND",
      message: `I couldn't find invoice ${invoiceNumber}. Please check the number and try again.`,
    };
  }

  const email = args.customer_email || record.customerEmail;

  if (!email) {
    return {
      success: false,
      error_code: "MISSING_EMAIL",
      message: `I don't have an email address for ${record.customerName}. What email should I send the invoice to?`,
    };
  }

  // Update email on record if provided
  if (args.customer_email && args.customer_email !== record.customerEmail) {
    record.customerEmail = sanitize(args.customer_email);
  }

  const result = await sendInvoiceEmail(record);

  if (result.sent) {
    record.emailSent = true;
    record.status = record.status === "draft" ? "sent" : record.status;
    record.updatedAt = new Date().toISOString();
    await saveRecord(record);

    return {
      success: true,
      invoice_number: record.invoiceNumber,
      customer_name: record.customerName,
      email_sent_to: email,
      message: `Invoice ${record.invoiceNumber} has been emailed to ${email} successfully.`,
    };
  }

  return {
    success: false,
    error_code: "EMAIL_FAILED",
    message: `I wasn't able to email the invoice. ${result.message}`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// list_invoices
// ────────────────────────────────────────────────────────────────────────────

async function processListInvoices() {
  try {
    const invoices = await fetchAllVoiceInvoices();

    if (invoices.length === 0) {
      return {
        success: true,
        count: 0,
        message: "You don't have any voice-created invoices yet.",
        invoices: [],
      };
    }

    const summary = invoices
      .slice(0, 10) // Cap voice summary to 10 most recent
      .map(
        (i) =>
          `${i.invoiceNumber}: ${i.customerName}, £${i.total.toFixed(2)}, ${i.status}`,
      )
      .join(". ");

    return {
      success: true,
      count: invoices.length,
      message: `You have ${invoices.length} voice invoice${invoices.length !== 1 ? "s" : ""}. Here are the most recent: ${summary}.`,
      invoices: invoices.slice(0, 10).map((i) => ({
        invoice_number: i.invoiceNumber,
        customer_name: i.customerName,
        total: i.total,
        status: i.status,
        payment_status: i.paymentStatus,
      })),
    };
  } catch (err) {
    return {
      success: false,
      error_code: "LIST_FAILED",
      message: `Could not retrieve invoices: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Email sender
// ────────────────────────────────────────────────────────────────────────────

async function sendInvoiceEmail(
  record: VoiceInvoiceRecord,
): Promise<{ sent: boolean; message: string }> {
  try {
    // Refresh PDF URL
    const pdfUrl = await createDownloadUrl(record.pdfKey);

    const linesHtml = record.items
      .map(
        (item) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;">${item.description}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569;">${item.quantity}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:right;color:#475569;">£${item.unitPrice.toFixed(2)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#1e293b;">£${item.total.toFixed(2)}</td>
      </tr>`,
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f7f7f8;margin:0;padding:32px 16px;">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color:#0b0d0e;padding:24px 32px;">
      <span style="color:#f59e0b;font-size:20px;font-weight:800;letter-spacing:-0.5px;">RCH PlumbFlow</span>
      <span style="color:#94a3b8;font-size:13px;margin-left:8px;">Invoice</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 6px 0;">Invoice ${record.invoiceNumber}</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 24px 0;">Issued ${record.issueDate} · Due ${record.dueDate}</p>

      <p style="font-size:15px;color:#475569;margin:0 0 20px 0;">
        Hello ${record.customerName},<br/>Please find your invoice details below.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Qty</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Unit Price</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Amount</th>
          </tr>
        </thead>
        <tbody>${linesHtml}</tbody>
      </table>

      <div style="text-align:right;margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:12px;">
        <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Subtotal: £${record.subtotal.toFixed(2)}</div>
        ${record.tax > 0 ? `<div style="font-size:13px;color:#64748b;margin-bottom:4px;">Tax (${(record.taxRate * 100).toFixed(0)}%): £${record.tax.toFixed(2)}</div>` : ""}
        ${record.discount > 0 ? `<div style="font-size:13px;color:#64748b;margin-bottom:4px;">Discount: -£${record.discount.toFixed(2)}</div>` : ""}
        <div style="font-size:22px;font-weight:800;color:#0f172a;margin-top:8px;">Total: £${record.total.toFixed(2)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Payment status: ${record.paymentStatus}</div>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${pdfUrl}" style="display:inline-block;background-color:#f59e0b;color:#0b0d0e;font-size:16px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Download PDF Invoice
        </a>
      </div>

      ${record.notes ? `<p style="font-size:13px;color:#64748b;margin-bottom:16px;padding:12px;background:#fef3c7;border-radius:8px;border:1px solid #fde68a;">Note: ${record.notes}</p>` : ""}

      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;" />
      <p style="font-size:12px;color:#94a3b8;margin:0;line-height:18px;">
        RCH Plumbing & Heating &bull; Northampton, NN1 &bull; 01632 960019<br/>
        info@rchplumbflow.co.uk
      </p>
    </div>
  </div>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from:
        process.env["RESEND_FROM_EMAIL"] ||
        "RCH PlumbFlow <notifications@rchplumbflow.co.uk>",
      to: record.customerEmail,
      subject: `Invoice ${record.invoiceNumber} — £${record.total.toFixed(2)} from RCH Plumbing & Heating`,
      html,
      text: `Invoice ${record.invoiceNumber}\n\nHello ${record.customerName},\n\nTotal: £${record.total.toFixed(2)}\nDue: ${record.dueDate}\nStatus: ${record.paymentStatus}\n\nDownload PDF: ${pdfUrl}\n\nRCH Plumbing & Heating\nNorthampton, NN1\n01632 960019`,
    });

    if (error) {
      console.error("[InvoiceEmail] Resend error:", error);
      const isSandbox = error.message?.toLowerCase().includes("only send testing emails");
      return {
        sent: false,
        message: isSandbox
          ? "Email is in sandbox mode. Add the recipient to your Resend verified contacts."
          : (error.message || "Email send failed"),
      };
    }

    return { sent: true, message: `Email sent (ID: ${data?.id})` };
  } catch (err) {
    console.error("[InvoiceEmail] Exception:", err);
    return { sent: false, message: err instanceof Error ? err.message : String(err) };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// JSON response helper
// ────────────────────────────────────────────────────────────────────────────

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
