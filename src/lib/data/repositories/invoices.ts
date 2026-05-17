import type { ResolvedList } from "@/lib/data/fetch-source";
import type { InvoiceRow, InvoiceStatus } from "@/lib/data/types";
import { fallbackList, isSupabaseConfigured } from "@/lib/data/env";
import { INVOICES_FALLBACK } from "@/lib/data/mock/invoices";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, InvoiceStatus> = {
  draft: "Draft",
  open: "Open",
  paid: "Paid",
  past_due: "Past due",
  pastdue: "Past due",
  void: "Void",
};

function normalizeStatus(raw: unknown): InvoiceStatus {
  const key = String(raw ?? "open")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return STATUS_LABELS[key] ?? "Open";
}

function formatLineItems(raw: unknown): string {
  if (Array.isArray(raw)) {
    const items = raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const r = item as Record<string, unknown>;
          const label = String(r.description ?? r.name ?? "").trim();
          const qty = Number(r.quantity ?? 1);
          return qty > 1 && label ? `${label} x${qty}` : label;
        }
        return "";
      })
      .filter(Boolean);
    return items.join("; ");
  }
  if (raw && typeof raw === "object") {
    return formatLineItems(Object.values(raw));
  }
  return String(raw ?? "").trim();
}

function firstRel<T extends Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return v as T;
}

export function mapInvoiceRow(row: Record<string, unknown>): InvoiceRow | null {
  const id = row.id != null ? String(row.id) : "";
  if (!id) return null;

  const student = firstRel<Record<string, unknown>>(row.students);
  const studentName = String(row.student_name ?? student?.display_name ?? "").trim();
  const familyLabel = String(
    row.family_label ??
      row.family ??
      student?.guardian_label ??
      (studentName ? `${studentName.split(" ").slice(-1)[0]} Family` : ""),
  ).trim();

  return {
    id,
    family: familyLabel || "Family",
    student: studentName || "Student",
    invoiceNumber: String(row.invoice_number ?? row.invoiceNumber ?? "").trim(),
    amountCents: Math.max(0, Math.round(Number(row.amount_cents ?? row.amountCents ?? 0))),
    currency: String(row.currency ?? "USD").toUpperCase(),
    status: normalizeStatus(row.status),
    dueDate: String(row.due_date ?? row.dueDate ?? "").slice(0, 10),
    issuedDate: String(row.issued_date ?? row.issuedDate ?? "").slice(0, 10),
    lineItems: formatLineItems(row.line_items ?? row.lineItems),
    paymentUrl: String(row.payment_url ?? row.paymentUrl ?? "").trim() || undefined,
  };
}

async function loadInvoicesResolved(): Promise<ResolvedList<InvoiceRow>> {
  if (!isSupabaseConfigured()) {
    return fallbackList(INVOICES_FALLBACK);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        id,
        student_id,
        family_label,
        invoice_number,
        amount_cents,
        currency,
        status,
        issued_date,
        due_date,
        line_items,
        payment_url,
        students (
          display_name,
          guardian_label
        )
      `,
      )
      .order("due_date", { ascending: false });

    if (error) {
      return fallbackList(INVOICES_FALLBACK);
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) => mapInvoiceRow(row as unknown as Record<string, unknown>))
      .filter((x): x is InvoiceRow => x !== null);

    if (mapped.length === 0) {
      return fallbackList(INVOICES_FALLBACK);
    }
    return { items: mapped, source: "remote" };
  } catch {
    return fallbackList(INVOICES_FALLBACK);
  }
}

export async function fetchInvoices(): Promise<InvoiceRow[]> {
  const { items } = await loadInvoicesResolved();
  return items;
}

export async function fetchInvoicesResolved(): Promise<ResolvedList<InvoiceRow>> {
  return loadInvoicesResolved();
}
