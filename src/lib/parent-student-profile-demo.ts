/**
 * Demo-only student rows for the parent “Student profile” screen and header picker.
 */

export type ParentDemoStudentProfile = {
  id: string;
  /** Shorter label for header picker / selectors */
  displayName: string;
  /** Full legal-style name shown on profile card heading */
  profileCardName: string;
  avatarAlt: string;
  ageLabel: string;
  level: string;
  learningProfile: string;
  strengths: string;
  supportNotes: string;
};

export const PARENT_DEMO_STUDENTS: ParentDemoStudentProfile[] = [
  {
    id: "anna",
    displayName: "Anna Lee",
    profileCardName: "Anna Lee Johnson",
    avatarAlt: "Anna Lee",
    ageLabel: "14 years old",
    level: "3",
    learningProfile:
      "Curious and engaged learner who enjoys collaborative activities",
    strengths: "Strong communication and creativity",
    supportNotes: "Benefits from structured guidance on long tasks",
  },
];

export function getParentDemoStudent(
  id: string | null | undefined,
): ParentDemoStudentProfile {
  const found = PARENT_DEMO_STUDENTS.find((s) => s.id === id);
  return found ?? PARENT_DEMO_STUDENTS[0];
}
