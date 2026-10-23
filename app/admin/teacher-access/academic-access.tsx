import Link from 'next/link';
import { BookPlus, UserRoundCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { assignClassTeacher, createSubject } from './actions';
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
        <h2 id="academic-access-title" className="text-xl font-bold text-slate-900 tracking-tight">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card Tạo môn học mới */}
        <Card className="border-slate-200 shadow-xs lg:col-span-1">
          <CardHeader className="border-b border-slate-100 bg-white pb-3.5">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <BookPlus aria-hidden="true" className="size-4 text-[#17372e]" />
              Thêm môn học mới
            </CardTitle>
            <CardDescription className="text-xs">
              Mã môn là duy nhất và được viết in hoa.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form action={createSubject} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="subject-code" className="text-xs font-semibold">Mã môn</Label>
                <Input
                  id="subject-code"
                  name="code"
                  required
                  minLength={2}
                  maxLength={24}
                  pattern="[A-Za-z0-9_-]+"
                  placeholder="VD: TOAN-12"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject-name" className="text-xs font-semibold">Tên môn học</Label>
                <Input
                  id="subject-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="VD: Giải tích nâng cao"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject-description" className="text-xs font-semibold">Mô tả (tùy chọn)</Label>
                <Input
                  id="subject-description"
                  name="description"
                  maxLength={1000}
                  placeholder="Mô tả tóm tắt nội dung môn"
                  className="h-9 text-xs"
                />
              </div>
              <Button type="submit" className="w-full gap-2 bg-[#17372e] hover:bg-[#20493e] text-white text-xs h-9">
                <BookPlus aria-hidden="true" className="size-4" /> Tạo môn học
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card Lớp và Giảng viên phụ trách */}
        <Card className="border-slate-200 shadow-xs lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-white pb-3.5">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Lớp học & Giảng viên phụ trách
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Chỉ có thể giao lớp cho giảng viên đã được phân công cùng môn.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-slate-50">{classes.length} lớp</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {classes.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">
                Chưa có lớp học nào đang hoạt động trong hệ thống.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="pl-5 font-semibold text-slate-700">Lớp học</TableHead>
                      <TableHead className="font-semibold text-slate-700">Môn học</TableHead>
                      <TableHead className="pr-5 font-semibold text-slate-700">Giảng viên phụ trách</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((classItem) => (
                      <TableRow key={classItem.id} className="hover:bg-slate-50/50">
                        <TableCell className="pl-5">
                          <Link
                            href={`/teacher/classes/${classItem.id}`}
                            className="block font-medium text-emerald-800 hover:underline"
                          >
                            {classItem.name}
                          </Link>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {classItem.classCode} · {classItem.academicYear}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-[11px] font-bold text-slate-500 uppercase">
                            {classItem.subjectCode}
                          </span>
                          <span className="ml-1.5">{classItem.subjectName}</span>
                        </TableCell>
                        <TableCell className="pr-5">
                          {classItem.eligibleTeachers.length === 0 ? (
                            <span className="text-[11px] text-amber-700">
                              Chưa có giảng viên được gán môn này
                            </span>
                          ) : (
                            <form action={assignClassTeacher} className="flex min-w-[240px] items-center gap-1.5">
                              <input type="hidden" name="classId" value={classItem.id} />
                              <select
                                name="teacherId"
                                required
                                defaultValue={classItem.teacherId}
                                className="h-8 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800"
                              >
                                {classItem.eligibleTeachers.map((teacher) => (
                                  <option key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs text-slate-700"
                                title="Lưu phân công lớp"
                              >
                                <UserRoundCog className="size-3.5" />
                              </Button>
                            </form>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
