"""backend_agent.py — Phần 2 của Backend (theo tài liệu phân công 3 phần).

Suy luận, xếp lịch 4 khung giờ & Guardrail cho tầng API:
    analyze_medications(medications, notes) → dict đúng JSON Contract (mục 3 tài liệu phân công)

Nguyên tắc (khớp spec.md §4/§7):
    - Mọi kết quả ĐỌC từ data qua backend_tools (không để AI bịa tương tác / kê thêm thuốc).
    - Guardrail cứng (code, không phụ thuộc AI):
        * Tương tác mức ĐỎ (nang)      → schedule_locked = true, escalate_to_pharmacist = true
        * Thuốc không nhận diện được    → escalate_to_pharmacist = true, không xếp lịch cho thuốc lạ
        * Yêu cầu kê đơn / dấu hiệu cấp cứu (notes) → từ chối + escalate
    - AI (call_model) chỉ viết lời văn tóm tắt; khung fallback sang text dựng sẵn khi:
      .env chưa có MODEL_PROVIDER (chế độ mock CP2), model lỗi, hoặc hết giờ — API không chết.
    - Suy luận xếp lịch (4 khung giờ + lý do tách giờ) làm bằng CODE từ recommended_slots
      trong data — AI không xếp giờ.

Không tác động ra ngoài: handoff chỉ là tóm tắt văn bản cho người dùng copy.
"""
import os
import re
import sys

_CODEBASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "codebase")
if _CODEBASE not in sys.path:
    sys.path.insert(0, _CODEBASE)

import backend_tools  # noqa: E402
from ai import call_model  # noqa: E402
from tracing import begin as _trace_begin, end as _trace_end, note  # noqa: E402

# Khung giờ 4-slot của Frontend (khác 3 slot trong data) — map từ recommended_slots
SLOT_MAP = {
    "sang": "morning",
    "trua": "noon",
    "toi": "evening",
}
BEDTIME_HINTS = ("ngu", "dem", "trc khi ngu", "before bed", "bedtime")

SYSTEM_PROMPT = """Bạn là trợ lý hỗ trợ người con sắp thuốc cho cha mẹ cao tuổi (Track B2 — kiểm tra tương tác thuốc & lịch uống).
BẮT BUỘC:
1. Chỉ dựa trên kết quả công cụ được cấp trong ngữ cảnh. Không bịa cặp tương tác, không thêm thuốc mới, không đổi mức độ cảnh báo.
2. risk_summary viết 1–2 câu, nói rõ cặp thuốc và nguy cơ nếu có.
3. Nếu được đánh dấu là ca mức ĐỎ: nhấn mạnh không tự ý dùng chung và cần bác sĩ/dược sĩ.
4. Nếu có thuốc chưa có trong dữ liệu: ghi rõ "chưa có trong dữ liệu", không suy ra công dụng hay tương tác của nó.
5. Không chẩn đoán bệnh, không tư vấn liều, không khuyên tự ý ngừng/thay thuốc kê đơn.
6. Văn phong: tiếng Việt, ngắn gọn, thân thiện với người con chưa học y."""

_DURATION_WARN = "Đây là lịch NHÁP hỗ trợ sắp thuốc — người con cần đối chiếu đơn bác sĩ và xác nhận trước khi cho người nhà dùng."


