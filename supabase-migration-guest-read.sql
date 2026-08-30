-- Cho phép khách + mọi người XEM bảng điểm / xếp hạng.
-- Chỉ staff (admin) mới được ghi / sửa / xóa.
-- Chạy sau schema + các migration trước.

-- 1) Danh sách tên học sinh (không có dữ liệu riêng tư) — khách đọc được
drop policy if exists "directory: public read active" on public.student_directory;
create policy "directory: public read active" on public.student_directory
  for select to anon
  using (active = true);

drop policy if exists "directory: members read" on public.student_directory;
create policy "directory: members read" on public.student_directory
  for select to authenticated
  using (true);

-- 2) Điểm thi đua: BỎ policy "chỉ self hoặc staff"
--    vì policy đó làm bảng xếp hạng chỉ thấy 1 người (đúng nhận xét của bạn).
drop policy if exists "scores: self or staff read" on public.competition_records;
drop policy if exists "scores: public read" on public.competition_records;

-- Ai cũng được ĐỌC (khách + đã đăng nhập) → xếp hạng hiển thị đủ
create policy "scores: anyone read" on public.competition_records
  for select
  to anon, authenticated
  using (true);

-- Ghi / sửa / xóa vẫn chỉ staff (giữ policy cũ nếu đã có)
drop policy if exists "scores: staff write" on public.competition_records;
create policy "scores: staff write" on public.competition_records
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
