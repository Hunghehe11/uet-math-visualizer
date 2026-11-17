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

// ==================== 3. GIẢI TÍCH 1 & ĐỒ THỊ TƯƠNG TÁC (ZOOM / PAN) ====================
const canvas = document.getElementById("graph-canvas");
const PAD = 40;

let graphState = {
  points: [],
  gdHistory: [],
  bounds: null,       // { xMin, xMax, yMin, yMax }
  defaultBounds: null,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  dragBounds: null,
};

canvas.style.cursor = "grab";

function computeInitialBounds(points, gdHistory) {
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
  return {
    xMin,
    xMax,
    yMin: yMin - yMargin,
    yMax: yMax + yMargin,
  };
}

function renderCanvas() {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const plotW = W - 2 * PAD;
  const plotH = H - 2 * PAD;

  ctx.clearRect(0, 0, W, H);

  if (!graphState.points || graphState.points.length === 0 || !graphState.bounds) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px system-ui";
    ctx.fillText("Không có điểm hợp lệ trong miền xác định để vẽ đồ thị.", W / 2 - 180, H / 2);
    return;
  }

  const { xMin, xMax, yMin, yMax } = graphState.bounds;
  const toPxX = (x) => ((x - xMin) / (xMax - xMin)) * plotW + PAD;
  const toPxY = (y) => H - (((y - yMin) / (yMax - yMin)) * plotH + PAD);

  // 1. Vẽ lưới mờ & khung vùng vẽ
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const gx = PAD + (i * plotW) / 8;
    const gy = PAD + (i * plotH) / 8;
    ctx.beginPath(); ctx.moveTo(gx, PAD); ctx.lineTo(gx, H - PAD); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD, gy); ctx.lineTo(W - PAD, gy); ctx.stroke();
  }

  // Cắt (clip) vùng vẽ bên trong khung lưới để đường cong không tràn ra lề khi zoom
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD, PAD, plotW, plotH);
  ctx.clip();

  // 2. Trục tọa độ Ox, Oy
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.5;
  if (xMin <= 0 && xMax >= 0) {
    const ox = toPxX(0);
    ctx.beginPath(); ctx.moveTo(ox, PAD); ctx.lineTo(ox, H - PAD); ctx.stroke();
  }
  if (yMin <= 0 && yMax >= 0) {
    const oy = toPxY(0);
    ctx.beginPath(); ctx.moveTo(PAD, oy); ctx.lineTo(W - PAD, oy); ctx.stroke();
  }

  // 3. Đường đạo hàm f'(x)
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  graphState.points.forEach((p, idx) => {
    const px = toPxX(p.x);
    const py = toPxY(p.dy);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. Đường cong gốc f(x)
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  graphState.points.forEach((p, idx) => {
    const px = toPxX(p.x);
    const py = toPxY(p.y);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // 5. Quỹ đạo Gradient Descent
  const gdHistory = graphState.gdHistory;
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

  ctx.restore();

  // 6. Nhãn tọa độ hiện tại và gợi ý thao tác
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px monospace";
  ctx.fillText(`x: [${xMin.toFixed(2)}, ${xMax.toFixed(2)}]`, PAD, H - 12);
  ctx.fillText(`y: [${yMin.toFixed(2)}, ${yMax.toFixed(2)}]`, W - 165, H - 12);
  ctx.fillText("Lăn chuột: Zoom | Kéo thả: Di chuyển | Nháy đúp: Đặt lại", PAD, 22);
}

function drawGraph(points, gdHistory = []) {
  graphState.points = points || [];
  graphState.gdHistory = gdHistory || [];
  if (graphState.points.length > 0) {
    const init = computeInitialBounds(graphState.points, graphState.gdHistory);
    graphState.bounds = { ...init };
    graphState.defaultBounds = { ...init };
  } else {
    graphState.bounds = null;
    graphState.defaultBounds = null;
  }
  renderCanvas();
}

// Sự kiện lăn chuột để phóng to / thu nhỏ quanh vị trí trỏ chuột
canvas.addEventListener("wheel", (e) => {
  if (!graphState.bounds) return;
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  const plotW = canvas.width - 2 * PAD;
  const plotH = canvas.height - 2 * PAD;

  // Tỷ lệ vị trí con trỏ trong vùng vẽ [0..1]
  const rx = Math.min(1, Math.max(0, (mouseX - PAD) / plotW));
  const ry = Math.min(1, Math.max(0, (canvas.height - PAD - mouseY) / plotH));

  const { xMin, xMax, yMin, yMax } = graphState.bounds;
  const mathX = xMin + rx * (xMax - xMin);
  const mathY = yMin + ry * (yMax - yMin);

  const zoomFactor = e.deltaY < 0 ? 0.85 : 1.18;
  const newSpanX = (xMax - xMin) * zoomFactor;
  const newSpanY = (yMax - yMin) * zoomFactor;

  graphState.bounds = {
    xMin: mathX - rx * newSpanX,
    xMax: mathX + (1 - rx) * newSpanX,
    yMin: mathY - ry * newSpanY,
    yMax: mathY + (1 - ry) * newSpanY,
  };

  renderCanvas();
}, { passive: false });

// Sự kiện nhấn và kéo chuột để di chuyển (Pan)
canvas.addEventListener("mousedown", (e) => {
  if (!graphState.bounds) return;
  graphState.isDragging = true;
  graphState.dragStart = { x: e.clientX, y: e.clientY };
  graphState.dragBounds = { ...graphState.bounds };
  canvas.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
  if (!graphState.isDragging || !graphState.dragBounds) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const dxPx = (e.clientX - graphState.dragStart.x) * scaleX;
  const dyPx = (e.clientY - graphState.dragStart.y) * scaleY;

  const plotW = canvas.width - 2 * PAD;
  const plotH = canvas.height - 2 * PAD;

  const { xMin, xMax, yMin, yMax } = graphState.dragBounds;
  const dxMath = (dxPx / plotW) * (xMax - xMin);
  const dyMath = (dyPx / plotH) * (yMax - yMin);

  graphState.bounds = {
    xMin: xMin - dxMath,
    xMax: xMax - dxMath,
    yMin: yMin + dyMath,
    yMax: yMax + dyMath,
  };

  renderCanvas();
});

window.addEventListener("mouseup", () => {
  if (graphState.isDragging) {
    graphState.isDragging = false;
    canvas.style.cursor = "grab";
  }
});

// Nháy đúp chuột để đưa khung hình về mặc định
canvas.addEventListener("dblclick", () => {
  if (!graphState.defaultBounds) return;
  graphState.bounds = { ...graphState.defaultBounds };
  renderCanvas();
});

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

    let limitText = "Không tồn tại";
    if (json.limit) {
      if (json.limit.exists) limitText = `${json.limit.value}`;
      else if (json.limit.value) limitText = `${json.limit.value}`;
      else if (json.limit.left !== undefined) {
        limitText = `L: ${json.limit.left ?? "?"} | R: ${json.limit.right ?? "?"}`;
      }
    }

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

document.querySelector('[data-tab="calculus"]').addEventListener("click", () => {
  const metricsBox = document.getElementById("calc-metrics");
  if (metricsBox.classList.contains("hidden")) {
    document.getElementById("btn-calc").click();
  }
});