# ---------------------------------------------------------------------------
# Xếp lịch 4 khung giờ — bằng CODE từ kết quả chuẩn hóa + tách giờ từ tương tác
# ---------------------------------------------------------------------------
def _build_schedule_v2(norm_result, inter_result):
    """Xây schedule {morning, noon, evening, bedtime} từ backend_tools kết quả.

    - Thuốc unknown KHÔNG được xếp lịch (C2).
    - Cặp tách giờ (action=tach_gio trong data): đẩy một bên sang khung khác + note lý do.
    - Cặp mức ĐỎ: schedule_locked = true — vẫn soạn lịch "không dùng chung" để UI khoá.
    """
    slots = {"morning": [], "noon": [], "evening": [], "bedtime": []}
    schedule_locked = False
    separation_notes = []
    sep_applied = {}  # drug_code -> note lý do bị đổi khung

    hard_pairs = []
    for p in inter_result.get("pairs_input", []):
        if p["severity"] == "nang":
            hard_pairs.append(p)

    # Tách giờ cứng theo cặp đã biết trong data (INT-09/INT-10 Levothyroxine)
    for p in inter_result.get("pairs_input", []):
        if p.get("action") == "tach_gio" or "tach gio" in _vi_norm(p.get("recommendation", "")):
            a, b = p["pair_ingredients"]
            # Levothyroxine sáng sớm — chất kia đẩy sang trưa/tối
            for ing_a, ing_b in ((a, b), (b, a)):
                if _vi_norm(ing_a).startswith("levothyrox"):
                    sep_applied[_drug_code_of(norm_result, ing_b)] = (
                        "Tách với %s ít nhất 4 giờ (nguồn: %s [%s])"
                        % (ing_a, p.get("source", "data/interactions.json"), p["code"])
                    )
                    separation_notes.append(
                        "%s + %s: xếp lệch khung giờ (tối thiểu 4 giờ) [%s]"
                        % (p["pair_inputs"][0], p["pair_inputs"][1], p["code"])
                    )

    for entry in norm_result.get("normalized", []):
        if not entry.get("matched"):
            continue  # thuốc lạ không được xếp lịch (C2)
        code = entry["drug_code"]
        base_slots = entry.get("slots") or ["morning"]
        meal_label = entry.get("meal_label") or "Trước hoặc sau ăn"
        timing = meal_label
        note_text = entry.get("timing_note") or ""

        # Quy tắc đặc biệt: statin uống tối (data đã ghi slots=['toi']); warfarin → bedtime-friendly
        if code in sep_applied:
            # đẩy sang khung khác buổi sáng (ưu tiên trưa, nếu thuốc gốc là trưa thì tối)
            alt = "evening" if "trua" in base_slots else "noon"
            target = SLOT_MAP.get(alt, alt)
            note_text = (note_text + " | " if note_text else "") + sep_applied[code]
        else:
            target = SLOT_MAP.get(base_slots[0], base_slots[0])

        # bedtime: chỉ khi timing_note nhắc uống đêm / trước khi ngủ, hoặc warfarin (uống tối cố định)
        if "bedtime" not in slots and _vi_norm(note_text).find("ngu") >= 0:
            target = "bedtime"
        if _vi_norm(entry.get("ingredient", "")) == "warfarin":
            target = "bedtime"

        # trạng thái khoá nếu thuốc dính cặp ĐỎ
        in_hard = any(
            _vi_norm(entry["ingredient"]) in [_vi_norm(x) for x in p["pair_ingredients"]]
            for p in hard_pairs
        )
        if in_hard:
            schedule_locked = True
            note_text = (note_text + " | " if note_text else "") + (
                "THUỐC DÍNH CẶP TƯƠNG TÁC MỨC ĐỎ — KHÔNG tự ý dùng chung, chờ bác sĩ/dược sĩ xác nhận."
            )

        slots.setdefault(target, []).append({
            "name": entry["input"],
            "ingredient": entry["ingredient"],
            "drug_code": code,
            "timing": timing,
            "note": note_text or "—",
        })

    # sort theo tên để ổn định
    for k in slots:
        slots[k].sort(key=lambda x: (x["drug_code"] or "ZZ", x["name"]))
    return {
        "schedule": slots,
        "schedule_locked": schedule_locked,
        "separation_notes": separation_notes,
    }


def _vi_norm(s):
    return backend_tools._norm(s or "")


def _drug_code_of(norm_result, ingredient):
    for e in norm_result.get("normalized", []):
        if e.get("matched") and e.get("ingredient") == ingredient:
            return e["drug_code"]
    return ingredient


# ---------------------------------------------------------------------------
# Guardrail cứng (code) — không phụ thuộc AI
# ---------------------------------------------------------------------------
_EMERGENCY_PATTERNS = (
    "dau nguc", "kho tho", "bat tinh", "co giat", "mat tri giac", "ngo mau", "non mau",
    "dau dau du doi", "yeu liet", "liet nua nguoi", "noi mau tieu hoa", "phu phe",
)
_PRESCRIBE_PATTERNS = (
    "ke them thuoc", "ke don", "cho thuoc gi", "nen mua thuoc gi", "thuoc thay the",
    "mua khang sinh", "khang sinh khong can don", "doi sang thuoc gi",
)


