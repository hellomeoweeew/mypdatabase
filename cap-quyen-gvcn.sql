-- Chạy sau khi đã chạy supabase-schema.sql.
-- Cấp quyền GVCN cho tài khoản đã tạo trong Supabase Authentication.
insert into public.profiles (id, role)
values ('c6260441-599a-4b99-866c-77286e50f5b3', 'teacher')
on conflict (id) do update set role = 'teacher';
