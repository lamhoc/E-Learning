import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{
    classId: string;
  }>;
};

export default async function TeacherClassMaterialsRedirectPage({ params }: Props) {
  const { classId } = await params;
  redirect(`/teacher/materials?classId=${encodeURIComponent(classId)}`);
}
