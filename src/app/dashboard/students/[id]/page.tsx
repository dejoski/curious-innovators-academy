import { fetchAdminStudentProfileResolved } from "@/lib/data/repositories/student-details";
import StudentProfileClient from "./student-profile-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function StudentProfilePage({ params }: PageProps) {
  const { id } = await params;
  const { profile, source } = await fetchAdminStudentProfileResolved(id);
  return <StudentProfileClient studentId={id} profile={profile} dataSource={source} />;
}
