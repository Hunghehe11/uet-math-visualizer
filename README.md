# UET Math Visualizer

Ứng dụng web trực quan hóa và tính toán **Đại số tuyến tính** và **Giải tích 1** sử dụng thuật toán tự cài đặt từ đầu (Python OOP & HTML5 Canvas).

## Tính năng chính

### 1. Đại số tuyến tính (Tính toán phân số chính xác tuyệt đối)
* **Phân tích ma trận:** Biến đổi bậc thang rút gọn (RREF), tính hạng (`Rank`) và định thức (`Det`).
* **Phép toán cơ bản:** Cộng, nhân, chuyển vị ($A^T$) và tìm ma trận nghịch đảo ($A^{-1}$) bằng khử Gauss-Jordan.
* **Giải hệ phương trình tuyến tính ($Ax = b$):** Phân loại và giải cả 3 trường hợp (vô nghiệm, nghiệm duy nhất, vô số nghiệm biểu diễn theo tham số tự do).
* **Phân tích & Không gian con:** Phân tích $A = LU$, tìm cơ sở và số chiều của $\ker(A)$, $\text{Im}(A) = \text{Col}(A)$, và $\text{Row}(A)$.

### 2. Giải tích 1 & Đồ thị
* **Phân tích hàm sơ cấp:** Hỗ trợ đa thức, lượng giác, lượng giác ngược, `ln`, `log`, `exp`, `sqrt`, `cbrt` cùng các hằng số `pi`, `e`.
* **Tính toán giải tích:** Đạo hàm trung tâm $f'(x_0)$, tích phân xác định theo quy tắc Simpson, và tính giới hạn trái/phải/vô cực ($\lim_{x \to x_0} f(x)$).
* **Trực quan hóa:** Vẽ đồ thị $f(x)$, $f'(x)$ và mô phỏng quỹ đạo hội tụ của thuật toán **Gradient Descent** trên HTML5 Canvas.

## Cấu trúc thư mục

```text
uet-math-visualizer/
├── backend/
│   ├── main.py                  # FastAPI endpoints & static file serving
│   └── math_engine/
│       ├── __init__.py
│       ├── matrix.py            # Lớp Matrix xử lý đại số tuyến tính với Fraction
│       └── calculus.py          # Lớp CalculusEngine xử lý giải tích & tối ưu
├── frontend/
│   ├── index.html               # Giao diện 2 tab
│   ├── style.css                # Dark-mode UI
│   └── app.js                   # Kết nối API & vẽ đồ thị Canvas
├── run.py                       # Khởi chạy nhanh server & tự mở trình duyệt
├── requirements.txt
└── README.md