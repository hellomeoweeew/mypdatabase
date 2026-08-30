# Hướng dẫn sử dụng web nội bộ lớp 10 Tin

## 1. Dành cho học sinh

### Xem không cần đăng nhập (Khách)

Ai cũng có thể mở web và xem:

- Điểm tập thể tuần (khi admin đã chốt; hoặc ước lượng nếu có dữ liệu)
- Bảng xếp hạng tuần (top tích cực)
- Nội quy, thang điểm thi đua (lọc / tìm kiếm)
- Thông báo đã xuất bản + lịch sự kiện
- Danh sách tên thành viên lớp

**Không cần tài khoản.** Chỉ việc nhập điểm, chốt tuần, đăng thông báo mới cần **Admin**.

### Tài khoản

- **Khách:** xem toàn bộ trang công khai, không đăng nhập.
- **Admin:** Khu quản trị (nhập điểm, chốt tuần, lịch, thông báo).

Không liên kết từng học sinh với tài khoản riêng.

## 2. Dành cho Admin (GVCN)

### Khu quản trị

Đăng nhập bằng tài khoản admin → **Khu quản trị**:

1. **Nhập điểm** — đơn hoặc hàng loạt; có ô **tìm tên** học sinh.
2. **Nhật ký** — lọc theo tuần / học sinh / loại; sửa hoặc xóa bản ghi.
3. **Chốt tuần** — điểm tập thể chính thức; banner nhắc nếu tuần hiện tại chưa chốt.
4. **Báo cáo** — chọn tuần → **Tải CSV** hoặc **In báo cáo**.
5. **Lịch** — thêm / **sửa** / xóa sự kiện.
6. **Nội dung** — đăng / **sửa** (đổi tiêu đề, về nháp) / xóa thông báo.

Nút **◐** đổi giao diện sáng/tối. CSV UTF-8 (Excel). In cần cho phép popup.

## 3. Điểm cá nhân mỗi tuần

Mỗi học sinh bắt đầu tuần với **100 điểm gốc**. Các lần cộng/trừ trong tuần được cộng dồn:

`Tổng tuần = 100 + cộng − trừ`

Bảng xếp hạng trên trang chủ hiển thị tổng này (kèm phần thay đổi).

## 4. Thang điểm đang có trên web

Tệp `quy-dinh-thi-dua.js` đã được đối chiếu với dự thảo thang chấm điểm 2026-2027 và hiện chứa:

- **22 mục trừ nề nếp và hành vi nghiêm cấm:** từ vắng không phép (-3), đi trễ (-2), đồng phục/phù hiệu (-2), điện thoại/tai nghe (-6), đến xúc phạm hoặc đánh nhau (-15).
- **12 mục KTX/bán trú:** chỉ áp dụng cho học sinh nội trú hoặc bán trú. Không chọn các mục `KTX-*`/`BT-*` nếu không thuộc diện áp dụng.
- **30 mức cộng:** thông báo vi phạm, hỗ trợ hoạt động, hành động đẹp (mỗi mục +2), dự thi theo phân công không đạt giải (+1), và các giải hội thi/cuộc thi từ cấp trường đến quốc gia (+2 đến +20).

### Điểm cần lưu ý

- **Vắng có phép:** dự thảo ghi rõ trường hợp phụ huynh xin qua hệ thống và được duyệt trước điểm danh thì **không trừ**. Mục này không được đưa vào danh sách nhập tự động để tránh hiểu sai.
- Các mục mức độ đặc biệt còn kèm xử lý kỷ luật/hạnh kiểm phải thực hiện theo quy định nhà trường, không chỉ dựa vào số điểm trên web.
- Phân biệt **hội thi** và **cuộc thi/kỳ thi**: mức cộng không giống nhau; hãy chọn đúng mục có mã `HT-*` hoặc `CT-*`.
- Công thức tập thể: `[(cộng nề nếp - trừ nề nếp) + (cộng học tập - trừ học tập)] / 2`. Chức năng nhập điểm tập thể chưa được xây dựng.

## 4. Bảo mật

- Không đưa khóa secret/service role của Supabase vào website.
- Chỉ dùng Publishable/anon key cùng Row Level Security.
- Không nhập CCCD, ngày sinh, nơi sinh vào web.
- Không chia sẻ mật khẩu; đổi mật khẩu ngay khi nghi ngờ lộ tài khoản.
