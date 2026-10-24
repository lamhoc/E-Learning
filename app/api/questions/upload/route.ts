import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extractDocxTextWithRedColor,
  extractPdfTextSafe,
  parseDocumentWithGroq,
  type ParsedQuestionItem,
} from '@/lib/document-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { status: 'error', message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' },
        { status: 401 }
      );
    }

    // Kiểm tra quyền hạn Giảng viên hoặc Admin
    const { data: roleRecord } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = roleRecord?.role;
    if (role !== 'admin' && role !== 'teacher') {
      return NextResponse.json(
        { status: 'error', message: 'Bạn không có quyền thực hiện chức năng này.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const subjectId = (formData.get('subjectId') as string) || '';

    if (!file) {
      return NextResponse.json(
        { status: 'error', message: 'Vui lòng chọn file tài liệu cần upload.' },
        { status: 400 }
      );
    }

    const fileName = file.name || 'document';
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    if (fileExt !== 'docx' && fileExt !== 'pdf') {
      return NextResponse.json(
        { status: 'error', message: 'Hệ thống chỉ hỗ trợ định dạng file .docx (Word) hoặc .pdf.' },
        { status: 400 }
      );
    }

    // Giới hạn dung lượng 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { status: 'error', message: 'Dung lượng file vượt quá giới hạn tối đa 15MB.' },
        { status: 400 }
      );
    }

    // Lấy thông tin môn học và kiểm tra phân công
    let subjectName = '';
    if (subjectId) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', subjectId)
        .maybeSingle();
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
        { status: 400 }
      );
    }

    // Gọi Groq AI để bóc tách thành danh sách câu hỏi
    const questions: ParsedQuestionItem[] = await parseDocumentWithGroq({
      rawText: extractedText,
      subjectName,
      hasRedDetection,
    });

    if (questions.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Không nhận diện được câu hỏi nào từ file tài liệu này. Vui lòng kiểm tra lại cấu trúc đánh số câu hỏi.' },
        { status: 422 }
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
      { status: 500 }
    );
  }
}
