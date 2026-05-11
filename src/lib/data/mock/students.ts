import type { StudentListItem } from "@/lib/data/types";

const imgEllipse2735 =
  "https://www.figma.com/api/mcp/asset/c2c02888-0015-4631-9271-ad15c71bbe42";
const imgEllipse2736 =
  "https://www.figma.com/api/mcp/asset/5d34c686-8de5-45d0-869e-782333131133";
const imgEllipse2737 =
  "https://www.figma.com/api/mcp/asset/d0890d1c-999f-4d0e-883b-3de00156d029";
const imgEllipse2738 =
  "https://www.figma.com/api/mcp/asset/b9c9dd0d-494c-4fcb-8ceb-b4a91b7d6c37";
const imgEllipse2739 =
  "https://www.figma.com/api/mcp/asset/42c1621c-dce0-47b9-a7df-d71c14599b9e";
const imgEllipse2740 =
  "https://www.figma.com/api/mcp/asset/f0ad95d2-e7dd-44e9-a31c-87d2b72f06d9";

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
