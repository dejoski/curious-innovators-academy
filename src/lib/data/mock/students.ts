import type { StudentListItem } from "@/lib/data/types";

const imgEllipse2735 = "/images/avatars/student-1.png";
const imgEllipse2736 = "/images/avatars/student-2.png";
const imgEllipse2737 = "/images/avatars/student-3.png";
const imgEllipse2738 = "/images/avatars/student-4.png";
const imgEllipse2739 = "/images/avatars/student-5.png";
const imgEllipse2740 = "/images/avatars/student-6.png";

/** Demo seed when Supabase is not configured or queries fail. */
export const STUDENTS_FALLBACK: StudentListItem[] = [
  {
    id: "1",
    name: "Anna Lee",
    avatar: imgEllipse2735,
    parent: "Mr. Lee",
    level: "14",
    status: "Incomplete",
    enrichment: "4/4",
    notes: "Waiting for seat confirmation due to high demand.",
    track: "core",
  },
  {
    id: "2",
    name: "George Lee",
    avatar: imgEllipse2736,
    parent: "Mr. Lee",
    level: "14",
    status: "Incomplete",
    enrichment: "3/4",
    notes: "Waiting for seat confirmation due to high demand.",
    track: "core",
  },
  {
    id: "3",
    name: "Bruna Lee",
    avatar: imgEllipse2737,
    parent: "Mr. Lee",
    level: "13",
    status: "Completed",
    enrichment: "1/4",
    notes: "Parent informed and open to alternative class if needed.",
    track: "enrichment",
  },
  {
    id: "4",
    name: "James Smith",
    avatar: imgEllipse2738,
    parent: "Ms. Smith",
    level: "14",
    status: "Completed",
    enrichment: "2/4",
    notes: "Strong engagement in class activities.",
    track: "enrichment",
  },
  {
    id: "5",
    name: "Bruce Collins",
    avatar: imgEllipse2739,
    parent: "Ms. Collins",
    level: "14",
    status: "Completed",
    enrichment: "4/4",
    notes: "Strong engagement in class activities.",
    track: "core",
  },
  {
    id: "6",
    name: "Maria Collins",
    avatar: imgEllipse2740,
    parent: "Ms. Collins",
    level: "13",
    status: "Completed",
    enrichment: "1/4",
    notes: "Strong engagement in class activities.",
    track: "enrichment",
  },
  {
    id: "7",
    name: "James Smith",
    avatar: imgEllipse2738,
    parent: "Ms. Smith",
    level: "14",
    status: "Completed",
    enrichment: "1/4",
    notes: "Strong engagement in class activities.",
    track: "core",
  },
];
