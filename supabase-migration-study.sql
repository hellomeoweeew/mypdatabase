-- Thêm loại nội dung "study" = Thông báo học tập (dặn dò).
-- Chạy 1 lần trên Supabase SQL Editor.

alter type public.content_kind add value if not exists 'study';
