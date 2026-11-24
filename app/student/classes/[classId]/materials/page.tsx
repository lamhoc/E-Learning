import { redirect } from 'next/navigation';

export default async function StudentClassMaterialsRedirect({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  redirect(`/student/materials?classId=${encodeURIComponent(classId)}`);
}
