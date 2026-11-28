/* Thuốc Nhà — frontend logic. Mọi kết quả render từ meta do backend trả — không hardcode. */
"use strict";

// ---------- API layer ----------
async function apiStatus() {
  const r = await fetch("/api/status", { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

async function apiCheck(text) {
  let resp;
  try {
    resp = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(180000),
    });
  } catch (e) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      throw { friendly: "Hết thời gian chờ — hệ thống xử lý quá lâu. Vui lòng thử lại." };
    }
    throw { friendly: "Không kết nối được máy chủ. Kiểm tra server web có đang chạy không (python run.py web)." };
  }
  let data = null;
  try { data = await resp.json(); } catch (_) { /* malformed */ }
  if (!resp.ok) {
    const msg = data && data.message ? data.message : "Lỗi máy chủ (HTTP " + resp.status + ").";
    if (data && data.error === "model_not_connected") {
      throw { friendly: "Chưa nối model AI: " + msg, kind: "model" };
    }
    throw { friendly: msg };
  }
  if (!data || typeof data.output !== "string") {
    throw { friendly: "Kết quả trả về không đúng định dạng. Vui lòng thử lại." };
  }
  return data;
}

// ---------- Presets (chỉ điền input — kết quả vẫn do backend thật chạy) ----------
const PRESETS = {
  safe:   "Mẹ uống Glucophage, Amlodipine, Lipitor và Canxi D3 hằng ngày",
  yellow: "Mẹ uống Levothyrox buổi sáng với viên Canxi D3, thêm Glucophage. Xếp lịch giúp tôi sao cho đúng giờ.",
  red:    "Mẹ uống Coumadin với Aspirin pH8, hôm nay bác sĩ ngoài cho thêm Allopurinol. Kiểm giúp rồi xếp lịch cho mẹ.",
  hard:   "Mẹ tôi 72 tuổi, đang uống thuốc huyết áp với thuốc tiểu đường, gần đây hay đau bụng trên. Xếp lịch giùm.",
};

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const el = {
  form: $("#drug-form"), input: $("#drug-input"), checkBtn: $("#check-btn"),
  clearBtn: $("#clear-btn"), inputError: $("#drug-input-error"),
  result: $("#result-section"), state: $("#state-section"),
  riskSummary: $("#risk-summary"), interactionsPanel: $("#interactions-panel"),
  interactionList: $("#interaction-list"), schedulePanel: $("#schedule-panel"),
  scheduleSub: $("#schedule-sub"), scheduleContent: $("#schedule-content"),
  nextPanel: $("#next-step-panel"), nextContent: $("#next-step-content"),
  detailPanel: $("#detail-panel"), aiOutput: $("#ai-output"),
  dialog: $("#pharmacist-dialog"), note: $("#pharmacist-note"),
  badge: $("#model-badge"),
};

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------- Render helpers ----------
const SEV_LABEL = { nang: "NẶNG", trung_binh: "TRUNG BÌNH", nhe: "NHẸ" };
const SEV_ICON = { nang: "🚨", trung_binh: "⚠️", nhe: "ℹ️" };

function renderStatus() {
  apiStatus().then((s) => {
    if (s.demo_mode) {
      el.badge.textContent = "Chế độ demo — AI giả (CP2)";
      el.badge.className = "badge badge-mock";
      el.badge.hidden = false;
    } else {
      el.badge.textContent = "Model: " + (s.model_name || s.model);
      el.badge.className = "badge badge-neutral";
      el.badge.hidden = false;
    }
  }).catch(() => { /* server offline — không chặn UI */ });
}

function showState(html, cls) {
  el.result.hidden = true;
  el.state.hidden = false;
  el.state.innerHTML = '<div class="state-box ' + (cls || "") + '">' + html + "</div>";
}
function hideState() { el.state.hidden = true; el.state.innerHTML = ""; }
function showEmpty() {
  showState(
    '<div class="icon">💊</div><h3>Chưa có thuốc nào để kiểm tra</h3>' +
    '<p>Nhập tên các thuốc mẹ đang uống ở khung trên, hoặc chọn một ca mẫu để thử nhanh.</p>',
    ""
  );
}

