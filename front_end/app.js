const API_BASE = "";

// ==================== 1. CHUYỂN TAB ====================
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ==================== 2. ĐẠI SỐ TUYẾN TÍNH ====================
function renderGrid(containerId, rows, cols, defaultVal = "0", isIdentity = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  container.style.gridTemplateColumns = `repeat(${cols}, minmax(56px, 1fr))`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.value = isIdentity ? (r === c ? "1" : "0") : defaultVal;
      inp.dataset.r = r;
      inp.dataset.c = c;
      container.appendChild(inp);
    }
  }
}

function readGrid(containerId, rows, cols) {
  const inputs = document.querySelectorAll(`#${containerId} input`);
  const matrix = Array.from({ length: rows }, () => Array(cols).fill("0"));
  inputs.forEach((inp) => {
    const r = Number(inp.dataset.r);
    const c = Number(inp.dataset.c);
    const val = inp.value.trim();
    matrix[r][c] = val === "" ? "0" : val;
  });
  return matrix;
}

function createMatrixTableHTML(matrix, title = "") {
  if (!matrix || matrix.length === 0) {
    return `${title ? `<h4>${title}</h4>` : ""}<p class="hint">Tập rỗng {0}</p>`;
  }
  let html = title ? `<h4 style="margin: 0.75rem 0 0.35rem;">${title}</h4>` : "";
  html += `<table class="result-table"><tbody>`;
  for (const row of matrix) {
    html += `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

// Khởi tạo lưới mặc định 3x3
renderGrid("grid-a", 3, 3, "0", true);
renderGrid("grid-b", 3, 3, "1", false);

document.getElementById("btn-gen-grid").addEventListener("click", () => {
  const rA = Number(document.getElementById("rows-a").value);
  const cA = Number(document.getElementById("cols-a").value);
  renderGrid("grid-a", rA, cA, "0", rA === cA);
});

document.getElementById("btn-gen-b").addEventListener("click", () => {
  const rB = Number(document.getElementById("rows-b").value);
  const cB = Number(document.getElementById("cols-b").value);
  renderGrid("grid-b", rB, cB, "0", false);
});

// Xử lý bấm các nút phép toán Ma trận
document.querySelectorAll(".op-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const op = btn.dataset.op;
    const errBox = document.getElementById("matrix-error");
    const resBox = document.getElementById("matrix-result");
    errBox.classList.add("hidden");
    resBox.classList.add("hidden");

    const rA = Number(document.getElementById("rows-a").value);
    const cA = Number(document.getElementById("cols-a").value);
    const rB = Number(document.getElementById("rows-b").value);
    const cB = Number(document.getElementById("cols-b").value);
    const asFraction = document.getElementById("as-fraction").checked;

    const needsB = ["add", "multiply", "solve"].includes(op);
    const payload = {
      matrix_a: readGrid("grid-a", rA, cA),
      matrix_b: needsB ? readGrid("grid-b", rB, cB) : null,
      operation: op,
      as_fraction: asFraction,
    };

    try {
      const res = await fetch(`${API_BASE}/api/matrix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.detail || "Lỗi xử lý ma trận.");
      }

      let html = "";
      if (op === "analyze") {
        const { rref, rank, determinant } = json.data;
        html += `<div style="margin-bottom: 0.75rem;">
          <span class="badge">Hạng (Rank): ${rank}</span>
          <span class="badge">Định thức (Det): ${determinant === null ? "Không xác định (không vuông)" : determinant}</span>
        </div>`;
        html += createMatrixTableHTML(rref, "Dạng bậc thang rút gọn (RREF):");
      } else if (op === "lu") {
        html += `<div style="display: flex; flex-wrap: wrap; gap: 2rem;">
          <div>${createMatrixTableHTML(json.data.L, "Ma trận tam giác dưới (L):")}</div>
          <div>${createMatrixTableHTML(json.data.U, "Ma trận tam giác trên (U):")}</div>
        </div>`;
      } else if (op === "subspaces") {
        const { rank, nullity, im_col_basis, row_basis, ker_basis } = json.data;
        html += `<div style="margin-bottom: 0.75rem;">
          <span class="badge">dim Im(A) = dim Col(A) = dim Row(A) = ${rank}</span>
          <span class="badge">dim ker(A) = ${nullity}</span>
        </div>`;
        html += createMatrixTableHTML(im_col_basis, "Cơ sở Im(A) / Col(A) (các vector hàng là cơ sở):");
        html += createMatrixTableHTML(row_basis, "Cơ sở Row(A):");
        html += createMatrixTableHTML(ker_basis, "Cơ sở ker(A) (Không gian nghiệm Ax = 0):");
      } else if (op === "solve") {
        const sys = json.data;
        html += `<p style="font-weight: 700; margin-bottom: 0.5rem;">${sys.message}</p>`;
        if (sys.status === "unique") {
          html += createMatrixTableHTML([sys.solution], "Nghiệm duy nhất (x₁, x₂, ...):");
        } else if (sys.status === "infinite") {
          html += `<ul style="margin: 0.5rem 0 0.75rem 1.25rem; font-family: monospace;">`;
          for (const [varName, expr] of Object.entries(sys.expressions)) {
            html += `<li>${varName} = ${expr}</li>`;
          }
          html += `</ul>`;
          html += createMatrixTableHTML([sys.particular_solution], "Nghiệm riêng:");
          for (const [freeVar, vec] of Object.entries(sys.free_vectors)) {
            html += createMatrixTableHTML([vec], `Vector cơ sở theo tham số ${freeVar}:`);
          }
        }
      } else {
        html += createMatrixTableHTML(json.result_matrix, "Ma trận kết quả:");
      }

      resBox.innerHTML = html;
      resBox.classList.remove("hidden");
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove("hidden");
    }
  });
});

