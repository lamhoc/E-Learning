import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{
    classId: string;
  }>;
};

export default async function TeacherClassAssignmentsRedirectPage({ params }: Props) {
  const { classId } = await params;
  redirect(`/teacher/assignments?classId=${encodeURIComponent(classId)}`);
}
