# Tính năng khu quản trị

## Quyền theo vai trò

| Tính năng | Cán bộ lớp | GVCN | Admin |
|---|---:|---:|---:|
| Nhập và xem lịch sử điểm | Có | Có | Có |
| Quản lý nội dung/đăng thông báo | Có | Có | Có |
| Sửa danh sách học sinh | Có | Có | Có |
| Xem dữ liệu riêng tư học sinh | Không | Có | Có |
| Cấp/sửa vai trò tài khoản | Không | Có | Có |
| Cấu hình kỹ thuật Supabase | Không | Không | Có |

## Quản lý nội dung

Admin/GVCN/cán bộ lớp có thể:

1. **Đăng mới** bốn loại bài: Thông báo, Blog lớp, Facebook, TikTok.
2. **Xem danh sách** toàn bộ bài (nháp + đã xuất bản).
3. **Xóa** bài không còn cần thiết.

Mỗi bài có trạng thái nháp / đã xuất bản. Chỉ bài đã xuất bản mới hiện trên trang công khai. Không dán mật khẩu Facebook/TikTok hoặc khóa quản trị vào website; website chỉ lưu liên kết công khai.

## Quy trình đăng an toàn

1. Tạo bài ở trạng thái **Nháp**.
2. Kiểm tra tên học sinh, hình ảnh và quyền đồng ý trước khi công khai.
3. Với Facebook/TikTok, đăng bài/video trên nền tảng chính chủ trước, sau đó dán liên kết công khai vào web.
4. Chuyển sang **Xuất bản** khi nội dung đã được GVCN duyệt.
5. Không đưa CCCD, ngày sinh, số điện thoại, địa chỉ hay điểm cá nhân vào bài công khai.
