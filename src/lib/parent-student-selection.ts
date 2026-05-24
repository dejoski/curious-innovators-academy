const PARENT_SELECTED_STUDENT_KEY = "cia-parent-selected-student-id";

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

function cleanStudentId(studentId: string | null | undefined): string {
  return String(studentId ?? "").trim();
}

export function readStoredParentStudentId(): string {
  if (typeof window === "undefined") return "";
  try {
    return cleanStudentId(window.sessionStorage.getItem(PARENT_SELECTED_STUDENT_KEY));
  } catch {
    return "";
  }
}

export function writeStoredParentStudentId(studentId: string | null | undefined): void {
  const clean = cleanStudentId(studentId);
  if (!clean || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PARENT_SELECTED_STUDENT_KEY, clean);
  } catch {
    /* ignore storage failures */
  }
}

export function selectedParentStudentIdFromSearchParams(searchParams: SearchParamsLike): string {
  return cleanStudentId(searchParams.get("student")) || readStoredParentStudentId();
}

export function withParentStudentParam(href: string, studentId: string | null | undefined): string {
  const clean = cleanStudentId(studentId);
  if (!clean) return href;

  try {
    const url = new URL(href, "https://cia.local");
    url.searchParams.set("student", clean);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const params = new URLSearchParams();
    params.set("student", clean);
    return `${href}${href.includes("?") ? "&" : "?"}${params.toString()}`;
  }
}
