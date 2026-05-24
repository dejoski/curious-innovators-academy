import type { EnrichmentRequestRow } from "@/lib/data/types";

/** Demo seed used by `/dashboard/classes/requests` until wired to Supabase. */
export const REQUESTS_FALLBACK: EnrichmentRequestRow[] = [
  { id: "1", student: "Anna Lee", parent: "Mr. Lee", class: "Robotics Lab", block: "B2", level: "3", option: "1st", status: "Pending" },
  { id: "2", student: "George Lee", parent: "Mr. Lee", class: "Journalism & Media Writing", block: "B4", level: "4", option: "1st", status: "Pending" },
  { id: "3", student: "Bruna Lee", parent: "Mr. Lee", class: "Creative Arts", block: "B3", level: "2", option: "1st", status: "Pending" },
  { id: "4", student: "James Smith", parent: "Ms. Smith", class: "Ocean Explorers", block: "B3", level: "2", option: "1st", status: "Rejected" },
  { id: "5", student: "Bruce Collins", parent: "Ms. Collins", class: "Robotics Lab", block: "B2", level: "3", option: "1st", status: "Pending" },
  { id: "6", student: "Maria Collins", parent: "Ms. Collins", class: "Journalism & Media Writing", block: "B4", level: "1", option: "1st", status: "Approved" },
];