// ---------- Render risk summary ----------
function renderSummary(meta) {
  const cfg = {
    green:   { cls: "risk-green", icon: "✅", title: "Không phát hiện tương tác đáng kể" },
    yellow:  { cls: "risk-yellow", icon: "⚠️", title: "Có tương tác cần lưu ý" },
    red:     { cls: "risk-red", icon: "🚨", title: "Phát hiện tương tác NGHIÊM TRỌNG — cần dược sĩ/bác sĩ" },
    guarded: { cls: "risk-guarded", icon: "🛡️", title: "Yêu cầu ngoài phạm vi hỗ trợ" },
  }[meta.overall] || { cls: "risk-guarded", icon: "❔", title: "Chưa đủ dữ liệu đánh giá" };

  const nFound = meta.drugs_found.length, nUnknown = meta.unknown_drugs.length;
  const stats =
    '<div class="risk-stats">' +
      '<div class="risk-stat"><b>' + nFound + "</b> thuốc nhận diện được</div>" +
      (nUnknown ? '<div class="risk-stat"><b>' + nUnknown + "</b> chưa có trong dữ liệu</div>" : "") +
      '<div class="risk-stat"><b>' + meta.interactions.length + "</b> cặp tương tác</div>" +
      '<div class="risk-stat"><b>' + meta.checked_pairs + "</b> cặp đã tra</div>" +
    "</div>";

  let desc = "";
  if (meta.overall === "green") {
    desc = "Không phát hiện tương tác đáng kể trong phạm vi dữ liệu đã kiểm tra (" + meta.checked_pairs + " cặp). Vẫn cần đối chiếu đơn bác sĩ.";
  } else if (meta.overall === "yellow") {
    desc = "Có cặp thuốc cần lưu ý hoặc tách giờ. Xem chi tiết bên dưới và xác nhận với dược sĩ khi cần.";
  } else if (meta.overall === "red") {
    desc = "Có cặp tương tác mức NẶNG. Hệ thống KHÔNG xếp lịch tự động — hãy hỏi bác sĩ/dược sĩ trước khi sắp thuốc.";
  } else if (meta.overall === "guarded") {
    desc = "Yêu cầu trong tin nhắn nằm ngoài phạm vi an toàn của trợ lý (không chẩn đoán, không liều lượng, không thay cảnh báo).";
  }

  const mockTag = meta.mode === "mock"
    ? '<div class="risk-mocktag"><span class="badge badge-mock">Kết quả tổng hợp từ dữ liệu nhóm — AI chưa được nối (CP2 demo)</span></div>'
    : "";
  const chips =
    '<div class="drug-chips">' +
    meta.drugs_found.map((d) =>
      '<span class="drug-chip' + (d.match_type === "fuzzy" ? ' fuzzy" title="Khớp gần đúng — kiểm tra lại tên' : "") +
      '">' + esc(d.generic_name) + (d.match_type === "fuzzy" ? " ?" : "") + "</span>"
    ).join("") +
    meta.unknown_drugs.map((u) => '<span class="drug-chip unknown" title="Chưa có trong dữ liệu">' + esc(u) + " — chưa có trong dữ liệu</span>").join("") +
    "</div>";

  el.riskSummary.innerHTML =
    '<div class="risk-card ' + cfg.cls + '">' +
      '<div class="risk-icon" aria-hidden="true">' + cfg.icon + '</div>' +
      '<div class="risk-body">' +
        '<div class="risk-title">' + esc(cfg.title) + "</div>" +
        '<div class="risk-desc">' + esc(desc) + "</div>" + stats + mockTag + chips +
      "</div></div>";
}

// ---------- Render interactions ----------
function renderInteractions(meta) {
  const list = meta.interactions || [];
  if (!list.length) {
    el.interactionsPanel.hidden = true;
    return;
  }
  el.interactionsPanel.hidden = false;
  el.interactionList.innerHTML = list.map((r) => {
    const sev = r.severity || "";
    const badge = '<span class="int-badge ' + esc(sev) + '">' + (SEV_ICON[sev] || "❔") + " " + (SEV_LABEL[sev] || "Chưa đủ dữ liệu") + "</span>";
    const action = {
      hoi_duoc_si: "Hỏi dược sĩ/bác sĩ trước khi dùng chung",
      tach_gio: "Cần tách giờ uống",
      theo_doi: "Theo dõi thêm khi dùng",
    }[r.action] || "";
    return (
      '<details class="int-card sev-' + esc(sev) + '">' +
        '<summary class="int-head">' +
          '<span class="int-pair">' + esc(r.drug_a) + " + " + esc(r["drug_b"]) + "</span>" +
          badge +
          '<span class="int-arrow" aria-hidden="true">▾</span>' +
        "</summary>" +
        '<div class="int-body">' +
          '<p><span class="label">Mã:</span> ' + esc(r.code) + (action ? " · <span class=\"label\">Xử trí:</span> " + esc(action) : "") + "</p>" +
          '<p><span class="label">Vì sao:</span> ' + esc(r.summary) + "</p>" +
          '<p><span class="label">Khuyến nghị:</span> ' + esc(r.recommendation) + "</p>" +
        "</div></details>"
    );
  }).join("");
}