// ==================== 3. GIẢI TÍCH 1 & VẼ ĐỒ THỊ CANVAS ====================
function drawGraph(points, gdHistory = []) {
  const canvas = document.getElementById("graph-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const pad = 40;

  ctx.clearRect(0, 0, W, H);

  if (!points || points.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px system-ui";
    ctx.fillText("Không có điểm hợp lệ trong miền xác định để vẽ đồ thị.", W / 2 - 180, H / 2);
    return;
  }

  // Tìm biên tọa độ (x, y) từ f(x), f'(x) và đường đi Gradient Descent
  const xs = points.map((p) => p.x);
  const ys = [];
  points.forEach((p) => {
    ys.push(p.y);
    if (Math.abs(p.dy) < 50) ys.push(p.dy);
  });
  gdHistory.forEach((pt) => {
    xs.push(pt.x);
    ys.push(pt.y);
  });

  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);

  if (xMax === xMin) { xMin -= 1; xMax += 1; }
  if (yMax === yMin) { yMin -= 1; yMax += 1; }

  const yMargin = (yMax - yMin) * 0.1;
  yMin -= yMargin;
  yMax += yMargin;

  const toPxX = (x) => ((x - xMin) / (xMax - xMin)) * (W - 2 * pad) + pad;
  const toPxY = (y) => H - (((y - yMin) / (yMax - yMin)) * (H - 2 * pad) + pad);

  // 1. Vẽ lưới mờ & Trục tọa độ Ox, Oy
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const gx = pad + (i * (W - 2 * pad)) / 8;
    const gy = pad + (i * (H - 2 * pad)) / 8;
    ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, H - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke();
  }

  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.5;
  if (xMin <= 0 && xMax >= 0) {
    const ox = toPxX(0);
    ctx.beginPath(); ctx.moveTo(ox, pad); ctx.lineTo(ox, H - pad); ctx.stroke();
  }
  if (yMin <= 0 && yMax >= 0) {
    const oy = toPxY(0);
    ctx.beginPath(); ctx.moveTo(pad, oy); ctx.lineTo(W - pad, oy); ctx.stroke();
  }

  // Nhãn giá trị biên trên trục
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px monospace";
  ctx.fillText(`x: [${xMin.toFixed(2)}, ${xMax.toFixed(2)}]`, pad, H - 12);
  ctx.fillText(`y: [${yMin.toFixed(2)}, ${yMax.toFixed(2)}]`, W - 150, H - 12);

  // 2. Vẽ đường đạo hàm f'(x) (xanh lá đứt nét)
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  points.forEach((p, idx) => {
    const px = toPxX(p.x);
    const py = toPxY(p.dy);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Vẽ đường cong gốc f(x) (xanh dương liền nét)
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((p, idx) => {
    const px = toPxX(p.x);
    const py = toPxY(p.y);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // 4. Vẽ quỹ đạo các bước nhảy Gradient Descent (chấm đỏ)
  if (gdHistory && gdHistory.length > 0) {
    ctx.strokeStyle = "rgba(248, 113, 113, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    gdHistory.forEach((pt, idx) => {
      const px = toPxX(pt.x);
      const py = toPxY(pt.y);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    gdHistory.forEach((pt, idx) => {
      const px = toPxX(pt.x);
      const py = toPxY(pt.y);
      ctx.beginPath();
      ctx.arc(px, py, idx === gdHistory.length - 1 ? 5.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = idx === gdHistory.length - 1 ? "#ef4444" : "#fca5a5";
      ctx.fill();
    });
  }
}

document.getElementById("btn-calc").addEventListener("click", async () => {
  const errBox = document.getElementById("calc-error");
  const metricsBox = document.getElementById("calc-metrics");
  errBox.classList.add("hidden");
  metricsBox.classList.add("hidden");

  const payload = {
    expr: document.getElementById("calc-expr").value.trim(),
    x0: document.getElementById("calc-x0").value.trim(),
    a: document.getElementById("calc-a").value.trim(),
    b: document.getElementById("calc-b").value.trim(),
    lr: Number(document.getElementById("calc-lr").value) || 0.05,
  };

  try {
    const res = await fetch(`${API_BASE}/api/calculus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.detail || "Lỗi tính toán giải tích.");
    }

    // Xử lý hiển thị giới hạn
    let limitText = "Không tồn tại";
    if (json.limit) {
      if (json.limit.exists) limitText = `${json.limit.value}`;
      else if (json.limit.value) limitText = `${json.limit.value}`;
      else if (json.limit.left !== undefined) {
        limitText = `L: ${json.limit.left ?? "?"} | R: ${json.limit.right ?? "?"}`;
      }
    }

    // Xử lý hiển thị điểm hội tụ Gradient Descent
    let gdText = "Không khả dụng";
    let gdHistory = [];
    if (json.gd) {
      gdHistory = json.gd.history || [];
      if (json.gd.status === "converged" || json.gd.status === "max_iter") {
        const last = gdHistory[gdHistory.length - 1];
        gdText = last ? `x ≈ ${last.x} (y ≈ ${last.y})` : json.gd.status;
      } else {
        gdText = `Phân kỳ (${json.gd.status})`;
      }
    }

    metricsBox.innerHTML = `
      <div class="metric-card">
        <div class="label">Giá trị f(x₀)</div>
        <div class="val">${json.f_x0 !== null ? json.f_x0 : "Không xác định"}</div>
      </div>
      <div class="metric-card">
        <div class="label">Đạo hàm f'(x₀)</div>
        <div class="val">${json.df_x0 !== null ? json.df_x0 : "Không xác định"}</div>
      </div>
      <div class="metric-card">
        <div class="label">Giới hạn lim (x → x₀)</div>
        <div class="val">${limitText}</div>
      </div>
      <div class="metric-card">
        <div class="label">Tích phân ∫[${json.parsed_inputs.a}, ${json.parsed_inputs.b}]</div>
        <div class="val">${json.integral}</div>
      </div>
      <div class="metric-card">
        <div class="label">Cực tiểu Gradient Descent</div>
        <div class="val" style="font-size: 1rem;">${gdText}</div>
      </div>
    `;
    metricsBox.classList.remove("hidden");

    drawGraph(json.points, gdHistory);
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove("hidden");
  }
});

// Tự động chạy tính toán & vẽ đồ thị mẫu ngay khi mở tab Giải tích lần đầu
document.querySelector('[data-tab="calculus"]').addEventListener("click", () => {
  const metricsBox = document.getElementById("calc-metrics");
  if (metricsBox.classList.contains("hidden")) {
    document.getElementById("btn-calc").click();
  }
});