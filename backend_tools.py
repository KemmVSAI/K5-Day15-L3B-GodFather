"""backend_tools.py — Phần 1 của Backend (theo tài liệu phân công 3 phần).

Chuẩn hóa & Tra cứu cho tầng API:
    normalize_medications(med_list)  → chuẩn hóa tên thuốc gõ tự do → hoạt chất chuẩn
    check_duplicates(normalized)     → phát hiện 2 tên khác nhau trùng hoạt chất
    lookup_interactions(norm_list)   → tra mọi cặp tương tác từ data chuẩn (kèm nguồn)

Nguyên tắc:
    - CHỈ ĐỌC data/drugs.json + data/interactions.json (tái dùng loader của codebase/tools.py).
    - Không bịa: thuốc không nhận diện được → gắn cờ trong unknown_meds, KHÔNG suy ra gì.
    - Cac ham doc tool (không @tool) để không làm nhiễu trace của khung eval — tầng api.py
      gọi chúng trực tiếp; luồng eval của khung vẫn đi qua codebase/agent.py như cũ.

Chạy độc lập (DoD): python backend_tools.py — tự chạy 4 ca mẫu (an toàn/vàng/đỏ/edge), không crash.
"""
import difflib
import os
import re
import sys
import unicodedata

_CODEBASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "codebase")
if _CODEBASE not in sys.path:
    sys.path.insert(0, _CODEBASE)

from tools import (  # noqa: E402
    _load_drugs,
    _load_interactions,
    _norm,
    _strip_dosage,
    check_interactions,
    data_status,
    lookup_drug_info,
)

# Mức tương tác trong data ("nang"/"trung_binh"/"nhe") → mức 3 màu mà Frontend hiện
SEVERITY_TO_COLOR = {"nang": "RED", "trung_binh": "YELLOW", "nhe": "YELLOW", "khong": "GREEN"}
COLOR_OF_HIGHEST = {"nang": "RED", "trung_binh": "YELLOW", "nhe": "YELLOW", "khong": "GREEN"}


