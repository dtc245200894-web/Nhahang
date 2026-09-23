# Golden Lotus - Flask

Đây là project Flask độc lập của hệ thống quản lý nhà hàng Golden Lotus.

## Kiến trúc

- `app.py`: Flask server và các API localhost.
- `templates/index.html`: frontend giao diện trình duyệt.
- `static/app.js`, `static/styles.css`: tương tác và giao diện frontend.
- `backend/database.py`: schema SQLite, dữ liệu mẫu và kết nối database.
- `backend/services.py`: nghiệp vụ đăng nhập, phân quyền, bàn, đặt bàn, gọi món, thanh toán, báo cáo và kho.
- `golden_lotus.db`: tự sinh ở lần chạy đầu tiên.

Các nghiệp vụ hiện có trên web: đăng nhập/đăng ký theo vai trò, duyệt tài khoản, dashboard, sơ đồ bàn, đặt và hủy bàn, gọi món, kiểm tra/trừ nguyên liệu, reset kho, thanh toán, hóa đơn và chi tiết hóa đơn, báo cáo 1/7/30 ngày, món bán chạy, gợi ý món và sinh mô tả món bằng AI mô phỏng.

## Chạy chương trình

Cần cài Python 3.10 trở lên từ https://www.python.org/downloads/ và bật tùy chọn `Add Python to PATH`.

Mở PowerShell tại thư mục này rồi chạy:

```powershell
pip install -r requirements.txt
python app.py
```

Mở trình duyệt tại http://127.0.0.1:5000

Tài khoản mẫu:

- Tài khoản: `minh.anh`
- Mật khẩu: `123456`
- Vai trò: `manager`

