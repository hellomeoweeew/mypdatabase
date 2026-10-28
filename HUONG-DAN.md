# KHO DỮ LIỆU DI ĐỘNG — Hướng dẫn

Web lưu trữ cá nhân phong cách sci-fi: **Tủ → Ngăn → Hồ sơ** (ghi chú, nhãn, liên kết, file đính kèm) và **Nhật ký** tự lưu theo ngày.
Mọi dữ liệu nằm trên **Supabase** (database online miễn phí). Không còn file dữ liệu nào trong web.

## Các file

| File | Dùng để |
|---|---|
| `index.html`, `app.css`, `app.js` | Giao diện + logic web |
| `supabase-config.js` | **Nơi điền địa chỉ Supabase** (chỉ sửa file này) |
| `setup.sql` | Tạo bảng + bảo mật + kho file trên Supabase (chạy 1 lần) |
| `icon.svg` | Biểu tượng tab trình duyệt |

---

## Kết nối Supabase (khoảng 10 phút)

### Bước 1 — Có project Supabase
- **Dùng lại project của web cũ:** được, `setup.sql` không đụng tới bảng cũ. Vào https://supabase.com/dashboard và mở project đó.
- **Hoặc tạo project mới:** đăng nhập supabase.com bằng GitHub/Google → **New project** → đặt tên, mật khẩu database (ghi lại), chọn vùng **Southeast Asia (Singapore)** → **Create**. Đợi 1–2 phút.

### Bước 2 — Tạo bảng (chạy `setup.sql`)
1. Menu trái chọn **SQL Editor** → **New query**.
2. Mở file `setup.sql`, **copy toàn bộ**, dán vào ô, bấm **Run**.
3. Thấy *Success. No rows returned* là xong. Chạy lại lần nữa cũng không sao.

File này tạo:
- `cabinets` (tủ), `drawers` (ngăn), `items` (hồ sơ), `journal_entries` (nhật ký)
- Bảo mật **RLS**: mỗi tài khoản chỉ thấy dữ liệu của chính mình
- Kho file `kho-files` (riêng tư, tối đa 20 MB/file)

Kiểm tra: menu **Table Editor** phải thấy 4 bảng trên; menu **Storage** thấy bucket `kho-files`.

### Bước 3 — Lấy địa chỉ & khoá rồi điền vào web
1. Trong Supabase bấm nút **Connect** (trên cùng) hoặc vào **Project Settings → API Keys**.
2. Copy 2 thứ:
   - **Project URL** — dạng `https://abcxyz.supabase.co`
   - **Publishable key** (`sb_publishable_...`) — hoặc **anon public** key nếu project cũ.
3. Mở `supabase-config.js`, thay 2 dòng:
   ```js
   window.SUPABASE_CONFIG = {
     url: 'https://abcxyz.supabase.co',
     publishableKey: 'sb_publishable_xxxxxxxx'
   };
   ```
   File hiện đang điền sẵn địa chỉ project của web cũ — nếu dùng lại project đó thì không cần sửa.

> ⚠️ **Không bao giờ** dán `secret key` / `service_role key` vào web. Publishable key thì công khai được vì đã có RLS bảo vệ.

### Bước 4 — Cài đặt đăng nhập
Vào **Authentication → Sign In / Providers → Email**:
- Muốn tạo tài khoản dùng được ngay: **tắt** *Confirm email*.
- Muốn bắt xác nhận qua email: giữ bật, và vào **Authentication → URL Configuration** điền **Site URL** = địa chỉ web của bạn (bước 5), để link trong email mở đúng trang.

Muốn chỉ mình bạn dùng (không cho người lạ đăng ký): sau khi tạo xong tài khoản của bạn, vào **Authentication → Sign In / Providers** tắt **Allow new users to sign up**.

### Bước 5 — Mở web
- **Thử nhanh trên máy:** mở `index.html` bằng Chrome/Edge là chạy được (cần có mạng).
- **Đưa lên mạng để dùng trên điện thoại** (miễn phí, chọn 1):
  - **GitHub Pages** (giống web cũ `tin10lqd`): tải toàn bộ file lên 1 repo → **Settings → Pages** → Branch `main` → Save. Địa chỉ dạng `https://ten-ban.github.io/ten-repo/`.
  - **Netlify Drop:** vào https://app.netlify.com/drop, kéo thả cả thư mục vào là có link.

Sau đó: mở web → **Tạo tài khoản** → đăng nhập → lần đầu web tự tạo sẵn "Tủ chung" có 2 ngăn mẫu.

---

## Cách dùng

- **Tủ:** nút **+ Tủ mới** (chọn tên + màu đèn). Bánh răng ⚙ trên tủ để đổi tên/màu/xoá.
- **Ngăn:** nút **+ THÊM NGĂN** dưới mỗi tủ. Bấm vào ngăn để kéo ngăn ra.
- **Hồ sơ:** trong ngăn bấm **+ Hồ sơ mới** → tiêu đề, nội dung, nhãn, link, file đính kèm → **Lưu vào kho**. Có thể ghim, chuyển sang ngăn khác, lọc, sắp xếp.
- **Tìm kiếm:** ô "Tìm trong toàn bộ kho" tìm cả hồ sơ lẫn nhật ký.
- **Nhật ký (tủ tím):**
  - Mỗi ngày 1 trang, đánh số **NGÀY 01, NGÀY 02…** theo thứ tự ngày.
  - Cứ gõ là **tự lưu vào database** sau ~1 giây (góc dưới hiện *ĐÃ LƯU VÀO DATABASE · giờ*).
  - Mất mạng lúc đang gõ: web giữ bản nháp trên máy và tự đồng bộ lại khi có mạng.
  - **+ Ngày mới**, đổi ngày bằng ô lịch, **Xuất .txt** để tải toàn bộ nhật ký về.

## Xem / sửa dữ liệu trực tiếp trên Supabase
**Table Editor** → chọn bảng (`items`, `journal_entries`…) để xem, sửa, xuất CSV. File đính kèm xem ở **Storage → kho-files**.

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| "Chưa cấu hình Supabase" | Kiểm tra lại `supabase-config.js` (URL bắt đầu bằng `https://`) |
| "Chưa có bảng trên Supabase" | Chưa chạy `setup.sql` (bước 2) |
| "Chưa có kho file" | Chạy lại `setup.sql` |
| "Email chưa xác nhận" | Mở email xác nhận, hoặc tắt *Confirm email* (bước 4) |
| Đăng nhập được nhưng không thấy dữ liệu cũ | Đúng thiết kế: mỗi tài khoản có kho riêng |
| Project bị "paused" | Gói miễn phí tạm dừng khi 7 ngày không dùng — vào dashboard bấm **Restore** |
