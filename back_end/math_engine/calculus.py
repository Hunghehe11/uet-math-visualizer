import math

class CalculusEngine:
    # Môi trường an toàn cho các phép tính vi phân và tích phân
    SAFE_ENV = {    
        "__builtins__": None,
        #Lượng giác và lưỡng giác ngược
        "sin": math.sin, "cos": math.cos, "tan": math.tan, "cot": lambda x: 1 / math.tan(x),
        "arcsin": math.asin, "arccos": math.acos, "arctan": math.atan,
        "asin": math.asin, "acos": math.acos, "atan": math.atan,
        #Hypebolic
        "sinh": math.sinh, "cosh": math.cosh, "tanh": math.tanh,
        "arcsinh": math.asinh, "arccosh": math.acosh, "arctanh": math.atanh,
        #Mũ và logarit
        "exp": math.exp,
        "ln": math.log,
        "log": lambda x, base=10: math.log(x, base),
        "log10": math.log10, "log2": math.log2,
        #Hằng số
        "pi": math.pi, "e": math.e, "tau": math.tau, "inf": math.inf, "nan": math.nan,
        #Căn + trị tuyệt đối
        "sqrt": math.sqrt, "abs": abs,
        "cbrt": math.cbrt
    }

    def __init__(self, expr: str):
        self.expr = expr.replace("^", "**")  # Thay thế toán tử mũ để phù hợp với Python

    @staticmethod
    def parse_number(val):
        if isinstance(val, float|int):
            return float(val)
        elif isinstance(val, str):
            clean_val = val.strip().replace("^", "**")  # Thay dấu phẩy bằng dấu chấm
            try:
                result = float(clean_val)
            except ValueError:
                try:
                    result = float(eval(clean_val, CalculusEngine.SAFE_ENV, {}))
                except Exception:
                    raise ValueError(f"Biểu thức hằng số không hợp lệ: '{val}'")
        else:
             raise ValueError(f"Giá trị đầu vào là chuỗi hoặc số")   

        if not math.isfinite(result):
            raise ValueError(f"Giá trị đầu vào không phải là số hữu hạn: '{val}'")

        return result

    def f(self, x: float) -> float:
        """Đánh giá biểu thức tại một giá trị x cụ thể."""
        local_vars = {"x": x}
        return float(eval(self.expr, self.SAFE_ENV, local_vars))

    def derivative(self, x: float, h: float = 1e-5) -> float:
        """Tính đạo hàm cấp 1 tại điểm x."""
        return (self.f(x + h) - self.f(x - h)) / (2 * h)

    def simpson_integral(self, a: float, b: float, n: int = 1000) -> float:
        """Tính tích phân xác định trên [a,b] bằng quy tắc Simpson 1/3."""
        if n % 2 == 1:
            n += 1  # Đảm bảo n là số chẵn
        h = (b - a) / n
        total = self.f(a) + self.f(b)

        for i in range(1, n):
            coeff = 4 if i % 2 == 1 else 2
            total += coeff * self.f(a + i * h)

        return (h / 3.0) * total

    def sample_points(self, a: float, b: float, steps: int = 200) -> list:
        """Lấy mẫu tọa độ (x, f(x), f'(x)) và bỏ lọc lấy miền xác định để gửi sang HTML5 Canvas vẽ đồ thị."""
        points = []
        dx = (b - a) / steps
        for i in range(steps + 1):
            x = a + i * dx
            try:
                y = self.f(x)
                dy = self.derivative(x)
                # 2. Chặn cả y lẫn dy để tránh tiệm cận đứng (như ln(x) gần 0) làm hỏng tỷ lệ Canvas
                if (
                    math.isfinite(y) and abs(y) < 1e5
                    and math.isfinite(dy) and abs(dy) < 1e5
                ):
                    points.append({"x": round(x, 4), "y": round(y, 4), "dy": round(dy, 4)})
            except Exception:
                continue  # Tự động bỏ qua vùng x <= 0 của ln(x) hoặc sqrt(x)
        return points

    def gradient_descent(
        self,
        x0: float,
        learning_rate: float = 0.05,
        max_iter: int = 200,
        tol: float = 1e-6,
        max_bound: float = 1e5
    ) -> dict:
        """Tìm cực tiểu địa phương bằng Gradient Descent, có chặn bùng nổ đạo hàm."""
        x = float(x0)
        history = []
        status = "max_iter_reached"  # Mặc định nếu chạy hết vòng lặp mà chưa đạt tol

        try:
            y0 = self.f(x)
            if not math.isfinite(y0):
                raise ValueError("Điểm xuất phát x0 không thuộc miền xác định.")
            history.append({"x": round(x, 4), "y": round(y0, 4)})
        except Exception as e:
            return {"status": "error", "detail": str(e), "history": []}

        for step in range(1, max_iter + 1):
            try:
                grad = self.derivative(x)
                new_x = x - learning_rate * grad

                # 1. Trạm chặn Exploding Gradient (tràn số hoặc lao ra vô cực)
                if not math.isfinite(new_x) or abs(new_x) > max_bound:
                    status = "diverged"
                    break

                new_y = self.f(new_x)
                if not math.isfinite(new_y) or abs(new_y) > 1e8:
                    status = "diverged"
                    break

                # Lưu tối đa 80 bước đầu vào history để gửi JSON cho nhẹ
                if len(history) < 80:
                    history.append({"x": round(new_x, 4), "y": round(new_y, 4)})

                # 2. Kiểm tra điều kiện hội tụ (dừng sớm)
                if abs(new_x - x) < tol:
                    x = new_x
                    status = "converged"
                    break

                x = new_x

            except (OverflowError, ValueError, ZeroDivisionError):
                # Dừng ngay nếu bước nhảy văng sang vùng không xác định (vd: căn số âm)
                status = "diverged"
                break

        return {
            "status": status,                # "converged", "diverged", hoặc "max_iter_reached"
            "x_min": round(x, 5) if status != "diverged" else None,
            "y_min": round(self.f(x), 5) if status != "diverged" else None,
            "steps": step,
            "history": history
        }


    #Tính giới hạn của hàm f(x) khi x tiến tới một giá trị cụ thể
    def limit(self, target: str | float, tol: float = 1e-4) -> dict:
        """Tính giới hạn trái, phải và 2 phía của hàm f(x) khi x -> target."""
        target_str = str(target).strip().lower()

        #TH1: Giới hạn vô cực
        if target_str in ("inf", "+inf", "-inf", "oo", "+oo", "-oo"):
            sign = -1 if target_str.startswith("-") else 1
            samples = []
            for p in [2,4,6,8]:
                try:
                    val = self.f(sign * (10 ** p))
                    if math.isfinite(val):
                        samples.append(val)
                except Exception:
                    break

            if not samples:
                    return {"exists": False, "detail": "Hàm không xác định khi tiến ra vô cực."}
            if abs(samples[-1]) > 1e7:
                inf_sign = "+∞" if samples[-1] > 0 else "-∞"
                return {"exists": False, "value": inf_sign, "detail": f"Giới hạn tiến ra {inf_sign}"}
            if len(samples) >= 2 and abs(samples[-1] - samples[-2]) < tol:
                return {"exists": True, "value": round(samples[-1], 5)}
            return {"exists": False, "detail": "Hàm dao động, không hội tụ tại vô cực."}

        #TH2: Giới hạn hữu hạn
        x0 = self.parse_number(target)
        deltas = [1e-2, 1e-4, 1e-6, 1e-7]

        def approach(direction: int):
            vals = []
            for d in deltas:
                try:
                    y = self.f(x0 + direction * d)
                    if math.isfinite(y):
                        vals.append(y)
                except Exception:
                    continue

            if not vals:
                return None
            if abs(vals[-1]) > 1e7:
                return "+∞" if vals[-1] > 0 else "-∞"
            return round(vals[-1], 5)

        lim_left = approach(-1)
        lim_right = approach(1)

        if isinstance(lim_left, float) and isinstance(lim_right, float):
            if abs(lim_left - lim_right) < tol:
                avg = round((lim_left + lim_right) / 2, 5)
                return {"exists": True, "value": avg, "left": lim_left, "right": lim_right}

        return {
            "exists": False,
            "value": None,
            "left": lim_left,
            "right": lim_right,
            "detail": "Giới hạn trái và phải không bằng nhau hoặc tiến ra vô cực."
        }