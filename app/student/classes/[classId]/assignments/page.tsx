import { redirect } from 'next/navigation';

export default async function StudentClassAssignmentsRedirect({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  redirect(`/student/assignments?classId=${encodeURIComponent(classId)}`);
}
