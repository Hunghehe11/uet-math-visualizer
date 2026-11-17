from fractions import Fraction
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from math_engine.matrix import Matrix
from math_engine.calculus import CalculusEngine

app = FastAPI(title="UET Math Visualizer API")

# Mở khóa CORS để giao diện HTML/JS chạy ở cổng khác gọi được vào Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hàm phụ trợ: Đổi 1 giá trị Fraction sang chuỗi phân số hoặc số thập phân cho JSON
def format_value(val: Fraction | None, as_fraction: bool):
    if val is None:
        return None
    return str(val) if as_fraction else round(float(val), 4)

# Hàm phụ trợ: Đổi cả ma trận 2 chiều chứa Fraction sang dạng JSON hiểu được
def format_matrix(matrix_data: list[list[Fraction]], as_fraction: bool):
    return [
        [format_value(val, as_fraction) for val in row]
        for row in matrix_data
    ]

# Khuôn mẫu kiểm tra dữ liệu đầu vào cho API Ma trận
class MatrixRequest(BaseModel):
    matrix_a: list[list[int | float | str]]          # Nhận được cả số lẫn chuỗi "1/3"
    matrix_b: list[list[int | float | str]] | None = None
    operation: str                                   # "analyze", "add", "multiply", "transpose"
    as_fraction: bool = True                         # Mặc định trả về dạng phân số


#Khuôn mẫu cho giải tích 1
class CalculusRequest(BaseModel):
    expr: str
    x0: float | int |str
    a: float | int | str
    b: float | int | str
    lr: float = 0.05


#API 1 - ĐẠI SỐ TUYẾN TÍNH
@app.post("/api/matrix")
def solve_matrix(req: MatrixRequest):
    try:
        A = Matrix(req.matrix_a)

        if req.operation == "analyze":
            result = A.gauss_analysis()
            return {
                "status": "ok",
                "data": {
                    "rref": format_matrix(result["rref"], req.as_fraction),
                    "rank": result["rank"],
                    "determinant": format_value(result["determinant"], req.as_fraction)
                }
            }

        elif req.operation == "transpose":
            return {
                "status": "ok",
                "result_matrix": format_matrix(A.transpose().data, req.as_fraction)
            }

        elif req.operation == "add":
            if req.matrix_b is None:
                raise ValueError("Cần nhập Ma trận B để thực hiện phép cộng.")
            B = Matrix(req.matrix_b)
            return {
                "status": "ok",
                "result_matrix": format_matrix((A + B).data, req.as_fraction)
            }

        elif req.operation == "multiply":
            if req.matrix_b is None:
                raise ValueError("Cần nhập Ma trận B để thực hiện phép nhân.")
            B = Matrix(req.matrix_b)
            return {
                "status": "ok",
                "result_matrix": format_matrix((A * B).data, req.as_fraction)
            }

        elif req.operation == "inverse":
            return {
                "status": "ok",
                "result_matrix": format_matrix(A.inverse().data, req.as_fraction)
            }

        elif req.operation == "solve":
            if req.matrix_b is None:
                raise ValueError("Cần nhập vector vế phải b vào matrix_b.")
            B = Matrix(req.matrix_b)
            res = A.solve_system(B)

            # Chuyển đổi các phần tử Fraction sang chuỗi phân số hoặc số thập phân
            if res["status"] == "unique":
                res["solution"] = [format_value(v, req.as_fraction) for v in res["solution"]]
            elif res["status"] == "infinite":
                res["particular_solution"] = [format_value(v, req.as_fraction) for v in res["particular_solution"]]
                res["free_vectors"] = {
                    k: [format_value(v, req.as_fraction) for v in vec]
                    for k, vec in res["free_vectors"].items()
                }

            return {"status": "ok", "data": res}

        elif req.operation == "lu":
            lu = A.lu_decomposition()
            return {
                "status": "ok",
                "data": {
                    "L": format_matrix(lu["L"], req.as_fraction),
                    "U": format_matrix(lu["U"], req.as_fraction)
                }
            }

        elif req.operation == "subspaces":
            subs = A.subspaces()
            return {
                "status": "ok",
                "data": {
                    "rank": subs["rank"],
                    "nullity": subs["nullity"],
                    "im_col_basis": format_matrix(subs["col_space"], req.as_fraction),
                    "row_basis": format_matrix(subs["row_space"], req.as_fraction),
                    "ker_basis": format_matrix(subs["null_space"], req.as_fraction)
                }
            }

        raise ValueError("Phép toán không hợp lệ.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


#APT 2 - GIẢI TÍCH 1
@app.post("/api/calculus")
def solve_calculus(req: CalculusRequest):
    try:
        engine = CalculusEngine(req.expr)

        # 1. Cận tích phân [a, b] bắt buộc phải là số hữu hạn
        a = CalculusEngine.parse_number(req.a)
        b = CalculusEngine.parse_number(req.b)

        # 2. Tính giới hạn trước (nhận thẳng req.x0 để hỗ trợ cả "inf", "-inf" và điểm gián đoạn)
        limit_res = engine.limit(req.x0)

        # 3. Tính f(x0), f'(x0) và Gradient Descent (nếu x0 hữu hạn và xác định)
        f_x0, df_x0, gd_res, parsed_x0 = None, None, None, None
        try:
            parsed_x0 = CalculusEngine.parse_number(req.x0)
            f_x0 = round(engine.f(parsed_x0), 5)
            df_x0 = round(engine.derivative(parsed_x0), 5)
            gd_res = engine.gradient_descent(parsed_x0, learning_rate=req.lr)
        except Exception:
            # Nếu x0 là "inf" hoặc điểm gián đoạn (vd: sin(x)/x tại 0) thì bỏ qua, vẫn trả về limit
            pass

        return {
            "status": "ok",
            "parsed_inputs": {
                "x0": round(parsed_x0, 5) if parsed_x0 is not None else str(req.x0),
                "a": round(a, 5),
                "b": round(b, 5)
            },
            "f_x0": f_x0,
            "df_x0": df_x0,
            "limit": limit_res,
            "integral": round(engine.simpson_integral(a, b), 5),
            "points": engine.sample_points(a, b),
            "gd": gd_res
        }
    except ValueError as e:
        msg = str(e)
        if "math domain error" in msg:
            msg = "Biểu thức không xác định trên đoạn [a, b] (kiểm tra điều kiện của ln, log, căn bậc hai)."
        raise HTTPException(status_code=400, detail=msg)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi cú pháp biểu thức toán học: {e}")