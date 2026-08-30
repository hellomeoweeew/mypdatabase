-- Chạy một lần sau supabase-migration-noi-dung.sql.
-- Cho phép khách (anon) đọc bài đã xuất bản; staff vẫn quản lý toàn bộ.

drop policy if exists "content: public read published" on public.content_posts;
create policy "content: public read published" on public.content_posts
  for select to anon
  using (is_published = true);

-- Đảm bảo authenticated vẫn đọc được bài đã xuất bản hoặc toàn bộ nếu là staff
drop policy if exists "content: members read published" on public.content_posts;
create policy "content: members read published" on public.content_posts
  for select to authenticated
  using (is_published = true or public.is_staff());