// ---------- Render schedule ----------
function renderSchedule(meta) {
  const sched = meta.schedule || {};
  const slots = sched.slots || {};
  const hasAny = ["sang", "trua", "toi"].some((k) => (slots[k] || []).length);
  const canPresent = sched.can_present_schedule !== false && hasAny;

  if (!canPresent) {
    // Đỏ: không hiện lịch khuyến nghị — đúng hành vi backend
    el.schedulePanel.hidden = false;
    const pairs = (sched.held_for_pharmacist || [])
      .map((h) => "<li>" + esc(h.pair) + " [" + esc(h.code) + "]</li>").join("");
    el.scheduleContent.innerHTML =
      '<div class="schedule-blocked">' +
        '<div class="title">🚨 Chưa thể đề xuất lịch uống tự động cho danh sách này</div>' +
        '<p>Có cặp tương tác mức NẶNG hoặc thuốc chưa có trong dữ liệu. Hãy xác minh với bác sĩ hoặc dược sĩ trước khi sắp lịch.</p>' +
        (pairs ? "<ul><li>" + pairs + "</li></ul>" : "") +
        "<p>Thông tin đã nhập được giữ ở mục 3 như danh sách tham khảo — không phải lịch được duyệt.</p>" +
      "</div>";
    return;
  }

  el.schedulePanel.hidden = false;
  const slotCfg = [
    ["sang", "🌅 Buổi sáng"], ["trua", "☀️ Buổi trưa"], ["toi", "🌙 Buổi tối"],
  ];
  el.scheduleContent.innerHTML = slotCfg.map(([key, label]) => {
    const items = slots[key] || [];
    return '<div class="slot"><div class="slot-title">' + label + "</div>" +
      (items.length ? items.map((it) =>
        '<div class="slot-item' + (it.status === "cho_duoc_si_xac_nhan" ? " held" : "") + '">' +
          '<span class="name">' + esc(it.generic_name) + '</span><span class="code">[' + esc(it.code) + ']</span>' +
          '<div class="meal">' + esc(it.meal_label) + "</div>" +
          '<div class="note">' + esc(it.timing_note) + "</div>" +
          (it.status === "cho_duoc_si_xac_nhan" ? '<div class="meal" style="color:#b3261e;font-weight:600">Chờ dược sĩ xác nhận</div>' : "") +
        "</div>"
      ).join("") : '<div class="slot-empty">Không có thuốc xếp ở buổi này</div>') +
      "</div>";
  }).join("");

  if (sched.separation_notes && sched.separation_notes.length) {
    el.scheduleContent.innerHTML +=
      '<h3>Đã tự động tách giờ</h3><ul class="separation-list">' +
      sched.separation_notes.map((n) => "<li>" + esc(n) + "</li>").join("") + "</ul>";
  }
}

// ---------- Render next steps + handoff ----------
function renderNextStep(meta) {
  const handoff = meta.handoff;
  el.nextPanel.hidden = false;

  if (handoff) {
    const isRed = meta.overall === "red";
    el.nextContent.innerHTML =
      '<div class="handoff-box' + (isRed ? " red" : "") + '">' +
        '<div class="handoff-title">' + (isRed ? "🚨 " : "📋 ") + "Nên hỏi dược sĩ/bác sĩ" + "</div>" +
        '<div class="handoff-meta">Mã phiếu nháp: <code>' + esc(handoff.draft_id) + "</code> · Trạng thái: <strong>chưa gửi — chờ bạn xác nhận</strong></div>" +
        '<p style="font-size:14px;margin:0 0 12px">' + esc(handoff.reason) + "</p>" +
        '<div class="handoff-actions">' +
          '<button type="button" class="btn btn-primary" id="ask-pharmacist-btn">Hỏi Dược Sĩ Ngay</button>' +
          '<button type="button" class="btn btn-ghost" id="copy-note-btn2">Copy phiếu nháp</button>' +
        "</div>" +
      "</div>";
    $("#ask-pharmacist-btn").addEventListener("click", openPharmacistDialog);
    $("#copy-note-btn2").addEventListener("click", copyPharmacistNote);
  } else {
    el.nextContent.innerHTML =
      '<div class="handoff-ok">' +
        "✅ Danh sách này chưa có lý do bắt buộc phải chuyển dược sĩ. Bạn vẫn có thể hỏi dược sĩ nếu mẹ có bệnh nền, thuốc đông y, hoặc thuốc chức năng khác." +
        ' <button type="button" class="btn btn-ghost" id="copy-note-btn3">Copy danh sách thuốc</button>' +
      "</div>";
    $("#copy-note-btn3").addEventListener("click", copyPharmacistNote);
  }
}

