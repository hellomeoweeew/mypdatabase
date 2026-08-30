-- Chạy trong Supabase SQL Editor để kiểm tra cấu hình đăng nội dung.
select
  to_regclass('public.content_posts') as bang_noi_dung,
  (select role from public.profiles where id = 'c6260441-599a-4b99-866c-77286e50f5b3') as vai_tro_gvcn;

-- Kết quả đúng: bang_noi_dung = content_posts; vai_tro_gvcn = teacher.
