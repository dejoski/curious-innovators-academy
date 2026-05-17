import type { ParentSummary } from "@/lib/data/types";

const av1 =
  "/images/icon-generic.svg";
const av2 =
  "/images/icon-generic.svg";

/** Bundled guardians for admin directory when cloud `parents` is missing or unreachable. */
export const PARENTS_FALLBACK: ParentSummary[] = [
  {
    id: "1",
    name: "Emily Johnson",
    email: "emily.johnson@email.com",
    phone: "(555) 123-4567",
    avatar: av1,
    status: "Active",
    studentsLabel: "Anna Lee, George Lee",
    linkedStudents: [
      { id: "1", name: "Anna Lee" },
      { id: "2", name: "George Lee" },
    ],
  },
  {
    id: "2",
    name: "Michael Brown",
    email: "michael.brown@email.com",
    phone: "(555) 123-4567",
    avatar: av2,
    status: "Active",
    studentsLabel: "Liam Brown",
    linkedStudents: [{ id: "4", name: "James Smith" }],
  },
  {
    id: "3",
    name: "Sarah Davis",
    email: "sara.davis@email.com",
    phone: "(555) 234-5678",
    avatar: av1,
    status: "Inactive",
    studentsLabel: "Ava Davis",
    linkedStudents: [{ id: "3", name: "Bruna Lee" }],
  },
  {
    id: "4",
    name: "David Wilson",
    email: "david.wilson@email.com",
    phone: "(555) 345-6789",
    avatar: av2,
    status: "Active",
    studentsLabel: "Noah Wilson, Sophia Wilson",
    linkedStudents: [
      { id: "5", name: "Bruce Collins" },
      { id: "6", name: "Maria Collins" },
    ],
  },
  {
    id: "5",
    name: "Jessica Miller",
    email: "jessica.miller@email.com",
    phone: "(555) 345-6789",
    avatar: av1,
    status: "Active",
    studentsLabel: "Lucas Miller",
    linkedStudents: [{ id: "7", name: "James Smith" }],
  },
  {
    id: "6",
    name: "Christopher Moore",
    email: "chris.moore@email.com",
    phone: "(555) 456-7890",
    avatar: av2,
    status: "Active",
    studentsLabel: "Mia Moore",
    linkedStudents: [{ id: "1", name: "Anna Lee" }],
  },
  {
    id: "7",
    name: "Ashley Taylor",
    email: "ashley.taylor@email.com",
    phone: "(555) 567-8901",
    avatar: av1,
    status: "Inactive",
    studentsLabel: "Charlotte Taylor, Benjamin Taylor",
    linkedStudents: [
      { id: "2", name: "George Lee" },
      { id: "3", name: "Bruna Lee" },
    ],
  },
  {
    id: "8",
    name: "Matthew Anderson",
    email: "matthew.anderson@email.com",
    phone: "(555) 567-8901",
    avatar: av2,
    status: "Active",
    studentsLabel: "James Anderson",
    linkedStudents: [{ id: "4", name: "James Smith" }],
  },
  {
    id: "9",
    name: "Amanda Thomas",
    email: "amanda.thomas@email.com",
    phone: "(555) 678-9012",
    avatar: av1,
    status: "Active",
    studentsLabel: "Oliver Thomas",
    linkedStudents: [{ id: "5", name: "Bruce Collins" }],
  },
  {
    id: "10",
    name: "Daniel Jackson",
    email: "daniel.jackson@email.com",
    phone: "(555) 789-0123",
    avatar: av2,
    status: "Active",
    studentsLabel: "Maria Collins",
    linkedStudents: [{ id: "6", name: "Maria Collins" }],
  },
];
