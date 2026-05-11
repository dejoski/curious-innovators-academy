/** Whether list data came from Supabase or bundled demo fallback. */
export type DataSource = "remote" | "fallback";

export type ResolvedList<T> = { items: T[]; source: DataSource };