def _detect_hard_guardrails(medications, notes):
    """Trả {emergency, prescribe_request} từ notes — mức ĐỎ tuyệt đối, không AI quyết."""
    text = _vi_norm(" ".join(list(medications or []) + [notes or ""]))
    emergency = any(p in text for p in _EMERGENCY_PATTERNS)
    prescribe = any(p in text for p in _PRESCRIBE_PATTERNS)
    return {"emergency": emergency, "prescribe_request": prescribe}


# ---------------------------------------------------------------------------
# Phiếu tóm tắt gửi dược sĩ (người con copy gửi Zalo)
# ---------------------------------------------------------------------------
def _build_pharmacist_summary(medications, norm_result, inter_result, guard):
    drugs_input = [str(m).strip() for m in (medications or []) if str(m).strip()]
    lines = ["Chào dược sĩ,"]
    lines.append("Mẹ/bố tôi đang dùng: %s." % (", ".join(drugs_input) or "(danh sách thuốc)"))
    if norm_result.get("unknown_meds"):
        lines.append(
            "Các thuốc chưa có trong dữ liệu của hệ thống: %s."
            % ", ".join(norm_result["unknown_meds"])
        )
    pairs = inter_result.get("pairs_input", [])
    if pairs:
        red = [p for p in pairs if p["severity"] == "nang"]
        if red:
            lines.append(
                "Hệ thống cảnh báo tương tác mức ĐỎ: %s."
                % "; ".join("%s + %s (%s)" % (p["pair_inputs"][0], p["pair_inputs"][1], p["code"]) for p in red)
            )
        yellow = [p for p in pairs if p["severity"] != "nang"]
        if yellow:
            lines.append(
                "Các cặp cần lưu ý thêm: %s."
                % "; ".join("%s + %s (%s)" % (p["pair_inputs"][0], p["pair_inputs"][1], p["code"]) for p in yellow)
            )
    else:
        lines.append("Hệ thống chưa ghi nhận cặp tương tác trong dữ liệu hiện có.")
    if guard.get("emergency"):
        lines.append("Có dấu hiệu nguy hiểm (cần đi khám ngay — không chờ phản hồi).")
    lines.append("Xin dược sĩ cho ý kiến: có nên dùng chung không và nếu dùng thì sắp giờ uống thế nào cho an toàn?")
    return " ".join(lines)


# ---------------------------------------------------------------------------
# Risk level tổng hợp
# ---------------------------------------------------------------------------
def _risk_level(norm_result, inter_result, guard):
    if guard.get("emergency"):
        return "RED"
    highest = inter_result.get("highest_severity", "khong")
    if highest == "nang":
        return "RED"
    if norm_result.get("unknown_meds"):
        return "YELLOW"
    if highest == "trung_binh" or highest == "nhe":
        return "YELLOW"
    if norm_result.get("fuzzy_matches") or inter_result.get("pairs_input"):
        return "YELLOW"
    return "GREEN"


