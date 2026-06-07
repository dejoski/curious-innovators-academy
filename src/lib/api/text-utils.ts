export function cleanTrimmedValue(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function cleanNewlines(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}
