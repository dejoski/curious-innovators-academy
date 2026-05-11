import type { TeacherRow } from "@/lib/data/types";

const imgEllipse2735 =
  "/images/icon-generic.svg";
const imgEllipse2736 =
  "/images/icon-generic.svg";

/** Demo seed when Supabase is not configured or queries fail. */
export const TEACHERS_FALLBACK: TeacherRow[] = [
  { id: "1", name: "Emily Carter", subjects: "Math, Algebra", email: "emily.carter@email.com", phone: "(555) 123-4567", avatar: imgEllipse2735, program: "core" },
  { id: "2", name: "Daniel Lee", subjects: "ELA, Writing", email: "daniel.lee@email.com", phone: "(555) 123-4567", avatar: imgEllipse2736, program: "core" },
  { id: "3", name: "Sophia Martinez", subjects: "Robotics, Engineering Lab", email: "sophia.m@email.com", phone: "(555) 234-5678", avatar: imgEllipse2735, program: "enrichment" },
  { id: "4", name: "David Wilson", subjects: "ELA, Writing", email: "david.wilson@email.com", phone: "(555) 345-6789", avatar: imgEllipse2736, program: "core" },
  { id: "5", name: "James Walker", subjects: "Business, Entrepreneurship", email: "james.walker@email.com", phone: "(555) 345-6789", avatar: imgEllipse2735, program: "core" },
  { id: "6", name: "Olivia Harris", subjects: "Drawing, Painting", email: "olivia.h@email.com", phone: "(555) 456-7890", avatar: imgEllipse2736, program: "enrichment" },
  { id: "7", name: "Michael Chang", subjects: "Physics, Chemistry", email: "michael.c@email.com", phone: "(555) 567-8901", avatar: imgEllipse2735, program: "core" },
  { id: "8", name: "Sarah Jenkins", subjects: "History, Geography", email: "sarah.j@email.com", phone: "(555) 678-9012", avatar: imgEllipse2736, program: "core" },
  { id: "9", name: "Robert Taylor", subjects: "Physical Education", email: "robert.t@email.com", phone: "(555) 789-0123", avatar: imgEllipse2735, program: "core" },
  { id: "10", name: "Amanda White", subjects: "Music, Choir", email: "amanda.w@email.com", phone: "(555) 890-1234", avatar: imgEllipse2736, program: "enrichment" },
];
