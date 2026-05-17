type CsvCell = string | number | boolean | null | undefined;

function escapeCsvCell(value: CsvCell): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function mailtoHref(input: { to?: string; subject: string; body: string }): string {
  const to = encodeURIComponent(input.to?.trim() ?? "");
  const subject = encodeURIComponent(input.subject);
  const body = encodeURIComponent(input.body);
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