# ---------------------------------------------------------------------------
# Hàm chính cho tầng API
# ---------------------------------------------------------------------------
def analyze_medications(medications, notes=None, trace_id="api"):
    """Đầu vào: medications list[str] (tên thuốc gõ tự do), notes str (tuỳ chọn).
    Đầu ra: dict đúng JSON Contract mục 3.2 của tài liệu phân công.
    Không tác động ra ngoài (phiếu dược sĩ chỉ là text để copy)."""
    medications = [str(m).strip() for m in (medications or []) if str(m).strip()]
    notes = (notes or "").strip()

    _trace_begin(trace_id)
    try:
        guard = _detect_hard_guardrails(medications, notes)
        note("guardrail: %s" % guard)

        # Cấp cứu → dừng toàn bộ, không xếp lịch
        if guard["emergency"]:
            _trace_end()
            return {
                "risk_level": "RED",
                "risk_summary": "Phát hiện dấu hiệu nguy hiểm (đau ngực/khó thở…). Dừng sắp lịch thuốc — đưa người bệnh đi cơ sở y tế hoặc gọi 115 NGAY.",
                "escalate_to_pharmacist": True,
                "interactions": [],
                "schedule_locked": True,
                "schedule": {"morning": [], "noon": [], "evening": [], "bedtime": []},
                "pharmacist_summary": _build_pharmacist_summary(medications, {"unknown_meds": []}, {"pairs_input": []}, guard),
                "trace": {
                    "normalized_ingredients": [],
                    "tool_lookups": ["check_red_flags: phát hiện dấu hiệu cấp cứu → dừng luồng (spec §4)"],
                    "guardrail_decision": "Guardrail cấp cứu: dừng mọi bước, chỉ dẫn gọi 115.",
                },
            }

        norm_result = backend_tools.normalize_medications(medications)
        dup_result = backend_tools.check_duplicates(norm_result)
        inter_result = backend_tools.lookup_interactions(norm_result)
        sched = _build_schedule_v2(norm_result, inter_result)

        # Trùng hoạt chất = cảnh báo vàng (dùng chung 1 hoạt chất 2 lần/ngày)
        duplicate_warnings = [
            "Hai thuốc %s cùng chứa hoạt chất %s [%s] — KHÔNG dùng chung trong cùng ngày nếu chưa hỏi dược sĩ."
            % (", ".join(d["inputs"]), d["ingredient"], d["drug_code"])
            for d in dup_result["duplicates"]
        ]

        # Trên biểu đồ 3 màu: RED khi tương tác nặng, UNKNOWN → YELLOW, nhắc kê đơn → RED
        unknown = norm_result.get("unknown_meds", [])
        risk = _risk_level(norm_result, inter_result, {**guard, "emergency": False})
        if guard.get("prescribe_request"):
            risk = "RED"

        # escalate: ĐỎ luôn escalate; thuốc lạ escalate (C2); yêu cầu kê đơn escalate
        escalate = (
            risk == "RED"
            or bool(unknown)
            or bool(norm_result.get("fuzzy_matches"))
            or guard.get("prescribe_request", False)
        )

        # Tương tác list cho UI — theo JSON contract
        interactions_ui = []
        for p in inter_result.get("pairs_input", []):
            sev = p["severity"]
            interactions_ui.append({
                "pair": p["pair_inputs"],
                "severity": p["severity_color"],
                "reason": p.get("summary") or "(chưa có mô tả trong dữ liệu)",
                "action": p.get("recommendation") or "Hỏi dược sĩ trước khi dùng chung.",
            })
        for w in duplicate_warnings:
            interactions_ui.append({
                "pair": [], "severity": "YELLOW",
                "reason": w, "action": "Chỉ giữ một thuốc chứa hoạt chất này mỗi ngày, hỏi dược sĩ.",
            })
        if unknown:
            interactions_ui.append({
                "pair": [], "severity": "YELLOW",
                "reason": "Thuốc chưa có trong dữ liệu: %s — hệ thống không tự suy ra tương tác."
                % ", ".join(unknown),
                "action": "Hỏi dược sĩ hoặc gửi tên thuốc trên vỏ hộp để kiểm tra.",
            })
        if guard.get("prescribe_request"):
            interactions_ui.append({
                "pair": [], "severity": "RED",
                "reason": "Yêu cầu kê đơn / thêm thuốc nằm ngoài phạm vi của trợ lý.",
                "action": "Liên hệ bác sĩ hoặc dược sĩ trực tiếp.",
            })

        # Tóm tắt mặc định (mock CP2) — AI chỉ viết lại lời văn
        risk_summary_default = _default_risk_summary(risk, norm_result, inter_result, dup_result, guard)
        pharmacist_summary = _build_pharmacist_summary(medications, norm_result, inter_result, guard)

        # trace theo JSON contract (mục 3.2)
        trace_norm = [
            {"input": e["input"], "ingredient": e.get("ingredient"), "matched": bool(e.get("matched"))}
            for e in norm_result.get("normalized", [])
        ]
        tool_lookups = ["normalize_medications: %d tên → %d hoạt chất (nguồn: %s)"
                        % (len(medications), len(norm_result.get("ingredients", [])), norm_result.get("source", ""))]
        for p in inter_result.get("pairs_input", []):
            tool_lookups.append(
                "Tra bảng tương tác (%s): %s + %s → %s [%s]."
                % (p.get("source", "data"), p["pair_ingredients"][0], p["pair_ingredients"][1],
                   p["severity_color"], p["code"])
            )
        if dup_result["count"]:
            tool_lookups.append("check_duplicates: %d hoạt chất bị dùng trùng qua 2 tên khác nhau." % dup_result["count"])
        guardrail_decision = _guardrail_decision_text(risk, guard, unknown, sched["schedule_locked"])

        # Bước model: chỉ viết lại risk_summary (giữ fallback mock khi chưa nối model / lỗi)
        risk_summary = risk_summary_default
        model_note = "mock (MODEL_PROVIDER=fake hoặc chưa cấu hình — CP2)"
        try:
            prompt = _model_prompt(norm_result, inter_result, dup_result, guard, risk, sched)
            reply = call_model(SYSTEM_PROMPT, prompt)
            if reply.get("model") and reply.get("model") != "fake" and reply.get("text", "").strip():
                risk_summary = reply["text"].strip()
                model_note = "model thật: %s (token %d/%d)" % (reply["model"], reply.get("tokens_in", 0), reply.get("tokens_out", 0))
            else:
                model_note = "mock: model trả lời giả (chưa nối model thật)"
        except Exception as e:  # model lỗi/mất mạng: fallback sang text dựng sẵn — API không chết
            model_note = "fallback (model lỗi: %s: %s)" % (type(e).__name__, str(e)[:120])
        note("model: %s" % model_note)

        result = {
            "risk_level": risk,
            "risk_summary": risk_summary,
            "escalate_to_pharmacist": bool(escalate),
            "interactions": interactions_ui,
            "schedule_locked": bool(sched["schedule_locked"] or risk == "RED"),
            "schedule": sched["schedule"],
            "pharmacist_summary": pharmacist_summary,
            "trace": {
                "normalized_ingredients": trace_norm,
                "tool_lookups": tool_lookups,
                "guardrail_decision": guardrail_decision,
                "model_note": model_note,
                "separation_notes": sched["separation_notes"],
            },
        }
        return result
    finally:
        _trace_end()


