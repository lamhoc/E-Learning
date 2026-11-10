-- Migration: Add require_camera boolean column to public.exams
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS require_camera BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.exams.require_camera IS 'Indicates whether students are required to enable webcam proctoring during the exam.';
