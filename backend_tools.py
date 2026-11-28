"""backend_tools.py — Phần 1 của Backend (theo tài liệu phân công 3 phần).

Chuẩn hóa & Tra cứu cho tầng API:
    normalize_medications(med_list)  → chuẩn hóa tên thuốc gõ tự do (hỗ trợ 2.800+ registered_brands DAV & combination_brands)
    check_duplicates(normalized)     → phát hiện 2 tên khác nhau trùng hoạt chất
    lookup_interactions(norm_list)   → tra mọi cặp tương tác (12 cặp chính + 633 cặp chống chỉ định QĐ 5948/QĐ-BYT)

Chạy độc lập (DoD): python backend_tools.py — tự chạy 4 ca mẫu (an toàn/vàng/đỏ/edge), không crash.
"""
import difflib
import os
import re
import sys

_CODEBASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "codebase")
if _CODEBASE not in sys.path:
    sys.path.insert(0, _CODEBASE)

from tools import (  # noqa: E402
    _VI_COMMON_WORDS,
    _canon_byt,
    _get_drug_indices,
    _norm,
    _strip_dosage,
    check_interactions,
    data_status,
    search_drugs,
)

# Mức tương tác trong data ("nang"/"trung_binh"/"nhe") → mức 3 màu Frontend
SEVERITY_TO_COLOR = {"nang": "RED", "trung_binh": "YELLOW", "nhe": "YELLOW", "khong": "GREEN"}
COLOR_OF_HIGHEST = {"nang": "RED", "trung_binh": "YELLOW", "nhe": "YELLOW", "khong": "GREEN"}


def normalize_medications(med_list):
    """Chuẩn hóa danh sách tên thuốc người dùng gõ sang hoạt chất chuẩn (tận dụng index đã đệm từ tools.py).

    Input:  med_list — list[str] (vd ["Aspirin 81mg", "Warfarin 5mg"]) hoặc None.
    Output: dict {normalized, ingredients, unknown_meds, fuzzy_matches, combination_meds, source}.
    Không tác động ra ngoài — chỉ đọc data.
    """
    idx = _get_drug_indices()
    drugs = idx["drugs"]
    source = idx["source"]
    med_list = [str(m).strip() for m in (med_list or []) if str(m).strip()]
    if not med_list:
        return {
            "normalized": [], "ingredients": [], "unknown_meds": [],
            "fuzzy_matches": [], "combination_meds": [], "source": source,
        }

    MEAL_LABEL = {"truoc_an": "Trước ăn", "sau_an": "Sau ăn", "bat_ky": "Trước hoặc sau ăn"}

    normalized = []
    ingredients_seen = {}
    unknown_meds = []
    fuzzy_matches = []
    combination_meds = []

    for raw in med_list:
        norm_q = _norm(raw)
        stripped = _strip_dosage(norm_q)
        drug = None
        match_type = None
        matched_term = None
        is_combination = False

        # 1) Khớp O(1) registered_brands / combination_brands / core alias
        for cand in (norm_q, stripped):
            if cand in idx["core_to_drug"]:
                drug = idx["core_to_drug"][cand]
                matched_term = cand
                match_type = "exact"
                break
            if cand in idx["brand_map"]:
                orig_b, d, is_cb = idx["brand_map"][cand]
                drug = d
                matched_term = orig_b
                match_type = "exact"
                is_combination = is_cb
                break
            if cand in idx["combo_map"]:
                orig_cb, d = idx["combo_map"][cand]
                drug = d
                matched_term = orig_cb
                match_type = "combination"
                is_combination = True
                break

        # 2) Chứa alias cốt lõi theo ranh giới từ (vd "Canxi Carbonate 500mg" -> "canxi carbonate")
        if drug is None:
            for nt, orig_al, d in idx["core_entries"]:
                if re.search(r"(?<!\w)" + re.escape(nt) + r"(?!\w)", norm_q):
                    drug = d
                    matched_term = orig_al
                    match_type = "exact"
                    break

        # 3) Thành phần đơn của thuốc phối hợp trong generic_name (vd "Vitamin D3" -> "Calcium + Vitamin D3")
        if drug is None:
            for d in drugs:
                gname = d.get("generic_name", "")
                if "+" not in gname:
                    continue
                for part in gname.split("+"):
                    np = _norm(part)
                    if np and re.search(r"(?<!\w)" + re.escape(np) + r"(?!\w)", norm_q):
                        drug = d
                        matched_term = np
                        match_type = "exact"
                        break
                if drug is not None:
                    break

        # 4) Fuzzy: gõ sai chính tả nhẹ (vd 'glimepride' -> 'glimepiride', 'zococ' -> 'zocor')
        if drug is None:
            cands = [norm_q, stripped] + [
                t for t in stripped.split() if len(t) >= 5 and t not in _VI_COMMON_WORDS
            ]
            for tok in cands:
                if not tok or tok in _VI_COMMON_WORDS:
                    continue
                close = difflib.get_close_matches(tok, idx["core_norms"], n=1, cutoff=0.80)
                if close:
                    drug = idx["core_to_drug"][close[0]]
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
                "is_combination": is_combination,
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
            if is_combination:
                combination_meds.append({"input": raw, "matched_generic": ing, "code": drug["code"]})
        else:
            unknown_meds.append(raw)
            normalized.append({
                "input": raw, "matched_term": None, "ingredient": None, "drug_code": None,
                "matched": False, "match_type": "unknown", "is_combination": False,
                "slots": [], "meal_relation": None, "meal_label": None,
                "timing_note": None, "warnings": [],
            })

    return {
        "normalized": normalized,
        "ingredients": sorted(ingredients_seen.keys()),
        "unknown_meds": unknown_meds,
        "fuzzy_matches": fuzzy_matches,
        "combination_meds": combination_meds,
        "source": source,
    }