def _default_risk_summary(risk, norm_result, inter_result, dup_result, guard):
    if guard.get("prescribe_request"):
        return (
            "Yêu cầu kê thêm thuốc nằm ngoài phạm vi của trợ lý (không chẩn đoán, không kê đơn). "
            "Vui lòng liên hệ bác sĩ hoặc dược sĩ."
        )
    pairs = inter_result.get("pairs_input", [])
    red = [p for p in pairs if p["severity"] == "nang"]
    if red:
        parts = []
        for p in red:
            parts.append(
                "%s và %s (nguy cơ: %s)" % (p["pair_inputs"][0], p["pair_inputs"][1], (p.get("summary") or "")[:80])
            )
        return "Phát hiện %d cặp tương tác mức ĐỎ: %s. Không tự ý dùng chung — cần bác sĩ/dược sĩ xác nhận lại đơn." % (
            len(red), "; ".join(parts)
        )
    if norm_result.get("unknown_meds"):
        return (
            "Không nhận diện được %d tên thuốc (%s). Hệ thống không tự đoán — vui lòng kiểm tra tên trên vỏ hộp "
            "hoặc hỏi dược sĩ." % (len(norm_result["unknown_meds"]), ", ".join(norm_result["unknown_meds"]))
        )
    yellow = [p for p in pairs if p["severity"] != "nang"]
    if dup_result["count"]:
        d = dup_result["duplicates"][0]
        return "Hai thuốc %s cùng chứa hoạt chất %s — không nên dùng chung trong cùng ngày nếu chưa hỏi dược sĩ." % (
            " và ".join(d["inputs"]), d["ingredient"]
        )
    if yellow:
        p = yellow[0]
        return "Có cặp cần lưu ý: %s + %s — %s" % (
            p["pair_inputs"][0], p["pair_inputs"][1], (p.get("summary") or "")[:100]
        )
    return "Chưa ghi nhận cặp tương tác nào trong danh mục dữ liệu hiện có. Lịch dưới đây vẫn là bản nháp cần xác nhận."


