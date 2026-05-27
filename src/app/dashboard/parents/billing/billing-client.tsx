"use client";

import { Download, ExternalLink, ReceiptText, RefreshCw } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import type { DataSource } from "@/lib/data/fetch-source";
import type { InvoiceRow, InvoiceStatus } from "@/lib/data/types";
import { peekDashboardData, readDashboardData } from "@/lib/client-data-cache";
import { DashboardValueSkeleton } from "@/components/dashboard-loading-state";

const STATUS_ORDER: InvoiceStatus[] = ["Open", "Past due", "Paid", "Draft", "Void"];

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

function formatDate(value: string) {
  if (!value) return "Not set";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusClass(status: InvoiceStatus) {
  if (status === "Paid") return "border-[#004d08]/20 bg-[#f3fbf4] text-[#004d08]";
  if (status === "Past due") return "border-[#d92d20]/25 bg-[#fff4f2] text-[#b42318]";
  if (status === "Draft") return "border-[#818898]/25 bg-[#f7f8fa] text-[#4b5565]";
  if (status === "Void") return "border-[#272932]/15 bg-[#fafafa] text-[#666d80]";
  return "border-[#14c1d5]/30 bg-[#f6fcfd] text-[#08798a]";
}

function sourceHint(source: DataSource | null, error: string | null) {
  if (error) return error;
  if (source === "fallback") return "Showing starter billing rows while invoices finish loading.";
  if (source === "unavailable") {
    return "Billing is temporarily unavailable.";
  }
  return null;
}

function exportCsv(rows: InvoiceRow[]) {
  const header = [
    "Invoice number",
    "Family",
    "Student",
    "Status",
    "Issued date",
    "Due date",
    "Amount",
    "Line items",
  ];
  const csvRows = rows.map((invoice) => [
    invoice.invoiceNumber,
    invoice.family,
    invoice.student,
    invoice.status,
    invoice.issuedDate,
    invoice.dueDate,
    formatMoney(invoice.amountCents, invoice.currency),
    invoice.lineItems,
  ]);
  const body = [header, ...csvRows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "curious-innovators-invoices.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ParentBillingClient() {
  const cachedBilling = peekDashboardData<{
    invoices?: InvoiceRow[];
    source?: DataSource;
  }>("/api/data/invoices");
  const [invoices, setInvoices] = useState<InvoiceRow[]>(() =>
    Array.isArray(cachedBilling?.invoices) ? cachedBilling.invoices : [],
  );
  const [source, setSource] = useState<DataSource | null>(() => cachedBilling?.source ?? null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "All">("All");
  const [loading, setLoading] = useState(() => !cachedBilling);
  const [error, setError] = useState<string | null>(null);
  const [hasResolved, setHasResolved] = useState(() => Boolean(cachedBilling));

  const loadInvoices = React.useCallback(async (options: { force?: boolean } = {}) => {
    if (!hasResolved || options.force) setLoading(true);
    setError(null);
    try {
      const body = await readDashboardData<{
        invoices?: InvoiceRow[];
        source?: DataSource;
      }>("/api/data/invoices", undefined, { force: options.force });
      setInvoices(Array.isArray(body.invoices) ? body.invoices : []);
      setSource(body.source ?? null);
      setHasResolved(true);
    } catch (err) {
      setInvoices([]);
      setSource(null);
      setHasResolved(false);
      setError(
        `Could not load billing data: ${err instanceof Error ? err.message : String(err)}.`,
      );
    } finally {
      setLoading(false);
    }
  }, [hasResolved]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        statusFilter === "All" ? true : invoice.status === statusFilter,
      ),
    [invoices, statusFilter],
  );

  const totals = useMemo(() => {
    const open = invoices
      .filter((invoice) => invoice.status === "Open" || invoice.status === "Past due")
      .reduce((sum, invoice) => sum + invoice.amountCents, 0);
    const paid = invoices
      .filter((invoice) => invoice.status === "Paid")
      .reduce((sum, invoice) => sum + invoice.amountCents, 0);
    return { open, paid };
  }, [invoices]);

  const hint = sourceHint(source, error);
  const currency = invoices[0]?.currency ?? "USD";
  const showUnknownBilling = loading && !hasResolved;
  const canShowBillingFacts = hasResolved && !error;

  return (
    <div className="mx-auto flex w-full max-w-[1104px] flex-col gap-6 px-4 pb-10 pt-8 font-['Inter',sans-serif] sm:px-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-[720px] flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-[1.1] text-[#272932]">
            Billing
          </h1>
          <p className="text-[16px] leading-[1.4] text-[#666d80]">
            Review invoices, balances, due dates, and payment links for your family.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadInvoices({ force: true })}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#dfe1e7] bg-white px-3 text-sm font-medium text-[#272932] transition-colors hover:bg-[#f7f8fa]"
            disabled={loading}
          >
            <RefreshCw aria-hidden className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => exportCsv(filteredInvoices)}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#14c1d5] px-3 text-sm font-medium text-white transition-colors hover:bg-[#11aabd] disabled:cursor-not-allowed disabled:bg-[#a8e7ef]"
            disabled={!canShowBillingFacts || filteredInvoices.length === 0}
          >
            <Download aria-hidden className="size-4" />
            Export
          </button>
        </div>
      </div>

      {hint && (
        <p className="rounded-[10px] border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
          {hint}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-[8px] border border-[#dfe1e7] bg-white p-4">
          <p className="text-sm font-medium text-[#666d80]">Open balance</p>
          <p className="mt-2 text-[26px] font-bold leading-tight text-[#272932]">
            {showUnknownBilling ? <DashboardValueSkeleton className="h-7 w-24" /> : canShowBillingFacts ? formatMoney(totals.open, currency) : "Unavailable"}
          </p>
        </section>
        <section className="rounded-[8px] border border-[#dfe1e7] bg-white p-4">
          <p className="text-sm font-medium text-[#666d80]">Paid this period</p>
          <p className="mt-2 text-[26px] font-bold leading-tight text-[#272932]">
            {showUnknownBilling ? <DashboardValueSkeleton className="h-7 w-24" /> : canShowBillingFacts ? formatMoney(totals.paid, currency) : "Unavailable"}
          </p>
        </section>
        <section className="rounded-[8px] border border-[#dfe1e7] bg-white p-4">
          <p className="text-sm font-medium text-[#666d80]">Invoices</p>
          <p className="mt-2 text-[26px] font-bold leading-tight text-[#272932]">
            {showUnknownBilling ? <DashboardValueSkeleton className="h-7 w-12" /> : canShowBillingFacts ? invoices.length : "Unavailable"}
          </p>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["All", ...STATUS_ORDER] as const).map((status) => {
          const active = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`h-9 rounded-[8px] border px-3 text-sm font-medium transition-colors ${
                active
                  ? "border-[#14c1d5] bg-[#d2f1f5] text-[#08798a]"
                  : "border-[#dfe1e7] bg-white text-[#666d80] hover:bg-[#f7f8fa]"
              }`}
              aria-pressed={active}
            >
              {status}
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-[8px] border border-[#dfe1e7] bg-white">
        <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-4 py-3">
          <ReceiptText aria-hidden className="size-5 text-[#14c1d5]" />
          <h2 className="text-base font-semibold text-[#272932]">Invoices</h2>
        </div>

        {showUnknownBilling ? (
          <div className="px-4 py-10 text-sm text-[#666d80]">Loading invoices...</div>
        ) : error ? (
          <div className="px-4 py-10 text-sm text-[#a00408]">Billing data is unavailable.</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="px-4 py-10 text-sm text-[#666d80]">
            No invoices match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#f0f0f0] bg-[#fafafa] text-xs font-semibold uppercase text-[#666d80]">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[#f0f0f0] last:border-0">
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-[#272932]">
                          {invoice.invoiceNumber || invoice.id}
                        </span>
                        <span className="max-w-[280px] text-sm leading-[1.4] text-[#666d80]">
                          {invoice.lineItems || "Tuition and fees"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-[#272932]">
                          {invoice.student}
                        </span>
                        <span className="text-sm text-[#666d80]">{invoice.family}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[#666d80]">
                      {formatDate(invoice.issuedDate)}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[#666d80]">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={`inline-flex rounded-[999px] border px-2 py-1 text-xs font-semibold ${statusClass(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right align-top text-sm font-semibold text-[#272932]">
                      {formatMoney(invoice.amountCents, invoice.currency)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {invoice.paymentUrl ? (
                        <a
                          href={invoice.paymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#14c1d5]/40 bg-[#f6fcfd] px-3 text-sm font-medium text-[#08798a] hover:bg-[#d2f1f5]"
                        >
                          Pay
                          <ExternalLink aria-hidden className="size-4" />
                        </a>
                      ) : (
                        <span className="text-sm text-[#818898]">No payment link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
