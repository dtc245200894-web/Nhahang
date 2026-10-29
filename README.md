# Golden Lotus - Quản lý nhà hàng

Ứng dụng web quản lý nhà hàng, viết bằng Flask, SQLite, HTML, CSS và JavaScript. Ứng dụng có thể chạy trên máy cá nhân để thử nghiệm và phát triển.

## Chức năng

- Đăng nhập và phân quyền theo vai trò: quản lý, nhân viên phục vụ, thu ngân và nhân viên bếp.
- Dashboard, sơ đồ bàn, đặt bàn, gọi món, thanh toán, hóa đơn và báo cáo.
- Quản lý thực đơn, công thức, nguyên liệu và tồn kho.
- Trợ lý AI chat hỏi đáp nhiều chủ đề và sinh mô tả món bằng Ollama chạy cục bộ.
- Dữ liệu được lưu trong SQLite tại `golden_lotus.db`, tự tạo khi ứng dụng chạy lần đầu.

Trợ lý AI dựa trên thực đơn hiện tại khi trả lời về món ăn, nhưng không đọc trạng thái bàn, đơn hàng, doanh thu hoặc tồn kho theo thời gian thực. Model mặc định là `gemma4:e2b`; có thể đổi bằng biến môi trường `OLLAMA_MODEL`.

## Yêu cầu

- Windows 10 phiên bản 22H2 trở lên, macOS hoặc Linux.
- Python 3.10 trở lên.
- Git để clone repository.
- Ollama để chạy AI cục bộ. Ollama và Flask cần chạy trên cùng máy.
- Kết nối Internet khi cài dependencies và tải model lần đầu.
- Dung lượng trống vài GB trở lên cho model. `gemma4:e2b` chiếm khoảng 7,2 GB theo hướng dẫn Ollama; tốc độ suy luận phụ thuộc RAM/GPU của máy.

Tải phần mềm từ trang chính thức:

- Python: https://www.python.org/downloads/
- Ollama: https://ollama.com/download
- Git: https://git-scm.com/downloads

## Cài đặt trên Windows

### 1. Cài Ollama

Tải và cài Ollama cho Windows từ https://ollama.com/download/windows. Sau khi cài, mở ứng dụng Ollama để nó chạy nền.

Mở một cửa sổ PowerShell mới và xác nhận lệnh đã được cài:

```powershell
ollama --version
```

Nếu lệnh chưa được nhận, đóng rồi mở lại PowerShell hoặc VS Code. Nếu vẫn không được, khởi động lại máy sau khi cài Ollama.

### 2. Clone repository

Mở PowerShell trong thư mục muốn lưu dự án:

```powershell
git clone https://github.com/dtc245200894-web/Nhahang.git
cd Nhahang
```

Nếu đã có bản clone, vào thư mục dự án và lấy thay đổi mới nhất:

```powershell
cd Nhahang
git pull
```

### 3. Tạo môi trường Python và cài dependencies

Trong thư mục dự án, chạy:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Nếu PowerShell chặn kích hoạt môi trường ảo, có thể bỏ qua bước Activate và gọi Python trong môi trường ảo trực tiếp:

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 4. Tải model AI

Chạy lệnh sau một lần trong PowerShell:

```powershell
ollama pull gemma4:e2b
```

Đợi tải hoàn tất và thấy thông báo `success`. Không cần chạy `ollama run`: người dùng gửi câu hỏi trong khung Trợ lý AI của ứng dụng web. Ollama chỉ cần đang mở và chạy nền.

Nếu muốn dùng model khác, tải model Ollama trước, sau đó đặt cùng tên model trước khi chạy Flask. Ví dụ trong PowerShell:

```powershell
$env:OLLAMA_MODEL = "gemma4:e2b"
```

### 5. Khởi động ứng dụng

Đảm bảo ứng dụng Ollama đang chạy, sau đó ở thư mục dự án chạy:

```powershell
python app.py
```

Nếu dùng cách bỏ qua bước kích hoạt môi trường ảo:

```powershell
.\.venv\Scripts\python.exe app.py
```

Khi Flask đã khởi động, mở trình duyệt tại:

http://127.0.0.1:5000

Để dừng Flask, quay lại terminal đang chạy app và nhấn `Ctrl+C`. Đóng ứng dụng Ollama khi không cần sử dụng AI nữa.

## Chạy trên macOS hoặc Linux

Cài Python, Git và Ollama theo hướng dẫn chính thức cho hệ điều hành. Mở Ollama để nó chạy nền, rồi chạy trong terminal:

```bash
git clone https://github.com/dtc245200894-web/Nhahang.git
cd Nhahang
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
ollama pull gemma4:e2b
python app.py
```

