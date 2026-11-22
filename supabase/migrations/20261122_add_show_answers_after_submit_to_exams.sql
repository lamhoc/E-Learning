-- Migration: Thêm cấu hình Cho phép học sinh xem đáp án đúng/sai sau khi nộp bài
-- Ngày tạo: 2026-11-22

ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS show_answers_after_submit BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.exams.show_answers_after_submit IS 'Cho phép học sinh xem lại chi tiết bài làm, câu đúng/sai, đáp án đúng và lời giải sau khi nộp bài thi (mặc định là true).';