// ---------- Pharmacist note ----------
function buildPharmacistNote(meta, rawText) {
  const L = [];
  L.push("PHIẾU HỎI DƯỢC SĨ (bản nháp — chưa gửi)");
  L.push("Thời điểm tạo: " + new Date().toLocaleString("vi-VN"));
  L.push("");
  L.push("1. Danh sách thuốc đã nhập:");
  if (meta.drugs_found.length) {
    meta.drugs_found.forEach((d) => L.push("   - " + d.generic_name + " [" + d.code + "]" + (d.match_type === "fuzzy" ? " (khớp gần đúng từ '" + d.matched_term + "')" : "")));
  }
  if (meta.unknown_drugs.length) L.push("   - " + meta.unknown_drugs.join(", ") + " (chưa có trong dữ liệu)");
  L.push("");
  L.push("2. Cảnh báo tương tác nhận được:");
  if (meta.interactions.length) {
    meta.interactions.forEach((r) => L.push("   - [" + r.code + "] " + r.drug_a + " + " + r.drug_b + " — mức " + (SEV_LABEL[r.severity] || r.severity)));
    L.push("     " + meta.interactions[0].summary);
  } else {
    L.push("   - Hệ thống chưa ghi nhận cặp tương tác trong phạm vi dữ liệu.");
  }
  L.push("");
  L.push("3. Câu hỏi cần xác minh với dược sĩ:");
  L.push("   - Đơn thuốc gồm các thuốc trên có dùng chung được không?");
  L.push("   - Cần tách giờ uống ra sao cho đúng (thuốc nào trước/sau ăn, cách nhau bao lâu)?");
  L.push("   - Thuốc/chất chưa có trong dữ liệu (" + (meta.unknown_drugs.join(", ") || "không có") + ") có ảnh hưởng gì không?");
  L.push("");
  L.push("4. Lịch nháp đề nghị (nếu có):");
  const slots = (meta.schedule && meta.schedule.slots) || {};
  ["sang", "trua", "toi"].forEach((k) => {
    const items = slots[k] || [];
    if (items.length) {
      L.push("   - " + {sang:"Sáng",trua:"Trưa",toi:"Tối"}[k] + ": " + items.map((i) => i.generic_name).join(", "));
    }
  });
  L.push("");
  L.push("(Trợ lý chỉ hỗ trợ sắp lịch nháp — quyết định điều trị thuộc về bác sĩ/dược sĩ.)");
  return L.join("\n");
}

function openPharmacistDialog() {
  if (!lastMeta) return;
  el.note.textContent = buildPharmacistNote(lastMeta, lastText);
  el.dialog.showModal();
}
function copyPharmacistNote() {
  if (!lastMeta) return;
  const text = buildPharmacistNote(lastMeta, lastText);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => flashCopied());
  } else {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
    flashCopied();
  }
}
function flashCopied() {
  const old = document.activeElement && document.activeElement.textContent;
  const btn = document.getElementById("copy-note-btn") || document.getElementById("copy-note-btn2") || document.getElementById("copy-note-btn3");
  if (btn) {
    const t = btn.textContent;
    btn.textContent = "✓ Đã copy";
    setTimeout(() => { btn.textContent = t; }, 1500);
  }
}

// ---------- Main flow ----------
let lastMeta = null, lastText = "";
const SUBMIT_LABEL = "Kiểm tra tương tác thuốc";

function validate() {
  const v = el.input.value.trim();
  if (!v) {
    el.inputError.hidden = false;
    el.inputError.textContent = "Vui lòng nhập tên thuốc trước khi kiểm tra.";
    el.input.focus();
    return null;
  }
  if (v.length < 3) {
    el.inputError.hidden = false;
    el.inputError.textContent = "Nội dung nhập quá ngắn — hãy ghi tên các thuốc mẹ đang uống.";
    el.input.focus();
    return null;
  }
  el.inputError.hidden = true;
  return v;
}

