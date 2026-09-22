import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface InvoicePdfLine {
  description: string;
  quantity: number;
  unitPrice: number;
  isVatable: boolean;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  issuedAt: string;
  dueAt: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessTown: string;
  lines: InvoicePdfLine[];
  vatRate: number;
  payments: { amount: number; paidAt: string; method: string }[];
}

/**
 * Generate a professional PDF invoice buffer.
 * Works in Cloudflare Workers (no Node-only APIs).
 */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0, 0, 0);
  const grey = rgb(0.4, 0.4, 0.4);
  const amber = rgb(0.961, 0.62, 0.043); // #f59e0b
  const darkBg = rgb(0.043, 0.051, 0.055); // #0b0d0e

  const W = 595;
  const margin = 50;
  let y = 792;

  // ─── Header bar ───
  page.drawRectangle({ x: 0, y: y - 10, width: W, height: 60, color: darkBg });
  page.drawText("RCH PlumbFlow", { x: margin, y: y + 10, size: 18, font: fontBold, color: amber });
  page.drawText("TAX INVOICE", { x: W - margin - 110, y: y + 10, size: 14, font: fontBold, color: rgb(1, 1, 1) });
  y -= 80;

  // ─── Invoice info ───
  const drawLabel = (label: string, value: string, lx: number, ly: number) => {
    page.drawText(label, { x: lx, y: ly, size: 8, font, color: grey });
    page.drawText(value, { x: lx, y: ly - 13, size: 10, font: fontBold, color: black });
  };

  drawLabel("Invoice Number", data.invoiceNumber, margin, y);
  drawLabel("Date Issued", data.issuedAt, margin + 150, y);
  drawLabel("Due Date", data.dueAt, margin + 300, y);
  drawLabel("Status", data.status.toUpperCase(), margin + 420, y);
  y -= 50;

  // ─── Addresses ───
  page.drawText("From:", { x: margin, y, size: 8, font, color: grey });
  page.drawText(data.businessName, { x: margin, y: y - 14, size: 10, font: fontBold, color: black });
  page.drawText(data.businessTown, { x: margin, y: y - 28, size: 9, font, color: grey });
  page.drawText(data.businessPhone, { x: margin, y: y - 42, size: 9, font, color: grey });
  page.drawText(data.businessEmail, { x: margin, y: y - 56, size: 9, font, color: grey });

  page.drawText("Bill To:", { x: 320, y, size: 8, font, color: grey });
  page.drawText(data.customerName, { x: 320, y: y - 14, size: 10, font: fontBold, color: black });
  page.drawText(data.customerEmail, { x: 320, y: y - 28, size: 9, font, color: grey });
  if (data.customerPhone) {
    page.drawText(data.customerPhone, { x: 320, y: y - 42, size: 9, font, color: grey });
  }
  y -= 80;

  // ─── Line items table ───
  // Header
  page.drawRectangle({ x: margin, y: y - 5, width: W - 2 * margin, height: 20, color: rgb(0.95, 0.95, 0.97) });
  page.drawText("Description", { x: margin + 8, y: y, size: 8, font: fontBold, color: grey });
  page.drawText("Qty", { x: 330, y: y, size: 8, font: fontBold, color: grey });
  page.drawText("Unit Price", { x: 370, y: y, size: 8, font: fontBold, color: grey });
  page.drawText("VAT", { x: 440, y: y, size: 8, font: fontBold, color: grey });
  page.drawText("Total", { x: 480, y: y, size: 8, font: fontBold, color: grey });
  y -= 22;

  const fmt = (n: number) => `£${n.toFixed(2)}`;

  let netTotal = 0;
  let vatTotal = 0;

  for (const line of data.lines) {
    const lineNet = line.quantity * line.unitPrice;
    const lineVat = line.isVatable ? lineNet * data.vatRate : 0;
    netTotal += lineNet;
    vatTotal += lineVat;

    page.drawText(line.description.slice(0, 45), { x: margin + 8, y, size: 9, font, color: black });
    page.drawText(String(line.quantity), { x: 330, y, size: 9, font, color: black });
    page.drawText(fmt(line.unitPrice), { x: 370, y, size: 9, font, color: black });
    page.drawText(line.isVatable ? fmt(lineVat) : "—", { x: 440, y, size: 9, font, color: black });
    page.drawText(fmt(lineNet + lineVat), { x: 480, y, size: 9, font, color: black });
    y -= 18;
  }

  // ─── Totals ───
  y -= 10;
  page.drawLine({ start: { x: 350, y: y + 5 }, end: { x: W - margin, y: y + 5 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  const drawTotal = (label: string, value: string, bold = false) => {
    page.drawText(label, { x: 370, y, size: 9, font: bold ? fontBold : font, color: grey });
    page.drawText(value, { x: 480, y, size: 10, font: bold ? fontBold : font, color: black });
    y -= 16;
  };

  drawTotal("Net", fmt(netTotal));
  if (vatTotal > 0) {
    drawTotal(`VAT (${(data.vatRate * 100).toFixed(0)}%)`, fmt(vatTotal));
  }
  drawTotal("Gross Total", fmt(netTotal + vatTotal), true);

  // Payments
  const totalPaid = data.payments.reduce((s, p) => s + p.amount, 0);
  if (totalPaid > 0) {
    drawTotal("Paid", fmt(totalPaid));
    drawTotal("Balance Due", fmt(netTotal + vatTotal - totalPaid), true);
  }

  // ─── Footer ───
  page.drawText("Thank you for choosing RCH PlumbFlow.", { x: margin, y: 60, size: 9, font, color: grey });
  page.drawText("Payment terms: Due on receipt unless otherwise agreed.", { x: margin, y: 45, size: 8, font, color: grey });

  return await doc.save();
}