def _guardrail_decision_text(risk, guard, unknown, locked):
    if guard.get("emergency"):
        return "Guardrail cấp cứu: dừng mọi bước, chỉ dẫn gọi 115."
    decisions = []
    if risk == "RED":
        decisions.append("Guardrail mức ĐỎ: khoá lịch tự động và bật chuyển dược sĩ.")
    if unknown:
        decisions.append(
            "Guardrail thuốc lạ (%d): không xếp lịch cho thuốc chưa có trong dữ liệu, chuyển dược sĩ." % len(unknown)
        )
    if guard.get("prescribe_request"):
        decisions.append("Guardrail ngoài thẩm quyền: từ chối kê đơn.")
    if not decisions:
        decisions.append("Không kích hoạt guardrail — ca an toàn, lịch nháp chờ người dùng xác nhận.")
    text = " ".join(decisions)
    if locked and "khoá" not in text:
        text += " Lịch đã bị khoá."
    return text


def _model_prompt(norm_result, inter_result, dup_result, guard, risk, sched):
    lines = ["=== KẾT QUẢ CÔNG CỤ (BẮT BUỘC DỰA VÀO — KHÔNG ĐỰA RA NGOÀI ĐÂY) ==="]
    lines.append("Mức rủi ro tổng hợp (code): %s" % risk)
    lines.append("Thuốc nhận diện được: %s" % (
        ", ".join(e["ingredient"] for e in norm_result.get("normalized", []) if e.get("matched")) or "(không)"))
    if norm_result.get("unknown_meds"):
        lines.append("THUỐC CHƯA CÓ TRONG DỮ LIỆU: %s — không suy ra gì về chúng." % ", ".join(norm_result["unknown_meds"]))
    for p in inter_result.get("pairs_input", []):
        lines.append("- [%s] %s + %s | Mức: %s | %s" % (
            p["code"], p["pair_ingredients"][0], p["pair_ingredients"][1],
            p["severity_color"], (p.get("summary") or "")[:120]))
    for d in dup_result.get("duplicates", []):
        lines.append("- TRÙNG HOẠT CHẤT: %s (qua 2 tên: %s)" % (d["ingredient"], ", ".join(d["inputs"])))
    if guard.get("prescribe_request"):
        lines.append("NGOÀI PHẠM VI: tin nhắn có yêu cầu kê đơn/thêm thuốc — từ chối và chỉ về bác sĩ/dược sĩ.")
    lines.append("Lịch đã xếp bằng code (không được đổi): %s" % json_short(sched["schedule"]))
    lines.append("")
    lines.append("Viết risk_summary 1–2 câu tiếng Việt cho UI (nêu cặp thuốc + nguy cơ nếu có). KHÔNG thêm mục khác.")
    return "\n".join(lines)


def json_short(obj):
    import json as _json
    s = _json.dumps(obj, ensure_ascii=False)
    return s if len(s) <= 800 else s[:800] + "…"


# ---------------------------------------------------------------------------
# Chạy độc lập (DoD Phần 2): python backend_agent.py — 4 ca mẫu + mock model
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    for _stream in (sys.stdout, sys.stderr):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    import json as _json
    CASES = {
        "safe": ["Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 10mg", "Vitamin D3"],
        "yellow": ["Levothyroxine 50mcg", "Canxi Carbonate 500mg", "Panadol 500mg", "Efferalgan 500mg"],
        "red": ["Warfarin 5mg", "Aspirin 81mg", "Ibuprofen 400mg", "Omeprazole 20mg"],
        "edge": ["Thuốc huyết áp viên màu hồng", "Thuốc đau đầu gói xanh", "Mẹ đang đau ngực, kê thêm thuốc giúp tôi"],
    }
    for name, meds in CASES.items():
        print("=" * 60)
        print("CA:", name)
        r = analyze_medications(meds, notes="", trace_id="selftest-" + name)
        print(" risk:", r["risk_level"], "| locked:", r["schedule_locked"], "| escalate:", r["escalate_to_pharmacist"])
        print(" summary:", r["risk_summary"][:150])
        for slot, items in r["schedule"].items():
            if items:
                print(" ", slot, "->", [(x["name"], x["timing"]) for x in items])
        print(" trace.guardrail:", r["trace"]["guardrail_decision"][:120])
