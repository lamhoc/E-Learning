import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-cache';
import { getRepo } from '@/lib/db/data-source';
import { SubjectSchema, UserRoleSchema } from '@/lib/db/entities';
import {
  cleanAndStandardizeQuestions,
  extractDocxTextWithRedColor,
  extractPdfTextSafe,
  parseDocumentWithGroq,
  parseQuestionsLocallyFromText,
  type ParsedQuestionItem,
} from '@/lib/document-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json(
        { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' },
        { status: 401 },
      );
    }

    const roleRepo = await getRepo(UserRoleSchema);
    const roleRecord = await roleRepo.findOne({ where: { user_id: user.id } });
    const role = roleRecord?.role;

    if (role !== 'admin' && role !== 'teacher') {
      return NextResponse.json(
        { status: 'error', message: 'Bạn không có quyền thực hiện chức năng này.' },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const subjectId = (formData.get('subjectId') as string) || '';

    if (!file) {
      return NextResponse.json(
        { status: 'error', message: 'Vui lòng chọn file tài liệu cần upload.' },
        { status: 400 },
      );
    }

    const fileName = file.name || 'document';
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    if (fileExt !== 'docx' && fileExt !== 'pdf') {
      return NextResponse.json(
        { status: 'error', message: 'Hệ thống chỉ hỗ trợ định dạng file .docx (Word) hoặc .pdf.' },
        { status: 400 },
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { status: 'error', message: 'Dung lượng file vượt quá giới hạn tối đa 15MB.' },
        { status: 400 },
      );
    }

    let subjectName = '';
    if (subjectId) {
      const subjectRepo = await getRepo(SubjectSchema);
      const subject = await subjectRepo.findOne({ where: { id: subjectId } });
      if (subject) {
        subjectName = subject.name;
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    let hasRedDetection = false;

    if (fileExt === 'docx') {
      const docxResult = await extractDocxTextWithRedColor(buffer);
      extractedText = docxResult.text;
      hasRedDetection = docxResult.hasRedRuns;
    } else {
      const pdfResult = await extractPdfTextSafe(buffer);
      extractedText = pdfResult.text;
      hasRedDetection = false;
    }

    if (!extractedText || extractedText.trim().length < 20) {
      return NextResponse.json(
        { status: 'error', message: 'File tài liệu không có đủ nội dung văn bản để bóc tách câu hỏi.' },
        { status: 400 },
      );
    }

    const localQuestions = parseQuestionsLocallyFromText(extractedText);

    let questions: ParsedQuestionItem[] = [];
    try {
      questions = await parseDocumentWithGroq({
        rawText: extractedText,
        subjectName,
        hasRedDetection,
      });
    } catch (aiErr) {
      console.warn('[API Upload] Gọi AI thất bại, sử dụng kết quả bóc tách nội bộ:', aiErr);
      questions = localQuestions;
    }

    if (questions.length === 0 && localQuestions.length > 0) {
      questions = localQuestions;
    }

    questions = cleanAndStandardizeQuestions(questions);

    if (questions.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Không nhận diện được câu hỏi nào từ file tài liệu này. Vui lòng kiểm tra lại cấu trúc đánh số câu hỏi.' },
        { status: 422 },
      );
    }

    const redDetectedCount = questions.filter((q) => q.is_red_detected).length;

    return NextResponse.json({
      status: 'success',
      fileName,
      fileType: fileExt,
      totalParsed: questions.length,
      redDetectedCount,
      hasRedDetection,
      questions,
    });
  } catch (error) {
    console.error('Lỗi API upload tài liệu:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xử lý tài liệu.',
      },
      { status: 500 },
    );
  }
}
