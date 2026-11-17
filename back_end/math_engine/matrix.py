from fractions import Fraction
from copy import deepcopy

class Matrix:
    def __init__(self, data: list[list[float | Fraction]]):
        if not data or not data[0]:
            raise ValueError("Matrix cannot be empty")

        self.rows = len(data)
        self.cols = len(data[0])

        if any(len(row) != self.cols for row in data):
            raise ValueError("All rows must have the same number of columns")

        self.data = [[Fraction(str(value)) for value in row] for row in data]

    def __getitem__(self, index: int) -> list[Fraction]:
        if index < 0 or index >= self.rows:
            raise IndexError("Row index out of range")
        return self.data[index]

    def __str__(self) -> str:
        return "\n".join(["\t".join(f"{str(val):>8}" for val in row) for row in self.data])

    def __add__(self, other: 'Matrix') -> 'Matrix':
        if self.rows != other.rows or self.cols != other.cols:
            raise ValueError("Không thể cộng hai ma trận có kích thước khác nhau.")

        result_data = [
            [self.data[i][j] + other.data[i][j] for j in range(self.cols)]
            for i in range(self.rows)
        ]
        return Matrix(result_data)

    def __mul__(self, other) -> 'Matrix':
        if isinstance(other, (int, float | Fraction)):
            return Matrix([[self[i][j] * Fraction(str(other)) for j in range(self.cols)] for i in range(self.rows)])

        if isinstance(other, Matrix):
            if self.cols != other.rows:
                raise ValueError(f"Không thể nhân ma trận ({self.rows}x{self.cols}) với ({other.rows}x{other.cols}).")

            res = [[Fraction(0)] * other.cols for _ in range(self.rows)]
            for i in range(self.rows):
                for k in range(self.cols):
                    for j in range(other.cols):
                        res[i][j] += self.data[i][k] * other.data[k][j]
            return Matrix(res)

        raise TypeError("Chỉ có thể nhân ma trận với một số hoặc một ma trận khác.")

    def transpose(self) -> 'Matrix':
        return Matrix([[self.data[j][i] for j in range(self.rows)] for i in range(self.cols)])

    def gauss_analysis(self) -> dict:
        """Phân tích Gauss về dạng bậc thang rút gọn (RREF), hạng(Rank), và định thức(Det)."""
        M = deepcopy(self.data)
        rows, cols = self.rows, self.cols
        pivot_row = 0
        det = 1

        for col in range(cols):
            if pivot_row >= rows:
                break

            #Tìm phần tử trụ (pivot) để tránh chia cho 0 và sai số
            max_row = max(range(pivot_row, rows), key=lambda r: abs(M[r][col]))
            if abs(M[max_row][col])  == Fraction(0):
                det = 0
                continue  # Không có phần tử trụ trong cột này

            if max_row != pivot_row:
                M[pivot_row], M[max_row] = M[max_row], M[pivot_row]
                det *= -1  # Đổi dấu định thức khi hoán đổi hàng

            pivot_val = M[pivot_row][col]
            det *= pivot_val  # Cập nhật định thức

            # Chuẩn hóa hàng trụ để phần tử trụ trở thành 1
            M[pivot_row] = [val / pivot_val for val in M[pivot_row]]

            #Khử các phần tử dưới và trên hàng trụ
            for r in range(rows):
                if r != pivot_row:
                    factor = M[r][col]
                    M[r] = [M[r][j] - factor * M[pivot_row][j] for j in range(cols)]

            pivot_row += 1

        rref = [[Fraction(0) if abs(val) == Fraction(0) else val for val in row] for row in M]
        rank = sum(1 for row in rref if any(abs(val) != Fraction(0) for val in row))

        return {
            "rref": rref,
            "rank": rank,
            "determinant": det if self.rows == self.cols else None
        }

    #Ma trận nghịch đảo (chỉ áp dụng cho ma trận vuông)
    def inverse(self) -> 'Matrix':
        if self.rows != self.cols:
            raise ValueError("Chỉ ma trận vuông mới có thể tính nghịch đảo.")

        n = self.rows
        #Tạo ma trận mở rộng [A | I]
        augmented = [self.data[i] + [Fraction(int(i == j)) for j in range(n)] for i in range(n)]

        #Thực hiện khử Gauss-Jordan
        for col in range(n):
            #Tìm phần tử trụ
            max_row = max(range(col, n), key=lambda r: abs(augmented[r][col]))
            if abs(augmented[max_row][col]) == Fraction(0):
                raise ValueError("Ma trận không khả nghịch (det=0).")

            #Hoán đổi hàng nếu cần
            if max_row != col:
                augmented[col], augmented[max_row] = augmented[max_row], augmented[col]

            #Chuẩn hóa hàng trụ
            pivot_val = augmented[col][col]
            augmented[col] = [val / pivot_val for val in augmented[col]]

            #Khử các phần tử khác trong cột
            for r in range(n):
                if r != col:
                    factor = augmented[r][col]
                    augmented[r] = [augmented[r][j] - factor * augmented[col][j] for j in range(2 * n)]

        #Tách phần nghịch đảo từ ma trận mở rộng
        inverse_data = [row[n:] for row in augmented]
        return Matrix(inverse_data)

    #Giải Ax = b bằng phương pháp Gauss
    def solve_system(self, b: 'Matrix') -> dict:
        """Giải hệ phương trình tuyến tính Ax = b bằng khử Gauss-Jordan."""
        if b.cols != 1 or b.rows != self.rows:
            raise ValueError(f"Vector b phải có kích thước ({self.rows}x1).")

        m, n = self.rows, self.cols
        # 1. Tạo ma trận mở rộng [A | b] và đưa về dạng RREF
        aug_data = [self.data[i] + [b.data[i][0]] for i in range(m)]
        rref = Matrix(aug_data).gauss_analysis()["rref"]

        # 2. Kiểm tra điều kiện vô nghiệm: hàng [0, 0, ..., 0 | c] với c != 0
        for row in rref:
            if all(row[j] == Fraction(0) for j in range(n)) and row[n] != Fraction(0):
                return {
                    "status": "inconsistent",
                    "message": "Hệ phương trình vô nghiệm."
                }

        # 3. Xác định cột trụ (ẩn cơ sở) và cột tự do (ẩn tự do)
        pivot_col_to_row = {}
        for r in range(m):
            for c in range(n):
                if rref[r][c] == Fraction(1):
                    pivot_col_to_row[c] = r
                    break

        free_cols = [c for c in range(n) if c not in pivot_col_to_row]

        # 4. Trường hợp nghiệm duy nhất (không có ẩn tự do)
        if not free_cols:
            solution = [rref[pivot_col_to_row[c]][n] for c in range(n)]
            return {
                "status": "unique",
                "message": "Hệ có nghiệm duy nhất.",
                "solution": solution
            }

        # 5. Trường hợp vô số nghiệm: biểu diễn nghiệm tổng quát theo tham số tự do
        particular = [Fraction(0)] * n
        for c, r in pivot_col_to_row.items():
            particular[c] = rref[r][n]

        # Vector cơ sở cho từng ẩn tự do (tương tự tìm cơ sở không gian nghiệm)
        free_vectors = {}
        parametric_exprs = {}

        for c in range(n):
            if c in free_cols:
                parametric_exprs[f"x{c+1}"] = f"x{c+1} (tự do)"
            else:
                r = pivot_col_to_row[c]
                const_term = rref[r][n]
                terms = []
                if const_term != Fraction(0):
                    terms.append(str(const_term))

                for fc in free_cols:
                    coeff = -rref[r][fc]
                    if coeff != Fraction(0):
                        sign = "+" if coeff > 0 and terms else ("-" if coeff < 0 else "")
                        abs_c = abs(coeff)
                        coeff_str = "" if abs_c == Fraction(1) else f"{abs_c}*"
                        terms.append(f"{sign} {coeff_str}x{fc+1}".strip())

                parametric_exprs[f"x{c+1}"] = " ".join(terms) if terms else "0"

        for fc in free_cols:
            vec = [Fraction(0)] * n
            vec[fc] = Fraction(1)
            for c, r in pivot_col_to_row.items():
                vec[c] = -rref[r][fc]
            free_vectors[f"x{fc+1}"] = vec

        return {
            "status": "infinite",
            "message": f"Hệ có vô số nghiệm phụ thuộc {len(free_cols)} tham số tự do.",
            "particular_solution": particular,
            "free_vectors": free_vectors,
            "expressions": parametric_exprs
        }


    def lu_decomposition(self) -> dict:
        """Phân tích ma trận vuông A = L * U (không hoán vị hàng)."""
        if self.rows != self.cols:
            raise ValueError("Chỉ ma trận vuông mới có phân tích A = LU.")

        n = self.rows
        # Khởi tạo L là ma trận đơn vị, U là bản sao của A
        L = [[Fraction(int(i == j)) for j in range(n)] for i in range(n)]
        U = [[self.data[i][j] for j in range(n)] for i in range(n)]

        for col in range(n):
            pivot = U[col][col]
            if pivot == Fraction(0):
                raise ValueError(
                    f"Phần tử trụ tại ({col+1}, {col+1}) bằng 0 — ma trận này cần hoán vị hàng (PA = LU), không có dạng A = LU thuần túy."
                )

            # Khử thuận các hàng bên dưới đường chéo chính
            for r in range(col + 1, n):
                factor = U[r][col] / pivot
                L[r][col] = factor  # Hệ số khử chính là phần tử của L
                for j in range(col, n):
                    U[r][j] -= factor * U[col][j]

        return {"L": L, "U": U}

    def subspaces(self) -> dict:
        """Tìm cơ sở và số chiều của ker(A), Im(A) = Col(A), và Row(A)."""
        m, n = self.rows, self.cols
        rref = self.gauss_analysis()["rref"]

        # 1. Xác định các cột trụ (pivot columns)
        pivot_col_to_row = {}
        for r in range(m):
            for c in range(n):
                if rref[r][c] == Fraction(1):
                    pivot_col_to_row[c] = r
                    break

        pivot_cols = sorted(pivot_col_to_row.keys())
        free_cols = [c for c in range(n) if c not in pivot_col_to_row]

        # 2. Cơ sở Im(A) = Col(A): Lấy các cột trụ từ MA TRẬN GỐC self.data
        col_space = [
            [self.data[r][c] for r in range(m)]
            for c in pivot_cols
        ]

        # 3. Cơ sở Row(A): Lấy các hàng khác 0 từ MA TRẬN RREF
        row_space = [
            row[:] for row in rref
            if any(val != Fraction(0) for val in row)
        ]

        # 4. Cơ sở ker(A) (Null Space): Nghiệm cơ bản của hệ thuần nhất Ax = 0
        null_space = []
        for fc in free_cols:
            vec = [Fraction(0)] * n
            vec[fc] = Fraction(1)
            for c, r in pivot_col_to_row.items():
                vec[c] = -rref[r][fc]
            null_space.append(vec)

        return {
            "rank": len(pivot_cols),         # dim(Im(A)) = dim(Col(A)) = dim(Row(A))
            "nullity": len(free_cols),       # dim(ker(A))
            "col_space": col_space,          # Cơ sở của Im(A) và Col(A)
            "row_space": row_space,          # Cơ sở của Row(A)
            "null_space": null_space         # Cơ sở của ker(A)
        }