Mở http://127.0.0.1:5000. Không cần API key Gemini hoặc Ollama Cloud cho model chạy cục bộ.

## Tài khoản dùng thử

Database mẫu được tạo tự động khi chạy ứng dụng lần đầu:

- Tài khoản: `minh.anh`
- Mật khẩu: `123456`
- Vai trò: `Quản lý`

Đây là thông tin mặc định dành cho thử nghiệm. Không dùng mật khẩu này cho môi trường thật.

## Cấu trúc dự án

- `app.py`: Flask server và các API.
- `backend/database.py`: schema, dữ liệu mẫu và kết nối SQLite.
- `backend/services.py`: nghiệp vụ nhà hàng.
- `backend/ai_provider.py`: kết nối Flask tới Ollama API cục bộ.
- `templates/index.html`: trang web chính.
- `static/app.js`: tương tác giao diện.
- `static/*.css`: kiểu dáng giao diện.
- `requirements.txt`: dependencies Python.
- `golden_lotus.db`: SQLite database được tạo khi chạy; không được commit.

## Cấu hình Ollama

Mặc định backend gọi Ollama tại `http://127.0.0.1:11434` và dùng model `gemma4:e2b`. Có thể cấu hình lại bằng biến môi trường trong cùng terminal trước khi chạy app.

PowerShell:

```powershell
$env:OLLAMA_HOST = "http://127.0.0.1:11434"
$env:OLLAMA_MODEL = "gemma4:e2b"
python app.py
```

macOS/Linux:

```bash
export OLLAMA_HOST="http://127.0.0.1:11434"
export OLLAMA_MODEL="gemma4:e2b"
python app.py
```

Ứng dụng Flask cần kết nối được tới Ollama trên cùng máy. Trợ lý chạy model cục bộ, không cần API key. Model cần Internet để tải lần đầu; sau khi tải xong, chat cục bộ không cần gửi prompt lên Gemini API.

## Xử lý lỗi thường gặp

### `ollama` không được nhận diện

Mở lại PowerShell hoặc VS Code sau khi cài Ollama. Kiểm tra:

```powershell
ollama --version
```

Nếu vẫn chưa được, chạy Ollama từ Start Menu hoặc khởi động lại máy.

### Tải model báo thiếu dung lượng

Model được lưu trong ổ đĩa hệ thống theo mặc định. Giải phóng dung lượng rồi chạy lại:

```powershell
ollama pull gemma4:e2b
```

Nếu tải bị ngắt, chạy lại cùng lệnh; Ollama sẽ kiểm tra và tải các phần còn thiếu.

### Trợ lý báo không kết nối được Ollama

1. Mở ứng dụng Ollama và đợi ứng dụng khởi động xong.
2. Trong PowerShell, kiểm tra Ollama có model:

   ```powershell
   ollama list
   ```

3. Nếu chưa thấy `gemma4:e2b`, tải model:

   ```powershell
   ollama pull gemma4:e2b
   ```

4. Khởi động lại Flask bằng `Ctrl+C`, sau đó `python app.py`.

### Báo không tìm thấy model

Tên model đang cấu hình phải khớp tên đã cài. Kiểm tra bằng `ollama list`; đặt lại `$env:OLLAMA_MODEL` nếu cần và khởi động lại Flask.

### AI phản hồi chậm

Lần đầu model được nạp vào bộ nhớ có thể chậm. Model lớn cần nhiều RAM/VRAM; đóng bớt ứng dụng khác hoặc chọn model Ollama nhỏ hơn, tải model đó trước rồi đặt `OLLAMA_MODEL` theo tên tương ứng.

### Cổng 5000 đang được sử dụng

Đóng phiên Flask cũ bằng `Ctrl+C` trong terminal đang chạy. Sau đó chạy lại `python app.py`.

## Lưu ý bảo mật và triển khai

- Đây là cấu hình phát triển cục bộ. `app.py` hiện bật Flask debug mode; chỉ truy cập trên máy của bạn và **không đưa debug server ra Internet**.
- `app.secret_key` trong cấu hình hiện là giá trị phát triển. Cần thay bằng secret an toàn lấy từ biến môi trường trước khi triển khai thật.
- Đổi mật khẩu mẫu trước khi sử dụng với dữ liệu thật.
- Không commit database chứa dữ liệu cá nhân hoặc dữ liệu nhà hàng; `golden_lotus.db` đã được thêm vào `.gitignore`.
- Khi triển khai cho nhiều người dùng hoặc lên máy chủ, cần cấu hình server production, HTTPS, secret riêng, phân quyền và bảo vệ dữ liệu phù hợp.
