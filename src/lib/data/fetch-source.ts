/** Whether list data came from Supabase, bundled local fallback, or neither. */
export type DataSource = "remote" | "fallback" | "unavailable";

export type ResolvedList<T> = { items: T[]; source: DataSource };
