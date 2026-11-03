-- =========================================================================
-- Migration: Sửa lỗi mã hóa ký tự tiếng Việt (Gi?ng vi?n demo -> Giảng viên demo)
-- =========================================================================

UPDATE public.profiles
SET full_name = 'Giảng viên demo'
WHERE full_name ILIKE '%Gi?ng vi?n demo%' 
   OR full_name ILIKE '%Gi?ng vi?n%'
   OR full_name = 'Gi?ng vi?n demo';

UPDATE public.profiles
SET full_name = REPLACE(REPLACE(full_name, 'Gi?ng', 'Giảng'), 'vi?n', 'viên')
WHERE full_name LIKE '%Gi?ng%' OR full_name LIKE '%vi?n%';