def check_duplicates(normalized):
    """Phát hiện 2 tên thuốc khác nhau nhưng trùng hoạt chất (vd Panadol + Efferalgan đều Paracetamol)."""
    groups = {}
    code_map = {}
    for entry in normalized.get("normalized", []):
        if entry.get("matched") and entry.get("ingredient"):
            ing = entry["ingredient"]
            groups.setdefault(ing, []).append(entry["input"])
            code_map[ing] = entry.get("drug_code")

    duplicates = [
        {"ingredient": ing, "drug_code": code_map.get(ing), "inputs": inputs}
        for ing, inputs in groups.items()
        if len(inputs) > 1
    ]
    duplicates.sort(key=lambda d: d["ingredient"])
    return {"duplicates": duplicates, "count": len(duplicates)}


def lookup_interactions(normalized):
    """Tra mọi cặp tương tác (12 cặp chính + 633 cặp chống chỉ định QĐ 5948/QĐ-BYT), kèm tên gốc và trích dẫn."""
    ingredients = list(normalized.get("ingredients", []))
    display = {}
    for entry in normalized.get("normalized", []):
        if entry.get("matched") and entry.get("ingredient"):
            display.setdefault(_canon_byt(entry["ingredient"]), entry["input"])
        elif entry.get("input"):
            # Cho phép tra nguồn chính thức QĐ 5948/QĐ-BYT cả với hoạt chất ngoài 18 thuốc (vd Clarithromycin)
            stripped = _strip_dosage(_norm(entry["input"]))
            if stripped:
                ingredients.append(stripped)
                display.setdefault(_canon_byt(stripped), entry["input"])

    inter = check_interactions(ingredients)
    pairs_input = []
    for r in inter["interactions"]:
        pairs_input.append({
            "code": r["code"],
            "pair_ingredients": [r["drug_a"], r["drug_b"]],
            "pair_inputs": [
                display.get(_canon_byt(r["drug_a"]), r["drug_a"]),
                display.get(_canon_byt(r["drug_b"]), r["drug_b"]),
            ],
            "severity": r["severity"],
            "severity_color": SEVERITY_TO_COLOR.get(r["severity"], "YELLOW"),
            "action": r.get("action", ""),
            "summary": r.get("summary", ""),
            "recommendation": r.get("recommendation", ""),
            "citation": r.get("citation", inter.get("source", "")),
            "source": r.get("source", inter.get("source", "")),
        })
    inter["pairs_input"] = pairs_input
    return inter


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
        "BYT 5948": ["Simvastatin 20mg", "Clarithromycin 500mg"],
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
        print(" interactions:", [(p["code"], p["severity"], p["pair_inputs"]) for p in inter["pairs_input"]])
        print(" highest:", inter["highest_severity"])
