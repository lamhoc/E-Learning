import { ClassTeacherAssigner } from './class-teacher-assigner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TeacherSubjectManager } from './teacher-subject-manager';

export type AcademicSubject = { id: string; code: string; name: string };
export type AcademicTeacher = { id: string; name: string };
export type AcademicAssignment = {
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
};
export type AcademicClass = {
  id: string;
  name: string;
  classCode: string;
  academicYear: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  eligibleTeachers: AcademicTeacher[];
};

export function AcademicAccess({
  subjects,
  teachers,
  assignments,
  classes,
}: {
  subjects: AcademicSubject[];
  teachers: AcademicTeacher[];
  assignments: AcademicAssignment[];
  classes: AcademicClass[];
}) {
  return (
    <section className="space-y-6" aria-labelledby="academic-access-title">
      <div>
        <h2 id="academic-access-title" className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Phân công môn học & Danh mục đào tạo
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Danh mục môn học do quản trị viên quản lý. Giảng viên chỉ được phép tạo đề thi và mở lớp trong các môn được phân công.
        </p>
      </div>

      {/* Trọng tâm Tab 2: Danh sách giáo viên và gán/hủy môn trực quan */}
      <TeacherSubjectManager
        teachers={teachers}
        subjects={subjects}
        assignments={assignments}
      />

      {/* Card Lớp và Giảng viên phụ trách - Chiếm toàn bộ chiều rộng (w-full) */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] shadow-xs w-full">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111C2D] pb-3.5">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Lớp học & Giảng viên phụ trách
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chỉ có thể giao lớp cho giảng viên đã được phân công cùng môn học.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {classes.length} lớp học
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {classes.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
              Chưa có lớp học nào đang hoạt động trong hệ thống.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    <TableHead className="pl-5 font-semibold text-slate-700 dark:text-slate-300">Lớp học</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Môn học</TableHead>
                    <TableHead className="pr-5 font-semibold text-slate-700 dark:text-slate-300">Giảng viên phụ trách</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((classItem) => (
                    <TableRow key={classItem.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <TableCell className="pl-5">
                        <span className="block font-semibold text-slate-900 dark:text-white">
                          {classItem.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                          {classItem.classCode} · {classItem.academicYear}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          {classItem.subjectCode}
                        </span>
                        <span className="ml-1.5 font-medium text-slate-900 dark:text-slate-100">{classItem.subjectName}</span>
                      </TableCell>
                      <TableCell className="pr-5">
                        <ClassTeacherAssigner classItem={classItem} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
