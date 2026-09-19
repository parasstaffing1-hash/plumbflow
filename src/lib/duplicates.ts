/**
 * B2, duplicate prevention. Never merges automatically, never blocks creation.
 */
import type { Customer, Property } from "./domain";

export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("44")) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  return digits;
}

function normaliseName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalisePostcode(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

function normaliseLine(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,]/g, "");
}

export interface Match<T> {
  record: T;
  reason: string;
}

export function findCustomerMatches(
  candidate: { name: string; phone: string; email: string },
  existing: Customer[],
): Match<Customer>[] {
  const phone = normalisePhone(candidate.phone);
  const email = candidate.email.trim().toLowerCase();
  const name = normaliseName(candidate.name);

  const matches: Match<Customer>[] = [];
  for (const record of existing) {
    if (phone.length >= 7 && normalisePhone(record.phone) === phone) {
      matches.push({ record, reason: "Same phone number" });
      continue;
    }
    if (email.length > 3 && record.email.trim().toLowerCase() === email) {
      matches.push({ record, reason: "Same email address" });
      continue;
    }
    if (name.length > 2 && normaliseName(record.name) === name) {
      matches.push({ record, reason: "Same name" });
    }
  }
  return matches;
}

export function findPropertyMatches(
  candidate: { line1: string; postcode: string },
  existing: Property[],
): Match<Property>[] {
  const postcode = normalisePostcode(candidate.postcode);
  const line1 = normaliseLine(candidate.line1);
  if (postcode.length < 5 || line1.length < 3) return [];

  return existing
    .filter(
      (record) =>
        normalisePostcode(record.postcode) === postcode && normaliseLine(record.line1) === line1,
    )
    .map((record) => ({ record, reason: "Same postcode and first line" }));
}