def normalize_medications(med_list):
    """Chuẩn hóa danh sách tên thuốc người dùng gõ sang hoạt chất chuẩn.

    Input:  med_list — list[str] (vd ["Aspirin 81mg", "Warfarin 5mg"]) hoặc None.
    Output: dict {
        "normalized": [ {input, matched_term, ingredient (generic_name), drug_code,
                         matched (bool), match_type (exact|fuzzy), slots, meal_relation,
                         meal_label, timing_note, warnings} ]  # mỗi thuốc người dùng nhập một mục
        "ingredients": [str]            # danh sách hoạt chất duy nhất (đã dedupe), cho check_interactions
        "unknown_meds": [str]           # tên không nhận diện được trong data
        "fuzzy_matches": [ {input, matched_generic, code} ]
        "source": str                   # nguồn data (data/drugs.json hay mock_fallback)
    }
    Không tác động ra ngoài — chỉ đọc data.
    """
    drugs, source = _load_drugs()
    med_list = [str(m).strip() for m in (med_list or []) if str(m).strip()]
    if not med_list:
        return {
            "normalized": [], "ingredients": [], "unknown_meds": [],
            "fuzzy_matches": [], "source": source,
        }

    # Bảng ánh xạ brand/alias/generic đã chuẩn hóa → drug (từ data, KÈM registered_brands v2)
    alias_map = {}          # norm(brand/alias/generic) -> drug dict
    brand_norms = []        # để fuzzy match cả brand
    for d in drugs:
        terms = list(d.get("aliases") or []) + [d.get("generic_name", "")]
        for t in terms:
            nt = _norm(t)
            if nt:
                alias_map.setdefault(nt, d)
        for b in d.get("registered_brands", []):
            nb = _norm(b)
            if nb:
                if nb not in alias_map:
                    alias_map[nb] = d
                brand_norms.append(nb)

    MEAL_LABEL = {"truoc_an": "Trước ăn", "sau_an": "Sau ăn", "bat_ky": "Trước hoặc sau ăn"}

    normalized = []
    ingredients_seen = {}
    unknown_meds = []
    fuzzy_matches = []

    for raw in med_list:
        norm_q = _norm(raw)
        stripped = _strip_dosage(norm_q)
        drug = None
        match_type = None
        matched_term = None

        # 1) Khớp chính xác: cả cụm (đã bỏ hàm lượng) nằm trong bảng alias/brand/generic
        for cand in (stripped, norm_q):
            if cand in alias_map:
                drug = alias_map[cand]
                matched_term = cand
                match_type = "exact"
                break
        if drug is None:
            # 2) Chứa tên chuẩn: hoạt chất hoặc brand xuất hiện như một từ trong cụm
            for nt, d in alias_map.items():
                if re.search(r"(?<!\w)" + re.escape(nt) + r"(?!\w)", norm_q):
                    drug = d
                    matched_term = nt
                    match_type = "exact"
                    break
        if drug is None:
            # 3) Brand có khoảng trắng (vd 'concor 5mg' → 'concor'): cụm bắt đầu bằng brand chuẩn
            for nb in sorted(brand_norms, key=len, reverse=True):
                if norm_q.startswith(nb + " ") or norm_q == nb:
                    drug = alias_map[nb]
                    matched_term = nb
                    match_type = "exact"
                    break
        if drug is None:
            # 3b) Thành phần đơn của thuốc phối hợp (vd "Vitamin D3" → Calcium + Vitamin D3)
            for d in drugs:
                gname = d.get("generic_name", "")
                if "+" not in gname:
                    continue
                parts = [p.strip().lower() for p in gname.split("+")]
                for part in parts:
                    np = _norm(part)
                    if np and re.search(r"(?<!\w)" + re.escape(np) + r"(?!\w)", norm_q):
                        drug = d
                        matched_term = np
                        match_type = "exact"
                        break
                if drug is not None:
                    break
        if drug is None:
            # 4) Fuzzy: gõ sai chính tả (vd 'glimepride' → 'glimepiride')
            cands = [norm_q, stripped] + [t for t in stripped.split() if len(t) >= 5]
            for tok in cands:
                close = difflib.get_close_matches(tok, list(alias_map.keys()), n=1, cutoff=0.82)
                if close:
                    drug = alias_map[close[0]]
                    matched_term = tok
                    match_type = "fuzzy"
                    break

        if drug is not None:
            ing = drug["generic_name"]
            entry = {
                "input": raw,
                "matched_term": matched_term,
                "ingredient": ing,
                "drug_code": drug["code"],
                "matched": True,
                "match_type": match_type,
                "slots": list(drug.get("recommended_slots") or []),
                "meal_relation": drug.get("meal_relation", "bat_ky"),
                "meal_label": MEAL_LABEL.get(drug.get("meal_relation", "bat_ky"), "Trước hoặc sau ăn"),
                "timing_note": drug.get("timing_note", ""),
                "warnings": list(drug.get("warnings") or []),
            }
            normalized.append(entry)
            ingredients_seen.setdefault(ing, drug["code"])
            if match_type == "fuzzy":
                fuzzy_matches.append({"input": raw, "matched_generic": ing, "code": drug["code"]})
        else:
            # Không nhận diện được — KHÔNG suy ra gì (C2), chỉ gắn cờ
            unknown_meds.append(raw)
            normalized.append({
                "input": raw, "matched_term": None, "ingredient": None, "drug_code": None,
                "matched": False, "match_type": "unknown",
                "slots": [], "meal_relation": None, "meal_label": None,
                "timing_note": None, "warnings": [],
            })

    return {
        "normalized": normalized,
        "ingredients": sorted(ingredients_seen.keys()),
        "unknown_meds": unknown_meds,
        "fuzzy_matches": fuzzy_matches,
        "source": source,
    }


