"use client";

import { useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { downloadCsv } from "@/lib/client-directory-actions";
import { DASHBOARD_PANEL_TITLE_CLASS } from "@/lib/dashboard-shell-classes";

export type BulkImportColumn = {
  key: string;
  label: string;
  required?: boolean;
  sample?: string;
};

export type BulkImportResult = {
  created: number;
  errors?: string[];
};

export type ParsedImportRow = {
  rowNumber: number;
  values: Record<string, string>;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (ch === "\"") {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === "\"") quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((v) => v.trim()));
}

function headerKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapRows(text: string, columns: BulkImportColumn[]): ParsedImportRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = new Map<string, number>();
  rows[0].forEach((header, index) => headers.set(headerKey(header), index));
  return rows.slice(1).map((row, index) => {
    const values: Record<string, string> = {};
    columns.forEach((column) => {
      const idx = headers.get(headerKey(column.label)) ?? headers.get(headerKey(column.key));
      values[column.key] = idx == null ? "" : String(row[idx] ?? "").trim();
    });
    return { rowNumber: index + 2, values };
  }).filter((row) => Object.values(row.values).some((value) => value.trim()));
}

export function DashboardBulkImportModal({
  title,
  entityLabel,
  filename,
  columns,
  isOpen,
  onClose,
  onImport,
}: {
  title: string;
  entityLabel: string;
  filename: string;
  columns: BulkImportColumn[];
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: ParsedImportRow[]) => Promise<BulkImportResult>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const validationErrors = useMemo(() => {
    const next: string[] = [];
    rows.forEach((row) => {
      columns.forEach((column) => {
        if (column.required && !row.values[column.key]?.trim()) {
          next.push(`Row ${row.rowNumber}: ${column.label} is required`);
        }
      });
    });
    return next;
  }, [columns, rows]);

  if (!isOpen) return null;
  const pluralLabel = entityLabel === "class" ? "classes" : `${entityLabel}s`;

  const downloadTemplate = () => {
    downloadCsv(
      filename,
      columns.map((column) => column.label),
      [columns.map((column) => column.sample ?? "")],
    );
  };

  const readFile = async (file: File) => {
    setStatus(null);
    setErrors([]);
    const parsed = mapRows(await file.text(), columns);
    setRows(parsed);
    if (parsed.length === 0) {
      setErrors([`No ${entityLabel} rows found. Download the template and keep the header row unchanged.`]);
    }
  };

  const submit = async () => {
    if (rows.length === 0 || validationErrors.length > 0 || isImporting) return;
    setIsImporting(true);
    setErrors([]);
    setStatus(null);
    try {
      const result = await onImport(rows);
      setStatus(`Imported ${result.created} ${result.created === 1 ? entityLabel : pluralLabel}.`);
      setErrors(result.errors ?? []);
      if (result.created > 0 && !result.errors?.length) {
        setRows([]);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      setIsImporting(false);
    }
  };

  const visibleErrors = [...validationErrors, ...errors];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#f0f0f0] px-6 py-5">
          <div>
            <h2 className={DASHBOARD_PANEL_TITLE_CLASS}>{title}</h2>
            <p className="mt-1 text-sm text-[#666d80]">Download the template, fill it out, then upload the completed CSV.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-[#666d80] hover:bg-[#f5f5f5]" aria-label="Close import modal">
            <X className="size-5" aria-hidden strokeWidth={1.8} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="rounded-[10px] border border-[#14c1d5]/35 bg-[#ecfdff] px-4 py-3 text-left text-sm font-semibold text-[#155e66] hover:bg-[#d9f8fb]"
            >
              Download CSV template
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#e5e7eb] px-4 py-3 text-sm font-semibold text-[#272932] hover:bg-[#fafafa]">
              <Upload className="size-4 text-[#14c1d5]" aria-hidden strokeWidth={1.8} />
              Upload completed CSV
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void readFile(file);
                }}
              />
            </label>
          </div>

          <div className="mt-5 rounded-[12px] border border-[#f0f0f0]">
            <div className="border-b border-[#f0f0f0] px-4 py-3 text-sm font-semibold text-[#272932]">
              Template columns
            </div>
            <div className="grid gap-2 px-4 py-3 text-sm text-[#666d80] sm:grid-cols-2">
              {columns.map((column) => (
                <div key={column.key}>
                  <span className="font-semibold text-[#272932]">{column.label}</span>
                  {column.required ? <span className="text-[#d80509]"> required</span> : null}
                </div>
              ))}
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="mt-5 rounded-[12px] border border-[#f0f0f0]">
              <div className="border-b border-[#f0f0f0] px-4 py-3 text-sm font-semibold text-[#272932]">
                Preview: {rows.length} row{rows.length === 1 ? "" : "s"} ready
              </div>
              <div className="max-h-[220px] overflow-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#f0f0f0] text-[#8b919f]">
                      {columns.slice(0, 5).map((column) => (
                        <th key={column.key} className="px-3 py-2 font-semibold">{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row) => (
                      <tr key={row.rowNumber} className="border-b border-[#f0f0f0] last:border-b-0">
                        {columns.slice(0, 5).map((column) => (
                          <td key={column.key} className="px-3 py-2 text-[#272932]">{row.values[column.key] || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {status ? <p className="mt-4 rounded-md border border-[#b7dec0] bg-[#ecf8ef] px-3 py-2 text-sm text-[#155724]">{status}</p> : null}
          {visibleErrors.length > 0 ? (
            <div className="mt-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
              {visibleErrors.slice(0, 5).map((error) => <p key={error}>{error}</p>)}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#f0f0f0] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-[8px] bg-[#fafafa] px-4 py-2 text-sm font-semibold text-[#272932] hover:bg-[#f0f0f0]">
            Close
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={rows.length === 0 || validationErrors.length > 0 || isImporting}
            className="rounded-[8px] bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#11adbf] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting ? "Importing..." : `Import ${pluralLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