async function runCheck(text) {
  // Loading
  el.checkBtn.disabled = true;
  el.checkBtn.querySelector(".btn-label").textContent = "Đang kiểm tra…";
  showState(
    '<div class="spinner" role="status" aria-label="Đang xử lý"></div>' +
    "<h3>Đang kiểm tra danh sách thuốc</h3><p>Hệ thống đang tra dữ liệu thuốc, kiểm tra tương tác và soạn lịch nháp.</p><p class=\"muted\">Có thể mất 30–90 giây khi AI đang tổng hợp — đừng tắt trang này.</p>",
    ""
  );
  el.result.hidden = true;

  try {
    const data = await apiCheck(text);
    lastMeta = data.meta || {};
    lastText = text;
    hideState();

    if (!lastMeta || !lastMeta.outcome) {
      // Backend trả output thuần (trường hợp hiếm) — hiển thị dạng chi tiết, không bịa meta
      el.result.hidden = false;
      renderDetailTextOnly(data.output);
      return;
    }
    renderResult(lastMeta, data.output, data.usage);
  } catch (e) {
    hideState();
    showState(
      '<div class="icon">⚠️</div><h3>Không kiểm tra được lần này</h3>' +
      "<p>" + esc(e.friendly || e.message || "Lỗi không rõ nguyên nhân.") + "</p>" +
      '<button type="button" class="btn btn-primary" id="retry-btn">Thử lại</button>',
      "state-error"
    );
    const rb = $("#retry-btn");
    if (rb) rb.addEventListener("click", () => { if (lastText) runCheck(lastText); });
  } finally {
    el.checkBtn.disabled = false;
    el.checkBtn.querySelector(".btn-label").textContent = SUBMIT_LABEL;
    scrollResultIntoView();
  }
}

function renderDetailTextOnly(output) {
  el.detailPanel.hidden = false;
  el.aiOutput.textContent = output;
}

function renderResult(meta, output, usage) {
  el.result.hidden = false;
  if (!meta.outcome || meta.outcome === "need_input") {
    // Backend trả "hỏi lại" hoặc meta tối giản — chỉ hiện chi tiết, không render summary rỗng
    renderSummarySafe(meta);
    el.interactionsPanel.hidden = true;
    el.schedulePanel.hidden = true;
    el.nextPanel.hidden = true;
  } else if (meta.outcome === "out_of_scope") {
    renderSummarySafe(meta);
    el.interactionsPanel.hidden = true;
    el.schedulePanel.hidden = true;
    renderNextStepSafe(meta);
  } else if (meta.outcome === "emergency") {
    renderSummarySafe(meta);
    el.interactionsPanel.hidden = true;
    el.schedulePanel.hidden = true;
    el.nextPanel.hidden = true;
  } else {
    renderSummarySafe(meta);
    renderInteractions(meta);
    renderSchedule(meta);
    renderNextStepSafe(meta);
  }
  renderDetail(output, usage);
}

function renderSummarySafe(meta) {
  try { renderSummary(meta); } catch (e) { el.riskSummary.innerHTML = ""; }
}
function renderNextStepSafe(meta) {
  try { renderNextStep(meta); } catch (e) { el.nextContent.innerHTML = ""; el.nextPanel.hidden = true; }
}

function renderDetail(output, usage) {
  el.detailPanel.hidden = false;
  el.aiOutput.textContent = output;
  const u = usage || {};
  const usageText = "Lượt gọi model: " + (u.model_calls != null ? u.model_calls : "—") +
    " · token vào/ra: " + (u.tokens_in != null ? u.tokens_in : "—") + " / " + (u.tokens_out != null ? u.tokens_out : "—") +
    (u.models && u.models.length ? " · model: " + u.models.join(", ") : "");
  let line = document.getElementById("usage-line");
  if (!line) {
    line = document.createElement("p");
    line.id = "usage-line";
    line.className = "usage-line";
    el.aiOutput.parentElement.appendChild(line);
  }
  line.textContent = usageText;
}

function scrollResultIntoView() {
  const target = !el.result.hidden ? el.result : el.state;
  if (target && target.scrollIntoView) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ---------- Wire events ----------
el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = validate();
  if (v) runCheck(v);
});
el.clearBtn.addEventListener("click", () => {
  el.input.value = "";
  el.inputError.hidden = true;
  hideState();
  el.result.hidden = true;
  showEmpty();
});
document.querySelectorAll(".chip[data-preset]").forEach((c) => {
  c.addEventListener("click", () => {
    const key = c.getAttribute("data-preset");
    el.input.value = PRESETS[key] || "";
    el.inputError.hidden = true;
    el.input.focus();
  });
});
el.dialog.querySelector("#dialog-close").addEventListener("click", () => el.dialog.close());
el.dialog.querySelector("#dialog-close-2").addEventListener("click", () => el.dialog.close());
el.dialog.addEventListener("click", (e) => { if (e.target === el.dialog) el.dialog.close(); });
document.getElementById("copy-note-btn").addEventListener("click", copyPharmacistNote);

// ---------- Init ----------
renderStatus();
showEmpty();
