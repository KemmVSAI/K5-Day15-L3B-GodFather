"""backend_agent.py — Phần 2 của Backend (theo tài liệu phân công 3 phần).

Suy luận, xếp lịch 4 khung giờ & Guardrail cho tầng API:
    analyze_medications(medications, notes="", trace_id="api") → dict đúng JSON Contract (phancong.md §3.2)

Nguyên tắc (khớp spec.md §4/§7):
    - Mọi kết quả ĐỌC từ data qua backend_tools (không để AI bịa tương tác / kê thêm thuốc).
    - Guardrail cứng bằng CODE (không phụ thuộc AI):
        * Dấu hiệu cấp cứu (đau ngực, khó thở...) → risk_level="RED", khóa toàn bộ lịch, chỉ dẫn gọi 115.
        * Tương tác mức ĐỎ (nang)                 → risk_level="RED", schedule_locked=True, escalate=True, loại thuốc dính cặp ĐỎ khỏi lịch.
        * Thuốc không nhận diện được              → không xếp lịch cho thuốc lạ, escalate=True.
        * Trùng hoạt chất (Panadol + Efferalgan)  → cảnh báo YELLOW kèm pair đầy đủ, escalate=True.
        * Yêu cầu kê đơn / liều lượng             → từ chối + escalate=True.
    - AI (call_model) chỉ viết lời văn risk_summary; fallback sang text dựng sẵn khi chạy mock hoặc model lỗi.
"""
import json
import os
import re
import sys

_CODEBASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "codebase")
if _CODEBASE not in sys.path:
    sys.path.insert(0, _CODEBASE)

import backend_tools  # noqa: E402
from ai import call_model  # noqa: E402
from tracing import begin as _trace_begin, end as _trace_end, note  # noqa: E402

SLOT_MAP = {
    "sang": "morning",
    "trua": "noon",
    "toi": "evening",
}

SYSTEM_PROMPT = """Bạn là trợ lý hỗ trợ người con sắp thuốc cho cha mẹ cao tuổi (Track B2 — kiểm tra tương tác thuốc & lịch uống).
BẮT BUỘC:
1. Chỉ dựa trên kết quả công cụ được cấp trong ngữ cảnh. Không bịa cặp tương tác, không thêm thuốc mới, không đổi mức độ cảnh báo.
2. risk_summary viết 1–2 câu, nói rõ cặp thuốc và nguy cơ nếu có.
3. Nếu được đánh dấu là ca mức ĐỎ: nhấn mạnh không tự ý dùng chung và cần bác sĩ/dược sĩ.
4. Nếu có thuốc chưa có trong dữ liệu: ghi rõ "chưa có trong dữ liệu", không suy ra công dụng hay tương tác của nó.
5. Không chẩn đoán bệnh, không tư vấn liều, không khuyên tự ý ngừng/thay thuốc kê đơn.
6. Văn phong: tiếng Việt, ngắn gọn, thân thiện với người con chưa học y."""

_EMERGENCY_PATTERNS = (
    "dau nguc", "tuc nguc", "kho tho", "tho gap", "bat tinh", "co giat",
    "mat tri giac", "non ra mau", "non mau", "oi ra mau", "ho ra mau",
    "di ngoai phan den", "phan den", "chay mau khong cam", "ngat xiu",
    "yeu liet", "liet nua nguoi", "meo mieng", "noi ngong", "soc phan ve",
)
_PRESCRIBE_PATTERNS = (
    "ke them thuoc", "ke don", "ke thuoc", "ke giup", "cho thuoc gi",
    "nen mua thuoc gi", "mua them thuoc gi", "thuoc thay the",
    "mua khang sinh", "khang sinh khong can don", "doi sang thuoc gi",
)
_NEGATIONS = ("khong bi ", "khong co ", "chua bi ", "khong thay ", "khong ")


def _vi_norm(s):
    return backend_tools._norm(s or "")


