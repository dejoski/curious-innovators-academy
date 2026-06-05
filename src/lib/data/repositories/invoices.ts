import type { ResolvedList } from "@/lib/data/fetch-source";
import type { InvoiceRow, InvoiceStatus } from "@/lib/data/types";
import { isSupabaseConfigured, unavailableList } from "@/lib/data/env";
import { parentContactFromStudentRow, STUDENT_PARENT_CONTACT_SELECT } from "@/lib/data/parent-contact";
import { firstRel } from "@/lib/data/repositories/relations";
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

function _invoice_helper(row: any) { return null; }

async function loadInvoicesResolved(): Promise<ResolvedList<InvoiceRow>> {
  if (!isSupabaseConfigured()) {
    return unavailableList();
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
          guardian_label,
          ${STUDENT_PARENT_CONTACT_SELECT}
        )
      `,
      )
      .order("due_date", { ascending: false });

    if (error) {
      return unavailableList();
    }

    if (!data?.length) {
      return { items: [], source: "remote" };
    }

    const mapped = data
      .map((row) => mapInvoiceRow(row as unknown as Record<string, unknown>))
      .filter((x): x is InvoiceRow => x !== null);

    if (mapped.length === 0) {
      return unavailableList();
    }
    return { items: mapped, source: "remote" };
  } catch {
    return unavailableList();
  }
}

async function _unused_fetchInv(): Promise<InvoiceRow[]> {
  const { items } = await loadInvoicesResolved();
  return items;
}

export async function fetchInvoicesResolved(): Promise<ResolvedList<InvoiceRow>> {
  return loadInvoicesResolved();
}
