# Kết nối Supabase

1. Tạo một project Supabase mới, sau đó mở **SQL Editor**.
2. Dán và chạy toàn bộ tệp `supabase-schema.sql`.
3. Chạy thêm lần lượt:
   - `supabase-migration-noi-dung.sql`
   - `supabase-migration-public-read.sql`
   - `supabase-migration-phase1.sql` (chốt điểm tuần)
   - `supabase-migration-phase2.sql` (khách đọc lịch sự kiện)
   - `supabase-migration-guest-read.sql` (khách xem xếp hạng + danh sách tên)
   - `supabase-migration-study.sql` (loại **Thông báo học tập** / dặn dò)
   - `supabase-migration-study-date.sql` (cột **Ngày cần nhớ** — tự nổi đúng ngày)
4. Tạo **2 tài khoản** trong Authentication:
   - Admin: sau khi tạo, chạy `update public.profiles set role = 'admin' where id = 'UUID';`
   - Học sinh (tuỳ chọn): giữ role `student` — chỉ xem trang công khai.
5. Sao chép `supabase-config.example.js` thành `supabase-config.js`. Điền Project URL và **Publishable/anon key**.
6. Hosting HTTPS khuyến nghị. Không dùng `service_role`/secret key trên website.

## Vai trò (thực tế dùng)

- `admin` (hoặc `teacher` / `class_officer`): vào Khu quản trị đầy đủ.
- `student`: chỉ xem trang công khai. Không liên kết từng học sinh với tài khoản.

## Nguyên tắc dữ liệu

- `student_directory`: chỉ tên, vai trò lớp, trạng thái hoạt động.
- `student_private`: liên hệ phụ huynh/ghi chú - tách riêng và chỉ GVCN/admin hoặc đúng học sinh được xem.
- Không đưa CCCD, ngày sinh, nơi sinh vào website.
- Luôn giữ RLS bật. Chỉ sử dụng publishable/anon key ở phía website; secret/service role chỉ dùng trong môi trường máy chủ an toàn.
