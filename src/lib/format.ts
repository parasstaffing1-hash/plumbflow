/** Single shared money formatter, never format currency inline. */
export function formatCurrency(amount: number | null | undefined): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

/** UK date: DD/MM/YYYY */
export function formatDate(input: Date | string | number | null | undefined): string {
  if (input === null || input === undefined) return "n/a";
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return "n/a";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** 24h time: HH:mm */
export function formatTime(input: Date | string | number | null | undefined): string {
  if (input === null || input === undefined) return "n/a";
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return "n/a";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTime(input: Date | string | number | null | undefined): string {
  if (input === null || input === undefined) return "n/a";
  return `${formatDate(input)} ${formatTime(input)}`;
}

export function formatDayLabel(input: Date | string | number): string {
  const date = toDate(input);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}