def check_duplicates(normalized):
    """Phát hiện 2 tên thuốc khác nhau nhưng trùng hoạt chất (vd Panadol + Efferalgan đều Paracetamol).

    Input:  normalized — kết quả của normalize_medications().
    Output: dict {
        "duplicates": [ {ingredient, drug_code, inputs: [tên người dùng nhập]} ]
        "count": int
    }
    Không tác động ra ngoài.
    """
    groups = {}
    for entry in normalized.get("normalized", []):
        if entry.get("matched") and entry.get("ingredient"):
            groups.setdefault(entry["ingredient"], []).append(entry["input"])
    duplicates = [
        {"ingredient": ing, "drug_code": code, "inputs": inputs}
        for ing, code, inputs in
        ((ing, g[0] and None, inputs) for ing, inputs in groups.items() for g in [inputs])
        if len(inputs) > 1
    ]
    # drug_code lookup đúng
    code_map = {}
    for entry in normalized.get("normalized", []):
        if entry.get("matched"):
            code_map[entry["ingredient"]] = entry["drug_code"]
    for d in duplicates:
        d["drug_code"] = code_map.get(d["ingredient"])
    duplicates.sort(key=lambda d: d["ingredient"])
    return {"duplicates": duplicates, "count": len(duplicates)}


def lookup_interactions(normalized):
    """Tra mọi cặp tương tác giữa các hoạt chất đã chuẩn hóa, kèm nguồn trích dẫn.

    Input:  normalized — kết quả của normalize_medications().
    Output: dict của check_interactions() (source, checked_pairs, interactions,
            highest_severity, counts) + "pairs_input": map (drugA, drugB) -> tên
            gốc người dùng nhập (để hiện cặp theo tên thuốc trên vỏ hộp).
    Không tác động ra ngoài.
    """
    ingredients = normalized.get("ingredients", [])
    inter = check_interactions(ingredients)
    # map generic -> tên gốc người dùng nhập (cặp hiển thị theo tên trên hộp)
    display = {}
    for entry in normalized.get("normalized", []):
        if entry.get("matched"):
            display.setdefault(entry["ingredient"], entry["input"])
    pairs_input = []
    for r in inter["interactions"]:
        pairs_input.append({
            "code": r["code"],
            "pair_ingredients": [r["drug_a"], r["drug_b"]],
            "pair_inputs": [display.get(r["drug_a"], r["drug_a"]), display.get(r["drug_b"], r["drug_b"])],
            "severity": r["severity"],
            "severity_color": SEVERITY_TO_COLOR.get(r["severity"], "YELLOW"),
            "summary": r.get("summary", ""),
            "recommendation": r.get("recommendation", ""),
            "source": inter.get("source", ""),
        })
    inter["pairs_input"] = pairs_input
    return inter


# ---------------------------------------------------------------------------
# Chạy độc lập (DoD Phần 1): 4 ca mẫu — không crash, không trả rỗng gây lỗi
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    for _stream in (sys.stdout, sys.stderr):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    CASES = {
        "An toàn": ["Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 10mg", "Vitamin D3"],
        "Vàng": ["Levothyroxine 50mcg", "Canxi Carbonate 500mg", "Panadol 500mg", "Efferalgan 500mg"],
        "Đỏ": ["Warfarin 5mg", "Aspirin 81mg", "Ibuprofen 400mg", "Omeprazole 20mg"],
        "Thuốc lạ": ["Thuốc huyết áp viên màu hồng", "Thuốc đau đầu gói xanh"],
    }
    for name, meds in CASES.items():
        print("=" * 60)
        print("CA:", name, "|", ", ".join(meds))
        norm = normalize_medications(meds)
        print(" ingredients:", norm["ingredients"])
        print(" unknown:", norm["unknown_meds"])
        print(" fuzzy:", norm["fuzzy_matches"])
        dup = check_duplicates(norm)
        print(" duplicates:", dup["duplicates"])
        inter = lookup_interactions(norm)
        print(" interactions:", [(p["code"], p["severity"], p["pair_ingredients"]) for p in inter["pairs_input"]])
        print(" highest:", inter["highest_severity"])
