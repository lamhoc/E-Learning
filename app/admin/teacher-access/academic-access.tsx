import { BookPlus, UserRoundCog, UserRoundMinus, UserRoundPlus } from 'lucide-react';
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
import { assignClassTeacher, assignTeacherSubject, createSubject, removeTeacherSubject } from './actions';

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
    <section className="space-y-4" aria-labelledby="academic-access-title">
      <div>
        <p className="text-sm text-muted-foreground">Danh mục môn do admin quản lý; giảng viên chỉ tạo lớp trong môn được phân công.</p>
        <h2 id="academic-access-title" className="mt-1 text-xl font-semibold">Môn học và phân công</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookPlus aria-hidden="true" className="size-4 text-[#4c765e]" /> Tạo môn học
            </CardTitle>
            <CardDescription>Mã môn là duy nhất và được chuẩn hóa thành chữ in hoa.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createSubject} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="subject-code">Mã môn</Label>
                <Input id="subject-code" name="code" required minLength={2} maxLength={24} pattern="[A-Za-z0-9_-]+" placeholder="VD: TOAN-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject-name">Tên môn</Label>
                <Input id="subject-name" name="name" required minLength={2} maxLength={120} placeholder="Toán học" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="subject-description">Mô tả (không bắt buộc)</Label>
                <Input id="subject-description" name="description" maxLength={1000} placeholder="Mô tả ngắn về môn học" />
              </div>
              <Button type="submit" className="gap-2 sm:col-span-2 sm:justify-self-start">
                <BookPlus aria-hidden="true" className="size-4" /> Thêm môn học
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRoundPlus aria-hidden="true" className="size-4 text-[#4c765e]" /> Phân công môn
            </CardTitle>
            <CardDescription>Chỉ tài khoản đã có role giảng viên mới xuất hiện trong danh sách.</CardDescription>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 || subjects.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                {subjects.length === 0 ? 'Tạo môn học trước khi phân công.' : 'Chưa có giảng viên đã được duyệt.'}
              </p>
            ) : (
              <form action={assignTeacherSubject} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="assignment-teacher">Giảng viên</Label>
                  <select id="assignment-teacher" name="teacherId" required defaultValue="" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="" disabled>Chọn giảng viên</option>
                    {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assignment-subject">Môn học</Label>
                  <select id="assignment-subject" name="subjectId" required defaultValue="" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="" disabled>Chọn môn học</option>
                    {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}
                  </select>
                </div>
                <Button type="submit" className="gap-2">
                  <UserRoundPlus aria-hidden="true" className="size-4" /> Phân công
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Phân công hiện tại</CardTitle>
            <CardDescription className="mt-1">Gỡ phân công sẽ chặn tạo lớp mới và quyền quản lý lớp trong môn đó.</CardDescription>
          </div>
          <Badge variant="outline">{assignments.length}</Badge>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {assignments.length === 0 ? (
            <p className="mx-5 mb-5 rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có phân công môn học.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-5">Giảng viên</TableHead>
                    <TableHead>Môn học</TableHead>
                    <TableHead className="pr-5 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={`${assignment.teacherId}:${assignment.subjectId}`}>
                      <TableCell className="pl-5 font-medium">{assignment.teacherName}</TableCell>
                      <TableCell><span className="font-mono text-xs text-muted-foreground">{assignment.subjectCode}</span><span className="ml-2">{assignment.subjectName}</span></TableCell>
                      <TableCell className="pr-5 text-right">
                        <form action={removeTeacherSubject}>
                          <input type="hidden" name="teacherId" value={assignment.teacherId} />
                          <input type="hidden" name="subjectId" value={assignment.subjectId} />
                          <Button type="submit" variant="outline" size="icon-sm" aria-label={`Gỡ phân công ${assignment.subjectName} của ${assignment.teacherName}`} title="Gỡ phân công">
                            <UserRoundMinus aria-hidden="true" />
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Lớp và giảng viên phụ trách</CardTitle>
            <CardDescription className="mt-1">Chỉ có thể chuyển lớp cho giảng viên được phân công cùng môn.</CardDescription>
          </div>
          <Badge variant="outline">{classes.length}</Badge>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {classes.length === 0 ? (
            <p className="mx-5 mb-5 rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có lớp đang hoạt động.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="min-w-[210px] pl-5">Lớp học</TableHead>
                    <TableHead className="min-w-[190px]">Môn học</TableHead>
                    <TableHead className="min-w-[290px] pr-5">Giảng viên</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell className="pl-5">
                        <span className="block font-medium">{classItem.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{classItem.classCode} · {classItem.academicYear}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{classItem.subjectCode}</span>
                        <span className="ml-2">{classItem.subjectName}</span>
                      </TableCell>
                      <TableCell className="pr-5">
                        {classItem.eligibleTeachers.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Chưa có giảng viên được phân công môn này</span>
                        ) : (
                          <form action={assignClassTeacher} className="flex min-w-[270px] items-center gap-2">
                            <input type="hidden" name="classId" value={classItem.id} />
                            <select name="teacherId" required defaultValue={classItem.teacherId} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm">
                              {classItem.eligibleTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                            </select>
                            <Button type="submit" variant="outline" size="icon-sm" aria-label={`Lưu giảng viên phụ trách lớp ${classItem.name}`} title="Lưu giảng viên">
                              <UserRoundCog aria-hidden="true" />
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
    </section>
  );
}