def _has_phrase(norm_text, phrase):
    """So khớp theo ranh giới từ để tránh bắt nhầm (vd 'mua them thuoc gi' != 'mua them thuoc giam dau')."""
    return bool(re.search(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", norm_text))


def _drug_code_of(norm_result, ingredient):
    for e in norm_result.get("normalized", []):
        if e.get("matched") and e.get("ingredient") == ingredient:
            return e["drug_code"]
    return ingredient


def _detect_hard_guardrails(medications, notes):
    """Phát hiện dấu hiệu cấp cứu và yêu cầu kê đơn/thêm thuốc bằng quy tắc cứng."""
    text = _vi_norm(" ".join(list(medications or []) + [notes or ""]))
    emergency_hits = []
    for p in _EMERGENCY_PATTERNS:
        m = re.search(r"(?<!\w)" + re.escape(p) + r"(?!\w)", text)
        if not m:
            continue
        prefix = text[max(0, m.start() - 14):m.start()]
        if any(prefix.endswith(neg) for neg in _NEGATIONS):
            continue
        emergency_hits.append(p)
    prescribe = any(_has_phrase(text, p) for p in _PRESCRIBE_PATTERNS)
    return {"emergency": bool(emergency_hits), "emergency_hits": emergency_hits, "prescribe_request": prescribe}


def _format_timing(entry, target_slot):
    ing = _vi_norm(entry.get("ingredient", ""))
    meal_rel = entry.get("meal_relation", "bat_ky")
    slot_noun = {"morning": "ăn sáng", "noon": "ăn trưa", "evening": "ăn tối", "bedtime": "khi ngủ"}.get(target_slot, "ăn")
    if ing.startswith("levothyrox") and target_slot == "morning":
        return "Trước ăn sáng 30–60 phút (lúc đói)"
    if ing == "omeprazole":
        return "Trước %s 30 phút" % slot_noun
    if target_slot == "bedtime":
        return "Buổi tối cố định / trước ngủ"
    if meal_rel == "truoc_an":
        return "Trước %s" % slot_noun
    if meal_rel == "sau_an":
        return "Sau %s" % slot_noun
    return "Trước hoặc sau %s đều được" % slot_noun


def _build_schedule_v2(norm_result, inter_result, dup_result):
    """Xây schedule {morning, noon, evening, bedtime} bằng CODE từ kết quả chuẩn hóa + tách giờ.

    - Thuốc unknown KHÔNG được xếp lịch (C2).
    - Cặp mức ĐỎ: schedule_locked = True và LOẠI thuốc dính cặp ĐỎ khỏi lịch (chỉ giữ thuốc độc lập an toàn như Omeprazole).
    - Cặp tách giờ (action=tach_gio): đẩy thuốc tương ứng sang buổi khác kèm lý do tách ≥ 4 giờ.
    - Trùng hoạt chất (Panadol + Efferalgan): gom thành 1 thẻ "chọn 1 sản phẩm khi cần", tránh người dùng uống gộp.
    """
    slots = {"morning": [], "noon": [], "evening": [], "bedtime": []}
    separation_notes = []
    sep_applied = {}

    hard_pairs = [p for p in inter_result.get("pairs_input", []) if p["severity"] == "nang"]
    hard_ingredients = {
        _vi_norm(ing) for p in hard_pairs for ing in p.get("pair_ingredients", [])
    }
    schedule_locked = bool(hard_pairs)

    for p in inter_result.get("pairs_input", []):
        if p.get("action") == "tach_gio" or "tach gio" in _vi_norm(p.get("recommendation", "")):
            a, b = p["pair_ingredients"]
            for ing_a, ing_b in ((a, b), (b, a)):
                if _vi_norm(ing_a).startswith("levothyrox"):
                    sep_applied[_drug_code_of(norm_result, ing_b)] = (
                        "Tách %s tối thiểu 4 giờ [%s]" % (ing_a, p["code"])
                    )
                    separation_notes.append(
                        "%s + %s: xếp lệch khung giờ (tối thiểu 4 giờ) [%s]"
                        % (p["pair_inputs"][0], p["pair_inputs"][1], p["code"])
                    )

    dup_by_code = {d["drug_code"]: d for d in dup_result.get("duplicates", []) if d.get("drug_code")}
    dup_emitted = set()

    for entry in norm_result.get("normalized", []):
        if not entry.get("matched"):
            continue
        code = entry["drug_code"]
        ing_norm = _vi_norm(entry.get("ingredient", ""))

        # Guardrail C1: khóa và không xếp lịch các thuốc dính cặp tương tác ĐỎ
        if ing_norm in hard_ingredients:
            continue

        # Trùng hoạt chất: chỉ hiển thị 1 thẻ cảnh báo chọn 1 sản phẩm khi cần
        if code in dup_by_code:
            if code in dup_emitted:
                continue
            dup_emitted.add(code)
            d_info = dup_by_code[code]
            slots["morning"].append({
                "name": "%s (chọn 1 sản phẩm)" % " / ".join(d_info["inputs"]),
                "timing": "Khi cần (cách nhau ≥ 4–6 giờ)",
                "note": "Chỉ chọn 1 trong 2 (%s) khi cần; KHÔNG uống gộp vì trùng hoạt chất %s."
                % (" / ".join(d_info["inputs"]), d_info["ingredient"]),
            })
            continue

        base_slots = entry.get("slots") or ["sang"]
        note_text = entry.get("timing_note") or ""

        if code in sep_applied:
            # Nếu thuốc gốc ở buổi sáng (vd Omeprazole) thì đẩy tối; nếu Canxi giữ trưa (cách Levothyroxine ≥ 4 giờ)
            target_slots = ["noon"] if ing_norm.startswith("calcium") else ["evening"]
            note_text = (sep_applied[code] + ". " + note_text).strip()
        else:
            target_slots = [SLOT_MAP.get(s, s) for s in base_slots if SLOT_MAP.get(s, s) in slots] or ["morning"]

        if ing_norm == "warfarin":
            target_slots = ["bedtime"]

        for target in target_slots:
            slots[target].append({
                "name": entry["input"],
                "timing": _format_timing(entry, target),
                "note": note_text or "Uống theo đúng chỉ dẫn trên đơn bác sĩ.",
            })

    return {
        "schedule": slots,
        "schedule_locked": schedule_locked,
        "separation_notes": separation_notes,
    }


def _risk_level(norm_result, inter_result, dup_result, guard):
    if guard.get("emergency") or guard.get("prescribe_request"):
        return "RED"
    if inter_result.get("counts", {}).get("nang", 0) > 0:
        return "RED"
    if not norm_result.get("ingredients") and norm_result.get("unknown_meds"):
        return "RED"
    if inter_result.get("counts", {}).get("trung_binh", 0) > 0 or dup_result.get("count", 0) > 0 or norm_result.get("unknown_meds"):
        return "YELLOW"
    return "GREEN"


def _build_pharmacist_summary(medications, norm_result, inter_result, dup_result, guard):
    drugs_input = [str(m).strip() for m in (medications or []) if str(m).strip()]
    med_str = ", ".join(drugs_input) if drugs_input else "(danh sách thuốc)"
    if guard.get("emergency"):
        return (
            "KHẨN CẤP: Người nhà đang có dấu hiệu nguy hiểm (cần gọi 115 / đi khám ngay). "
            "Thuốc ghi nhận: %s. Vui lòng mang theo toàn bộ vỏ hộp và đơn thuốc tới cơ sở y tế." % med_str
        )

    parts = ["Chào dược sĩ, mẹ/bố tôi đang dùng: %s." % med_str]
    hard = [p for p in inter_result.get("pairs_input", []) if p["severity"] == "nang"]
    yellow = [p for p in inter_result.get("pairs_input", []) if p["severity"] != "nang"]
    if hard:
        pairs_s = "; ".join("%s + %s" % (p["pair_inputs"][0], p["pair_inputs"][1]) for p in hard)
        parts.append(
            "Hệ thống cảnh báo tương tác mức ĐỎ giữa %s. "
            "Xin hỏi có nên tạm ngưng hay điều chỉnh lịch uống/đơn thuốc không?" % pairs_s
        )
    elif yellow or dup_result.get("count"):
        notes_y = []
        for p in yellow:
            notes_y.append("%s + %s" % (p["pair_inputs"][0], p["pair_inputs"][1]))
        for d in dup_result.get("duplicates", []):
            notes_y.append("trùng hoạt chất %s (%s)" % (d["ingredient"], " + ".join(d["inputs"])))
        parts.append("Hệ thống lưu ý mức VÀNG: %s. Nhờ dược sĩ xác nhận lại lịch uống an toàn." % "; ".join(notes_y))

    if norm_result.get("unknown_meds"):
        parts.append("Có thuốc chưa có trong dữ liệu: %s — nhờ dược sĩ kiểm tra giúp." % ", ".join(norm_result["unknown_meds"]))
    if guard.get("prescribe_request"):
        parts.append("Gia đình muốn hỏi ý kiến trực tiếp bác sĩ/dược sĩ về việc kê thêm thuốc.")
    if not hard and not yellow and not dup_result.get("count") and not norm_result.get("unknown_meds") and not guard.get("prescribe_request"):
        parts.append("Hệ thống chưa ghi nhận tương tác trong bộ 18 hoạt chất; nhờ dược sĩ xem giúp nếu cần lưu ý thêm theo bệnh nền.")
    return " ".join(parts)


def _default_risk_summary(risk, norm_result, inter_result, dup_result, guard):
    if guard.get("emergency"):
        return "CẢNH BÁO CẤP CỨU: Phát hiện dấu hiệu nguy hiểm. Dừng tự sắp lịch và gọi 115 hoặc đưa người nhà đi khám ngay."
    pairs = inter_result.get("pairs_input", [])
    hard = [p for p in pairs if p["severity"] == "nang"]
    if hard:
        pairs_s = ", ".join("%s + %s" % (p["pair_inputs"][0], p["pair_inputs"][1]) for p in hard)
        return "Phát hiện tương tác nguy hiểm mức ĐỎ (%s). Không tự ý dùng chung; đã khóa lịch tự động và cần hỏi bác sĩ/dược sĩ ngay." % pairs_s
    if guard.get("prescribe_request"):
        return "Yêu cầu kê thêm thuốc / chẩn đoán nằm ngoài thẩm quyền của trợ lý. Vui lòng trao đổi trực tiếp với bác sĩ hoặc dược sĩ."
    if norm_result.get("unknown_meds") and not norm_result.get("ingredients"):
        return (
            "Chưa nhận diện được %d thuốc trong dữ liệu (%s). Hệ thống không tự đoán — vui lòng kiểm tra tên trên vỏ hộp hoặc hỏi dược sĩ."
            % (len(norm_result["unknown_meds"]), ", ".join(norm_result["unknown_meds"]))
        )
    yellow = [p for p in pairs if p["severity"] != "nang"]
    if dup_result.get("count") and yellow:
        d = dup_result["duplicates"][0]
        p = yellow[0]
        return (
            "Cảnh báo mức VÀNG: phát hiện trùng hoạt chất %s (%s) và cặp cần tách giờ %s + %s. "
            "Không uống gộp thuốc trùng hoạt chất và tuân thủ tách giờ theo lịch nháp."
            % (d["ingredient"], " + ".join(d["inputs"]), p["pair_inputs"][0], p["pair_inputs"][1])
        )
    if dup_result.get("count"):
        d = dup_result["duplicates"][0]
        return "Cảnh báo mức VÀNG: %s đều chứa hoạt chất %s — không tự ý uống gộp cùng ngày và cần hỏi dược sĩ." % (
            " và ".join(d["inputs"]), d["ingredient"]
        )
    if norm_result.get("unknown_meds"):
        return "Cảnh báo mức VÀNG: có %d thuốc chưa có trong dữ liệu (%s). Hệ thống không tự suy đoán tương tác — vui lòng hỏi dược sĩ." % (
            len(norm_result["unknown_meds"]), ", ".join(norm_result["unknown_meds"])
        )
    if yellow:
        p = yellow[0]
        return "Cảnh báo mức VÀNG: %s + %s — %s" % (p["pair_inputs"][0], p["pair_inputs"][1], (p.get("summary") or "")[:140])
    return "Chưa ghi nhận cặp tương tác hay trùng hoạt chất trong danh mục dữ liệu hiện có. Lịch dưới đây là bản nháp chờ người nhà xác nhận."


def _guardrail_decision_text(risk, guard, unknown, locked):
    if guard.get("emergency"):
        return "Kích hoạt Guardrail CẤP CỨU mức ĐỎ: khóa toàn bộ lịch uống và yêu cầu gọi 115 / đi khám ngay."
    decisions = []
    if risk == "RED":
        decisions.append("Kích hoạt Guardrail mức ĐỎ: khóa lịch tự động cho các thuốc nguy hiểm và bật nút Hỏi Dược Sĩ.")
    if unknown:
        decisions.append("Guardrail thuốc lạ (%d): không xếp lịch cho thuốc chưa có trong dữ liệu, chuyển dược sĩ." % len(unknown))
    if guard.get("prescribe_request"):
        decisions.append("Guardrail ngoài thẩm quyền: từ chối kê đơn.")
    if not decisions:
        if risk == "YELLOW":
            decisions.append("Cảnh báo mức VÀNG: xếp lịch nháp có tách giờ / lưu ý trùng hoạt chất và khuyến nghị xác nhận dược sĩ.")
        else:
            decisions.append("Không kích hoạt guardrail chặn — ca an toàn, xuất lịch nháp chờ người dùng xác nhận.")
    text = " ".join(decisions)
    if locked and "khóa" not in text and "khoá" not in text:
        text += " Lịch đã bị khóa."
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
    s = json.dumps(obj, ensure_ascii=False)
    return s if len(s) <= 800 else s[:800] + "…"


def analyze_medications(medications, notes="", trace_id="api"):
    """Điểm vào chính của Phần 2 Backend cho tầng API (`POST /api/analyze`) — đúng JSON Contract §3.2."""
    _trace_begin(trace_id)
    try:
        med_list = [str(m).strip() for m in (medications or []) if str(m).strip()]
        notes_clean = (notes or "").strip()

        guard = _detect_hard_guardrails(med_list, notes_clean)
        norm_result = backend_tools.normalize_medications(med_list)
        dup_result = backend_tools.check_duplicates(norm_result)
        inter_result = backend_tools.lookup_interactions(norm_result)

        unknown = norm_result.get("unknown_meds", [])
        risk = _risk_level(norm_result, inter_result, dup_result, guard)

        if guard.get("emergency"):
            sched = {"schedule": {"morning": [], "noon": [], "evening": [], "bedtime": []}, "schedule_locked": True, "separation_notes": []}
        else:
            sched = _build_schedule_v2(norm_result, inter_result, dup_result)

        schedule_locked = bool(sched["schedule_locked"] or risk == "RED")
        hoi_ds_med = any(
            p.get("severity") == "trung_binh" and p.get("action") == "hoi_duoc_si"
            for p in inter_result.get("pairs_input", [])
        )
        escalate = bool(
            risk == "RED"
            or unknown
            or dup_result.get("count", 0) > 0
            or hoi_ds_med
            or guard.get("prescribe_request")
        )

        # Danh sách interactions đúng JSON Contract §3.2
        interactions_ui = []
        for p in inter_result.get("pairs_input", []):
            interactions_ui.append({
                "pair": p["pair_inputs"],
                "severity": p["severity_color"],
                "reason": p.get("summary") or "(chưa có mô tả trong dữ liệu)",
                "action": p.get("recommendation") or "Hỏi dược sĩ trước khi dùng chung.",
            })
        for d in dup_result.get("duplicates", []):
            interactions_ui.append({
                "pair": d["inputs"][:2] if len(d["inputs"]) >= 2 else d["inputs"],
                "severity": "YELLOW",
                "reason": "Trùng hoạt chất %s: %s đều chứa cùng hoạt chất, dùng chung dễ quá liều."
                % (d["ingredient"], " và ".join(d["inputs"])),
                "action": "Chỉ giữ một thuốc chứa %s mỗi ngày và hỏi dược sĩ." % d["ingredient"],
            })

        risk_summary_default = _default_risk_summary(risk, norm_result, inter_result, dup_result, guard)
        pharmacist_summary = _build_pharmacist_summary(med_list, norm_result, inter_result, dup_result, guard)

        # Trace theo JSON Contract §3.2 (không để ingredient=None tránh crash UI)
        trace_norm = [
            {
                "input": e["input"],
                "ingredient": e.get("ingredient") or "Chưa có trong dữ liệu",
                "matched": bool(e.get("matched")),
            }
            for e in norm_result.get("normalized", [])
        ]
        tool_lookups = [
            "Chuẩn hóa danh mục (%s): %d tên → %d hoạt chất nhận diện."
            % (norm_result.get("source", "data/drugs.json"), len(med_list), len(norm_result.get("ingredients", [])))
        ]
        if guard.get("emergency"):
            tool_lookups.append("Sàng lọc cấp cứu: Phát hiện dấu hiệu nguy hiểm -> DỪNG và chỉ dẫn gọi 115.")
        if guard.get("prescribe_request"):
            tool_lookups.append("Kiểm tra thẩm quyền: Phát hiện yêu cầu kê đơn/thêm thuốc -> Từ chối.")
        for p in inter_result.get("pairs_input", []):
            tool_lookups.append(
                "Tra cứu bảng tương tác (DATA_CARD %s): %s + %s -> Mức %s."
                % (p["code"], p["pair_ingredients"][0], p["pair_ingredients"][1], p["severity_color"])
            )
        if dup_result.get("count"):
            for d in dup_result["duplicates"]:
                tool_lookups.append(
                    "Kiểm tra trùng hoạt chất (check_duplicates): %s cùng chứa %s -> Mức YELLOW."
                    % (" + ".join(d["inputs"]), d["ingredient"])
                )
        if unknown:
            tool_lookups.append("Thuốc chưa có trong dữ liệu (%d): %s." % (len(unknown), ", ".join(unknown)))

        guardrail_decision = _guardrail_decision_text(risk, guard, unknown, schedule_locked)

        # Gọi model thật để viết lại risk_summary (không gọi khi cấp cứu để phản hồi tức thì & tiết kiệm quota)
        risk_summary = risk_summary_default
        model_note = "mock (MODEL_PROVIDER=fake hoặc chưa cấu hình)"
        if not guard.get("emergency"):
            try:
                prompt = _model_prompt(norm_result, inter_result, dup_result, guard, risk, sched)
                reply = call_model(SYSTEM_PROMPT, prompt)
                if reply.get("model") and reply.get("model") != "fake" and reply.get("text", "").strip():
                    risk_summary = reply["text"].strip()
                    model_note = "model thật: %s (token %d/%d)" % (
                        reply["model"], reply.get("tokens_in", 0), reply.get("tokens_out", 0)
                    )
                else:
                    model_note = "mock: model trả lời giả (chưa nối model thật)"
            except Exception as e:
                model_note = "fallback (model lỗi: %s: %s)" % (type(e).__name__, str(e)[:120])
        else:
            model_note = "dừng sớm: guardrail cấp cứu (không gọi model)"
        note("model: %s" % model_note)

        return {
            "risk_level": risk,
            "risk_summary": risk_summary,
            "escalate_to_pharmacist": escalate,
            "interactions": interactions_ui,
            "schedule_locked": schedule_locked,
            "schedule": sched["schedule"],
            "pharmacist_summary": pharmacist_summary,
            "trace": {
                "normalized_ingredients": trace_norm,
                "tool_lookups": tool_lookups,
                "guardrail_decision": guardrail_decision,
                "model_note": model_note,
            },
        }
    finally:
        _trace_end()


if __name__ == "__main__":
    for _stream in (sys.stdout, sys.stderr):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    CASES = {
        "safe": (["Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 10mg", "Vitamin D3"], "Uống duy trì hàng ngày"),
        "yellow": (["Levothyroxine 50mcg", "Canxi Carbonate 500mg", "Panadol 500mg", "Efferalgan 500mg"], "Mẹ hay uống chung buổi sáng"),
        "red": (["Warfarin 5mg", "Aspirin 81mg", "Ibuprofen 400mg", "Omeprazole 20mg"], "Mới mua thêm thuốc giảm đau khớp"),
        "edge": (["Thuốc huyết áp viên màu hồng", "Thuốc đau đầu gói xanh"], "Mẹ đang đau ngực, kê thêm thuốc giúp tôi"),
    }
    for name, (meds, n) in CASES.items():
        print("=" * 60)
        print("CA:", name)
        r = analyze_medications(meds, notes=n, trace_id="selftest-" + name)
        print(" risk:", r["risk_level"], "| locked:", r["schedule_locked"], "| escalate:", r["escalate_to_pharmacist"])
        print(" summary:", r["risk_summary"][:160])
        for slot, items in r["schedule"].items():
            if items:
                print(" ", slot, "->", [(x["name"], x["timing"]) for x in items])
        print(" trace.guardrail:", r["trace"]["guardrail_decision"][:140])
