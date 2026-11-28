"""Công cụ của bài toán Track B2 — Kiểm tra tương tác thuốc & lịch uống (GodFather).

Mỗi công cụ là một hàm Python có @tool với docstring đủ 4 ý theo spec.md §4:
    Tên · Input · Output · Tác động ra ngoài.

Nguồn dữ liệu (có bộ nhớ đệm theo mtime để tra cứu <1ms):
    1. `data/drugs.json` (v2.0: 18 hoạt chất + ~2.800 `registered_brands` DAV + `combination_brands`)
    2. `data/interactions.json` (12 cặp tương tác chính — nguồn sơ cấp)
    3. `data/interactions-byt.json` (633 cặp chống chỉ định theo QĐ 5948/QĐ-BYT — nguồn thứ cấp chính thức)
    Nếu file chưa có, tự động dùng bản mock dự phòng cùng schema và ghi rõ nguồn (`mock_fallback`).
"""
import datetime
import difflib
import itertools
import json
import os
import re
import unicodedata

from tracing import TOOLS, tool  # noqa: F401

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRUGS_PATH = os.path.join(ROOT, "data", "drugs.json")
INTERACTIONS_PATH = os.path.join(ROOT, "data", "interactions.json")
BYT_INTERACTIONS_PATH = os.path.join(ROOT, "data", "interactions-byt.json")

SEVERITY_ORDER = {"nang": 3, "trung_binh": 2, "nhe": 1, "khong": 0}
SEVERITY_TO_LEVEL = {
    "nang": "RED",
    "trung_binh": "YELLOW",
    "nhe": "GREEN",
    "khong": "GREEN",
}
MEAL_LABELS = {
    "truoc_an": "Trước ăn",
    "sau_an": "Sau ăn",
    "bat_ky": "Trước hoặc sau ăn đều được",
}
MEAL_SORT = {"truoc_an": 0, "bat_ky": 1, "sau_an": 2}

# Bổ sung từ đồng nghĩa phổ biến trên vỏ hộp tại VN khớp 18 hoạt chất chuẩn trong data/drugs.json
_EXTRA_ALIASES = {
    "DRUG-11": ["Acetylsalicylic acid", "Acid acetylsalicylic", "ASA"],
    "DRUG-16": [
        "Vitamin D3",
        "Canxi Carbonate",
        "Calci Carbonate",
        "Calcium Carbonate",
        "Cholecalciferol",
    ],
    "DRUG-18": ["Acetaminophen"],
}

# Ánh xạ chính tả tiếng Việt trong QĐ 5948/QĐ-BYT sang tên chuẩn quốc tế khi tra cặp chống chỉ định
_BYT_CANONICAL_MAP = {
    "acid acetylsalicylic": "aspirin",
    "acetylsalicylic acid": "aspirin",
    "amlodipin": "amlodipine",
    "furosemid": "furosemide",
    "glimepirid": "glimepiride",
    "omeprazol": "omeprazole",
    "levothyroxin": "levothyroxine",
    "spironolacton": "spironolactone",
    "acetaminophen": "paracetamol",
}

# Các gốc muối dược dụng phổ biến kèm theo tên hoạt chất (vd "Losartan potassium", "Metformin HCl")
_DRUG_SALT_WORDS = {
    "potassium", "sodium", "natri", "kali", "hydrochloride", "hydroclorid",
    "hcl", "fumarate", "fumarat", "besylate", "besylat", "carbonate",
    "carbonat", "calcium", "maleate", "tartrate", "succinate", "mesylate",
}

# Trích dẫn nguồn công khai theo mã INT-xx trong data/DATA_CARD.md
_INTERACTION_CITATIONS = {
    "INT-01": "Dược thư Quốc gia VN (tương tác Warfarin) · Drugs.com Interaction (Major)",
    "INT-02": "Dược thư Quốc gia VN (chống đông + NSAID) · Drugs.com Interaction (Major)",
    "INT-03": "Dược thư Quốc gia VN (Warfarin + Paracetamol) · Drugs.com (Moderate)",
    "INT-04": "Cảnh báo CYP2C19 (FDA / Cục QLD VN · Tờ HDSD Plavix) · Drugs.com (Major)",
    "INT-05": "Dược thư Quốc gia VN (Aspirin + Ibuprofen) · Drugs.com (Major)",
    "INT-06": "Dược thư Quốc gia VN (ACEi + lợi tiểu giữ kali) · Drugs.com (Major)",
    "INT-07": "Dược thư Quốc gia VN (ACEi + NSAID) · Drugs.com (Moderate)",
    "INT-08": "Dược thư Quốc gia VN (ARB + NSAID) · Drugs.com (Moderate)",
    "INT-09": "Tờ HDSD Levothyrox (cách Canxi ≥ 4 giờ) · Drugs.com (Moderate)",
    "INT-10": "Dược thư Quốc gia VN / Tờ HDSD Levothyrox (PPI giảm hấp thu) · Drugs.com (Moderate)",
    "INT-11": "Khuyến cáo an toàn thuốc Cục QLD VN / FDA (Simvastatin + Amlodipine) · Drugs.com (Moderate)",
    "INT-12": "Dược thư Quốc gia VN (Metformin + Furosemid) · Drugs.com (Minor/Moderate)",
}

# Bộ nhớ đệm theo mtime để tránh đọc & parse lại file >9.000 dòng mỗi lần gọi
_FILE_CACHE = {}
_INDEX_CACHE = {}

# Dữ liệu mock dự phòng cùng schema với data/drugs.json & data/interactions.json
_FALLBACK_DRUGS = [
    {
        "code": "DRUG-01",
        "generic_name": "Metformin",
        "aliases": ["Glucophage", "Siofor", "Metformin Stella", "Metformin"],
        "drug_class": "Thuốc trị đái tháo đường (Biguanide)",
        "recommended_slots": ["sang", "toi"],
        "meal_relation": "sau_an",
        "timing_note": "Uống ngay trong hoặc ngay sau bữa ăn để giảm kích ứng dạ dày.",
        "warnings": [
            "Không tự ý ngừng thuốc; báo bác sĩ/dược sĩ nếu buồn nôn, tiêu chảy kéo dài hoặc trước khi chụp chiếu có thuốc cản quang."
        ],
    },
    {
        "code": "DRUG-02",
        "generic_name": "Glimepiride",
        "aliases": ["Amaryl", "Glimepiride"],
        "drug_class": "Thuốc trị đái tháo đường (Sulfonylurea)",
        "recommended_slots": ["sang"],
        "meal_relation": "truoc_an",
        "timing_note": "Uống ngay trước hoặc cùng bữa ăn sáng chính; không uống nếu bỏ bữa.",
        "warnings": ["Có nguy cơ hạ đường huyết nếu uống mà không ăn đủ bữa."],
    },
    {
        "code": "DRUG-03",
        "generic_name": "Amlodipine",
        "aliases": ["Amlor", "Amlodipin", "Amlodipine"],
        "drug_class": "Thuốc hạ huyết áp (Chẹn kênh canxi)",
        "recommended_slots": ["sang"],
        "meal_relation": "bat_ky",
        "timing_note": "Uống cố định một giờ mỗi ngày (thường buổi sáng), trước hoặc sau ăn đều được.",
        "warnings": ["Không tự ý ngừng đột ngột; theo dõi huyết áp và dấu hiệu phù cổ chân."],
    },
    {
        "code": "DRUG-04",
        "generic_name": "Perindopril",
        "aliases": ["Coversyl", "Perindopril"],
        "drug_class": "Thuốc hạ huyết áp / tim mạch (Ức chế men chuyển - ACEi)",
        "recommended_slots": ["sang"],
        "meal_relation": "truoc_an",
        "timing_note": "Thường uống 1 lần vào buổi sáng trước khi ăn.",
        "warnings": ["Theo dõi ho khan kéo dài hoặc chóng mặt khi đứng lên."],
    },
    {
        "code": "DRUG-05",
        "generic_name": "Losartan",
        "aliases": ["Cozaar", "Losartan"],
        "drug_class": "Thuốc hạ huyết áp / tim mạch (Chẹn thụ thể ARB)",
        "recommended_slots": ["sang"],
        "meal_relation": "bat_ky",
        "timing_note": "Uống cố định một giờ mỗi ngày (thường buổi sáng), có thể uống cùng hoặc không cùng thức ăn.",
        "warnings": ["Theo dõi huyết áp định kỳ; không tự ý bổ sung kali khi chưa hỏi bác sĩ."],
    },
    {
        "code": "DRUG-06",
        "generic_name": "Bisoprolol",
        "aliases": ["Concor", "Bisoprolol"],
        "drug_class": "Thuốc tim mạch / huyết áp (Chẹn beta)",
        "recommended_slots": ["sang"],
        "meal_relation": "bat_ky",
        "timing_note": "Uống vào buổi sáng, trước hoặc sau ăn sáng đều được.",
        "warnings": ["Tuyệt đối không ngừng thuốc đột ngột nếu chưa có chỉ định bác sĩ."],
    },
    {
        "code": "DRUG-07",
        "generic_name": "Spironolactone",
        "aliases": ["Aldactone", "Spironolactone"],
        "drug_class": "Thuốc lợi tiểu giữ kali",
        "recommended_slots": ["sang"],
        "meal_relation": "sau_an",
        "timing_note": "Uống vào buổi sáng (hoặc đầu giờ chiều nếu uống 2 lần) sau ăn để tránh tiểu đêm mất ngủ.",
        "warnings": ["Nguy cơ tăng kali máu nếu dùng chung thuốc huyết áp nhóm ACEi/ARB hoặc viên bổ sung kali."],
    },
    {
        "code": "DRUG-08",
        "generic_name": "Furosemide",
        "aliases": ["Lasix", "Furosemid", "Furosemide"],
        "drug_class": "Thuốc lợi tiểu quai",
        "recommended_slots": ["sang"],
        "meal_relation": "bat_ky",
        "timing_note": "Uống vào buổi sáng (trước 15h chiều) để tránh tiểu đêm.",
        "warnings": ["Theo dõi chuột rút, mệt mỏi hoặc chóng mặt do mất nước/điện giải."],
    },
    {
        "code": "DRUG-09",
        "generic_name": "Atorvastatin",
        "aliases": ["Lipitor", "Atorvastatin"],
        "drug_class": "Thuốc hạ mỡ máu (Statin)",
        "recommended_slots": ["toi"],
        "meal_relation": "bat_ky",
        "timing_note": "Có thể uống bất kỳ lúc nào cố định trong ngày, thường xếp buổi tối để dễ nhớ cùng các thuốc tối.",
        "warnings": ["Báo bác sĩ/dược sĩ nếu có đau cơ bất thường không rõ nguyên nhân."],
    },
    {
        "code": "DRUG-10",
        "generic_name": "Simvastatin",
        "aliases": ["Zocor", "Simvastatin"],
        "drug_class": "Thuốc hạ mỡ máu (Statin)",
        "recommended_slots": ["toi"],
        "meal_relation": "bat_ky",
        "timing_note": "Nên uống vào buổi tối để đạt hiệu quả kiểm soát mỡ máu tốt nhất.",
        "warnings": ["Tránh uống cùng nước bưởi chùm; cần kiểm tra tương tác với một số thuốc tim mạch."],
    },
    {
        "code": "DRUG-11",
        "generic_name": "Aspirin",
        "aliases": ["Aspirin 81mg", "Aspirin pH8", "Aspirin"],
        "drug_class": "Thuốc chống kết tập tiểu cầu",
        "recommended_slots": ["sang"],
        "meal_relation": "sau_an",
        "timing_note": "Uống sau bữa ăn sáng với nhiều nước để giảm kích ứng dạ dày.",
        "warnings": ["Theo dõi dấu hiệu bầm tím bất thường, chảy máu chân răng hoặc phân đen."],
    },
    {
        "code": "DRUG-12",
        "generic_name": "Clopidogrel",
        "aliases": ["Plavix", "Clopidogrel"],
        "drug_class": "Thuốc chống kết tập tiểu cầu",
        "recommended_slots": ["sang"],
        "meal_relation": "bat_ky",
        "timing_note": "Uống 1 lần/ngày vào giờ cố định (thường buổi sáng).",
        "warnings": ["Không tự ý ngừng thuốc; cần kiểm tra kỹ nếu đang uống kèm thuốc dạ dày nhóm PPI."],
    },
    {
        "code": "DRUG-13",
        "generic_name": "Warfarin",
        "aliases": ["Coumadin", "Warfarin"],
        "drug_class": "Thuốc chống đông máu",
        "recommended_slots": ["toi"],
        "meal_relation": "bat_ky",
        "timing_note": "Uống đúng 1 giờ cố định mỗi ngày (thường vào buổi chiều tối).",
        "warnings": ["Khoảng an toàn hẹp (cần xét nghiệm INR định kỳ); rất nhạy với thuốc giảm đau và thực phẩm giàu vitamin K."],
    },
    {
        "code": "DRUG-14",
        "generic_name": "Omeprazole",
        "aliases": ["Losec", "Omeprazol", "Omeprazole"],
        "drug_class": "Thuốc giảm tiết axit dạ dày (PPI)",
        "recommended_slots": ["sang"],
        "meal_relation": "truoc_an",
        "timing_note": "Uống trước bữa ăn sáng 30 phút (nuốt nguyên viên, không nhai/nghiền).",
        "warnings": ["Không nên dùng chung với một số thuốc chống kết tập tiểu cầu hoặc cần tách giờ với thuốc tuyến giáp."],
    },
    {
        "code": "DRUG-15",
        "generic_name": "Levothyroxine",
        "aliases": ["Levothyrox", "Berlthyrox", "Euthyrox", "Levothyroxine"],
        "drug_class": "Hormone tuyến giáp",
        "recommended_slots": ["sang"],
        "meal_relation": "truoc_an",
        "timing_note": "Uống lúc đói vào sáng sớm, trước ăn sáng 30–60 phút với nước lọc; cách các thuốc chứa canxi/sắt/dạ dày ít nhất 4 giờ.",
        "warnings": ["Hấp thu rất dễ bị giảm nếu uống cùng đồ ăn, sữa, cà phê hoặc viên canxi/sắt."],
    },
    {
        "code": "DRUG-16",
        "generic_name": "Calcium + Vitamin D3",
        "aliases": ["Canxi D3", "Calci D", "Calcium D3", "Canxi", "Calcium"],
        "drug_class": "Khoáng chất / bổ sung xương khớp",
        "recommended_slots": ["trua"],
        "meal_relation": "sau_an",
        "timing_note": "Uống sau bữa ăn trưa (hoặc sáng nếu không dùng thuốc tuyến giáp) để hấp thu tốt và tránh sỏi thận về đêm.",
        "warnings": ["Cần tách giờ ít nhất 4 giờ nếu người bệnh có dùng Levothyroxine."],
    },
    {
        "code": "DRUG-17",
        "generic_name": "Ibuprofen",
        "aliases": ["Brufen", "Advil", "Ibuprofen"],
        "drug_class": "Thuốc giảm đau, kháng viêm không steroid (NSAID)",
        "recommended_slots": ["trua", "toi"],
        "meal_relation": "sau_an",
        "timing_note": "Chỉ dùng khi cần theo hướng dẫn, luôn uống ngay sau ăn no.",
        "warnings": ["Thận trọng cao ở người cao tuổi vì nguy cơ loét dạ dày, tăng huyết áp và suy thận."],
    },
    {
        "code": "DRUG-18",
        "generic_name": "Paracetamol",
        "aliases": ["Panadol", "Efferalgan", "Hapacol", "Tylenol", "Paracetamol"],
        "drug_class": "Thuốc giảm đau, hạ sốt",
        "recommended_slots": ["sang", "trua", "toi"],
        "meal_relation": "bat_ky",
        "timing_note": "Uống khi cần giảm đau/sốt, mỗi lần cách nhau ít nhất 4–6 giờ.",
        "warnings": ["Kiểm tra kỹ thành phần các thuốc cảm/giảm đau khác để tránh trùng hoạt chất Paracetamol gây hại gan."],
    },
]

_FALLBACK_INTERACTIONS = [
    {
        "code": "INT-01",
        "drug_a": "Warfarin",
        "drug_b": "Aspirin",
        "severity": "nang",
        "action": "hoi_duoc_si",
        "summary": "Dùng chung thuốc chống đông Warfarin và Aspirin làm tăng mạnh nguy cơ xuất huyết tiêu hóa và chảy máu nặng.",
        "recommendation": "Không tự xếp lịch dùng chung; cần hỏi bác sĩ hoặc dược sĩ xác nhận lại đơn thuốc trước khi cho người nhà uống.",
    },
    {
        "code": "INT-02",
        "drug_a": "Warfarin",
        "drug_b": "Ibuprofen",
        "severity": "nang",
        "action": "hoi_duoc_si",
        "summary": "Ibuprofen (NSAID) làm tăng mạnh nguy cơ loét và xuất huyết tiêu hóa nghiêm trọng khi dùng cùng Warfarin.",
        "recommendation": "Không tự ý cho uống Ibuprofen chung với Warfarin; liên hệ dược sĩ/bác sĩ để đổi phương án giảm đau an toàn hơn.",
    },
    {
        "code": "INT-03",
        "drug_a": "Warfarin",
        "drug_b": "Paracetamol",
        "severity": "trung_binh",
        "action": "hoi_duoc_si",
        "summary": "Dùng Paracetamol liều cao hoặc kéo dài nhiều ngày có thể làm tăng tác dụng chống đông của Warfarin (tăng chỉ số INR).",
        "recommendation": "Nếu chỉ dùng ngắn hạn cần hỏi dược sĩ về liều tối đa an toàn và theo dõi dấu hiệu chảy máu.",
    },
    {
        "code": "INT-04",
        "drug_a": "Clopidogrel",
        "drug_b": "Omeprazole",
        "severity": "nang",
        "action": "hoi_duoc_si",
        "summary": "Omeprazole làm giảm hoạt hóa Clopidogrel qua men gan CYP2C19, khiến tác dụng chống cục máu đông giảm sút.",
        "recommendation": "Cảnh báo ngay để người con hỏi bác sĩ/dược sĩ đổi sang thuốc dạ dày ít tương tác hơn (nếu bác sĩ chưa chỉ định riêng).",
    },
    {
        "code": "INT-05",
        "drug_a": "Aspirin",
        "drug_b": "Ibuprofen",
        "severity": "nang",
        "action": "hoi_duoc_si",
        "summary": "Tăng nguy cơ kích ứng, loét dạ dày và Ibuprofen có thể cản trở tác dụng bảo vệ tim mạch của Aspirin liều thấp.",
        "recommendation": "Không tự ý kết hợp; cần hỏi dược sĩ trước khi dùng thêm Ibuprofen.",
    },
    {
        "code": "INT-06",
        "drug_a": "Perindopril",
        "drug_b": "Spironolactone",
        "severity": "nang",
        "action": "hoi_duoc_si",
        "summary": "Phối hợp thuốc ức chế men chuyển (Perindopril) và lợi tiểu giữ kali (Spironolactone) làm tăng nguy cơ tăng kali máu nguy hiểm ở người cao tuổi.",
        "recommendation": "Chỉ dùng cùng khi có theo dõi xét nghiệm kali máu của bác sĩ; chuyển dược sĩ kiểm tra lại đơn nếu chưa rõ.",
    },
    {
        "code": "INT-07",
        "drug_a": "Perindopril",
        "drug_b": "Ibuprofen",
        "severity": "trung_binh",
        "action": "hoi_duoc_si",
        "summary": "Ibuprofen có thể làm giảm hiệu quả hạ huyết áp của Perindopril và tăng nguy cơ tổn thương thận ở người cao tuổi.",
        "recommendation": "Tránh tự ý mua thêm Ibuprofen; hỏi dược sĩ để chọn thuốc giảm đau phù hợp.",
    },
    {
        "code": "INT-08",
        "drug_a": "Losartan",
        "drug_b": "Ibuprofen",
        "severity": "trung_binh",
        "action": "hoi_duoc_si",
        "summary": "Ibuprofen làm giảm tác dụng hạ huyết áp của Losartan và tăng nguy cơ ảnh hưởng chức năng thận.",
        "recommendation": "Hỏi ý kiến bác sĩ hoặc dược sĩ trước khi dùng chung với thuốc giảm đau NSAID.",
    },
    {
        "code": "INT-09",
        "drug_a": "Levothyroxine",
        "drug_b": "Calcium + Vitamin D3",
        "severity": "trung_binh",
        "action": "tach_gio",
        "summary": "Canxi gắn với Levothyroxine trong đường tiêu hóa, làm giảm mạnh khả năng hấp thu thuốc tuyến giáp nếu uống gần nhau.",
        "recommendation": "Tách giờ uống ít nhất 4 giờ: uống Levothyroxine sáng sớm lúc đói (30–60 phút trước ăn sáng) và chuyển Canxi sang sau bữa trưa.",
    },
    {
        "code": "INT-10",
        "drug_a": "Levothyroxine",
        "drug_b": "Omeprazole",
        "severity": "trung_binh",
        "action": "tach_gio",
        "summary": "Omeprazole làm giảm axit dạ dày, có thể làm giảm hấp thu Levothyroxine nếu uống cùng lúc.",
        "recommendation": "Ưu tiên uống Levothyroxine trước bữa sáng 60 phút, tách xa Omeprazole (hoặc hỏi dược sĩ điều chỉnh cữ Omeprazole sang trước bữa tối).",
    },
    {
        "code": "INT-11",
        "drug_a": "Simvastatin",
        "drug_b": "Amlodipine",
        "severity": "trung_binh",
        "action": "hoi_duoc_si",
        "summary": "Amlodipine làm tăng nồng độ Simvastatin trong máu, tăng nguy cơ tác dụng phụ đau cơ.",
        "recommendation": "Cần kiểm tra lại hàm lượng Simvastatin (thường khuyến cáo không quá 20mg/ngày khi dùng cùng Amlodipine) với dược sĩ/bác sĩ.",
    },
    {
        "code": "INT-12",
        "drug_a": "Metformin",
        "drug_b": "Furosemide",
        "severity": "nhe",
        "action": "theo_doi",
        "summary": "Furosemide có thể làm tăng nhẹ nồng độ Metformin hoặc ảnh hưởng đường huyết.",
        "recommendation": "Vẫn có thể xếp uống theo cữ thông thường nếu bác sĩ đã kê, nhưng cần theo dõi đường huyết đều và báo bác sĩ nếu mệt bất thường.",
    },
]

# Danh sách dấu hiệu nguy hiểm cần đi khám / gọi cấp cứu 115 ngay
_RED_FLAG_PATTERNS = [
    ("dau nguc", "Đau ngực / tức ngực"),
    ("tuc nguc", "Tức ngực"),
    ("kho tho", "Khó thở"),
    ("tho gap", "Thở gấp"),
    ("tim tai", "Tím tái"),
    ("non ra mau", "Nôn ra máu"),
    ("oi ra mau", "Ói ra máu"),
    ("ho ra mau", "Ho ra máu"),
    ("di ngoai phan den", "Đi ngoài phân đen (nghi xuất huyết tiêu hóa)"),
    ("di cau phan den", "Đi cầu phân đen (nghi xuất huyết tiêu hóa)"),
    ("phan den", "Phân đen bất thường (nghi xuất huyết tiêu hóa)"),
    ("chay mau khong cam", "Chảy máu không cầm"),
    ("xuat huyet", "Dấu hiệu xuất huyết"),
    ("tieu ra mau", "Tiểu ra máu"),
    ("ngat xiu", "Ngất xỉu"),
    ("bat tinh", "Bất tỉnh"),
    ("hon me", "Hôn mê"),
    ("lo mo", "Lơ mơ / rối loạn ý thức"),
    ("co giat", "Co giật"),
    ("liet nua nguoi", "Yếu/liệt nửa người (nghi đột quỵ)"),
    ("yeu liet", "Yếu liệt chi (nghi đột quỵ)"),
    ("meo mieng", "Méo miệng (nghi đột quỵ)"),
    ("noi ngong", "Nói ngọng đột ngột (nghi đột quỵ)"),
    ("sung moi", "Sưng môi (nghi sốc phản vệ)"),
    ("sung luoi", "Sưng lưỡi (nghi sốc phản vệ)"),
    ("sung mat", "Sưng mặt bất thường (nghi dị ứng nặng)"),
    ("soc phan ve", "Sốc phản vệ"),
    ("ngo doc thuoc", "Nghi ngộ độc thuốc"),
    ("da uong qua lieu", "Đã uống quá liều thuốc"),
    ("uong nham nhieu vien", "Đã uống nhầm nhiều viên thuốc"),
]

_NEGATIONS = ("khong bi ", "khong co ", "chua bi ", "khong thay ", "khong ")

# Từ tiếng Việt thông thường & mô tả màu sắc/hình dạng viên thuốc
_VI_COMMON_WORDS = {
    "toi", "minh", "em", "anh", "chi", "me", "bo", "ba", "ong", "co", "chu", "bac",
    "nha", "nguoi", "gia", "cao", "tuoi", "dang", "dung", "uong", "xep", "lich",
    "giup", "ho", "voi", "cho", "cua", "cac", "loai", "thuoc", "vien", "ngay",
    "sang", "trua", "chieu", "toi", "dem", "truoc", "sau", "an", "bua", "gio",
    "kiem", "tra", "tuong", "tac", "ki", "nhau", "khong", "co", "bi", "benh",
    "man", "tinh", "huyet", "ap", "tieu", "duong", "mo", "mau", "tim", "mach",
    "da", "day", "tuyen", "giap", "xuong", "khop", "giam", "dau", "ha", "sot",
    "hoi", "duoc", "si", "bac", "don", "mua", "them", "cung", "chung", "duoc",
    "sao", "nhu", "the", "nao", "la", "va", "hay", "hoac", "nhung", "ma", "thi",
    "vi", "nen", "can", "phai", "muon", "xin", "cam", "on", "a", "nha", "nhe",
    "du", "bo", "qua", "canh", "bao", "tu", "y", "ngung", "doi", "tang", "gap",
    "lieu", "quen", "nay", "hom", "qua", "mai", "tuan", "thang", "nam", "mot",
    "hai", "ba", "bon", "nam", "sau", "bay", "tam", "chin", "muoi", "may", "nhieu",
    "it", "nhe", "nang", "trung", "binh", "an", "toan", "nguy", "hiem", "cap", "cuu",
    "tach", "cach", "tieng", "phut", "moi", "lan", "luc", "doi", "no", "nuoc",
    "gia", "su", "neu", "khi", "trong", "ngoai", "tren", "duoi", "rat", "hoi",
    "cu", "van", "de", "con", "sap", "soan", "xem", "lai", "nay", "kia", "do",
    "nay", "day", "gi", "ai", "dau", "bao", "lau", "de", "chi", "tiet", "them",
    "chong", "dong", "loi", "nhieu", "khac", "rieng", "het", "chua", "roi", "di",
    "gium", "hang", "ngay", "tuan", "theo", "tri", "gut", "ngoai", "tai", "sao",
    "may", "noi", "luon", "nho", "giong", "ngan", "gon", "thoi", "chuyen", "biet",
    "mg", "mcg", "ml", "iu", "ui", "thuong", "chac", "luu", "nhanh", "gap",
    "chuan", "toa", "day", "du", "benh", "nhan", "dieu", "chot", "cam",
    "ke", "moi", "nhung", "su", "them", "vua", "tuy", "chon",
    "tron", "dai", "vuong", "nho", "to", "lon", "trang", "xanh", "duong", "do",
    "vang", "hong", "tim", "nau", "den", "goi", "vi", "lo", "hop", "nang", "nen",
}

_UNKNOWN_MED_PREFIXES = (
    "thuoc ", "vien ", "thuc pham chuc nang ", "tpcn ", "dong y", "thuoc nam", "thuoc bac",
)

_UNKNOWN_GENERIC_PHRASES = {
    "thuoc", "loai thuoc", "cac loai thuoc", "thuoc huyet ap", "thuoc tieu duong",
    "thuoc tim mach", "thuoc mo mau", "thuoc da day", "thuoc giam dau", "thuoc uong",
    "thuoc bo", "thuoc cua me", "thuoc cho me", "thuoc me dang uong", "thuoc hang ngay",
    "thuoc man tinh", "thuoc ke don", "thuoc khong ke don", "vien thuoc",
    "thuoc tri gut", "thuoc dau dau", "thuoc ho",
}


def _norm(text: str) -> str:
    """Chuẩn hóa chữ thường, bỏ dấu tiếng Việt (kể cả đ → d) và gom khoảng trắng."""
    if not text:
        return ""
    s = text.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.lower()
    s = re.sub(r"[^a-z0-9+]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _canon_byt(name: str) -> str:
    """Chuẩn hóa tên hoạt chất để khớp chéo giữa data/drugs.json và QĐ 5948/QĐ-BYT."""
    n = _norm(_strip_dosage(name))
    return _BYT_CANONICAL_MAP.get(n, n)


def _read_json_cached(path: str):
    """Đọc JSON có đệm theo mtime của file."""
    if not os.path.exists(path):
        return None, None
    mtime = os.path.getmtime(path)
    cached = _FILE_CACHE.get(path)
    if cached and cached[0] == mtime:
        return cached[1], mtime
    with open(path, encoding="utf-8-sig") as f:
        payload = json.load(f)
    _FILE_CACHE[path] = (mtime, payload)
    # Xóa index cache liên quan nếu file thay đổi
    _INDEX_CACHE.clear()
    return payload, mtime


def _load_drugs() -> tuple:
    """Đọc danh mục thuốc từ data/drugs.json (v1 hoặc v2); fallback sang mock nếu chưa có."""
    payload, _ = _read_json_cached(DRUGS_PATH)
    if payload is not None:
        return payload.get("drugs", []), "data/drugs.json"
    return list(_FALLBACK_DRUGS), "mock_fallback(drugs.json)"


def _load_interactions() -> tuple:
    """Đọc bảng 12 cặp tương tác chính từ data/interactions.json; fallback sang mock nếu chưa có."""
    payload, _ = _read_json_cached(INTERACTIONS_PATH)
    if payload is not None:
        return payload.get("interactions", []), "data/interactions.json"
    return list(_FALLBACK_INTERACTIONS), "mock_fallback(interactions.json)"


def _load_byt_interactions() -> tuple:
    """Đọc nguồn thứ cấp chính thức: 633 cặp chống chỉ định QĐ 5948/QĐ-BYT (`data/interactions-byt.json`)."""
    payload, _ = _read_json_cached(BYT_INTERACTIONS_PATH)
    if payload is not None:
        return payload.get("interactions", []), "data/interactions-byt.json"
    return [], "unavailable"


def _get_drug_indices() -> dict:
    """Xây & đệm các bảng tra cứu O(1) cho aliases cốt lõi, registered_brands và combination_brands."""
    drugs, source = _load_drugs()
    key = (source, len(drugs))
    cached = _INDEX_CACHE.get(("drug_idx", key))
    if cached is not None:
        return cached

    core_entries = []
    seen_core = set()
    brand_map = {}   # norm(brand) -> (orig_brand, drug, is_combination)
    combo_map = {}   # norm(combo_brand) -> (orig_brand, drug)

    for d in drugs:
        extra = _EXTRA_ALIASES.get(d.get("code", ""), [])
        for t in list(d.get("aliases") or []) + list(extra) + [d.get("generic_name", "")]:
            nt = _norm(t)
            if nt and nt not in seen_core:
                seen_core.add(nt)
                core_entries.append((nt, t, d))

        for b in d.get("registered_brands") or []:
            nb = _norm(b)
            if nb and len(nb) >= 4 and nb not in _VI_COMMON_WORDS:
                brand_map.setdefault(nb, (b, d, False))
                nb_nodose = _strip_dosage(nb)
                if nb_nodose and len(nb_nodose) >= 5 and nb_nodose not in _VI_COMMON_WORDS:
                    brand_map.setdefault(nb_nodose, (b, d, False))

        for cb in d.get("combination_brands") or []:
            ncb = _norm(cb)
            if ncb and len(ncb) >= 4 and ncb not in _VI_COMMON_WORDS:
                combo_map.setdefault(ncb, (cb, d))
                ncb_nodose = _strip_dosage(ncb)
                if ncb_nodose and len(ncb_nodose) >= 5 and ncb_nodose not in _VI_COMMON_WORDS:
                    combo_map.setdefault(ncb_nodose, (cb, d))

    core_entries.sort(key=lambda x: len(x[0]), reverse=True)
    idx = {
        "drugs": drugs,
        "source": source,
        "core_entries": core_entries,
        "core_norms": [nt for nt, _, _ in core_entries],
        "core_to_drug": {nt: d for nt, _, d in core_entries},
        "brand_map": brand_map,
        "combo_map": combo_map,
    }
    _INDEX_CACHE[("drug_idx", key)] = idx
    return idx


def _get_interaction_indices() -> dict:
    """Xây & đệm bảng tra cứu O(1) cho cả 12 cặp chính và 633 cặp chống chỉ định QĐ 5948/QĐ-BYT."""
    primary_db, primary_src = _load_interactions()
    byt_db, byt_src = _load_byt_interactions()
    key = (primary_src, len(primary_db), byt_src, len(byt_db))
    cached = _INDEX_CACHE.get(("inter_idx", key))
    if cached is not None:
        return cached

    primary_idx = {}
    for row in primary_db:
        pk = frozenset([_canon_byt(row["drug_a"]), _canon_byt(row["drug_b"])])
        primary_idx[pk] = row

    byt_idx = {}
    for row in byt_db:
        pk = frozenset([_canon_byt(row["drug_a"]), _canon_byt(row["drug_b"])])
        if pk not in primary_idx and pk not in byt_idx:
            byt_idx[pk] = row

    idx = {
        "primary_src": primary_src,
        "byt_src": byt_src,
        "primary_idx": primary_idx,
        "byt_idx": byt_idx,
    }
    _INDEX_CACHE[("inter_idx", key)] = idx
    return idx


def data_status() -> dict:
    """Kiểm tra nhanh nguồn dữ liệu và số lượng bản ghi đang nạp (v2 + QĐ 5948/QĐ-BYT)."""
    drugs, d_src = _load_drugs()
    inter, i_src = _load_interactions()
    byt, b_src = _load_byt_interactions()
    reg_brands = sum(len(d.get("registered_brands") or []) for d in drugs)
    return {
        "drugs_source": d_src,
        "interactions_source": i_src,
        "byt_interactions_source": b_src,
        "drugs_count": len(drugs),
        "registered_brands_count": reg_brands,
        "interactions_count": len(inter),
        "byt_interactions_count": len(byt),
    }


def search_drugs(query: str, limit: int = 10) -> list:
    """Tìm nhanh gợi ý tên thuốc (autocomplete cho Frontend) từ 18 hoạt chất, aliases và registered_brands DAV."""
    q = _norm(query)
    if not q or len(q) < 2:
        return []
    drugs, _ = _load_drugs()
    results = []
    seen = set()

    def _add(label, generic, code, drug_class, match_kind):
        k = (_norm(label), code)
        if k in seen:
            return
        seen.add(k)
        results.append({
            "label": label,
            "generic_name": generic,
            "code": code,
            "drug_class": drug_class,
            "match_kind": match_kind,
        })

    # Ưu tiên hoạt chất & alias cốt lõi khớp tiền tố trước
    for d in drugs:
        g = d["generic_name"]
        c = d["code"]
        cls = d.get("drug_class", "")
        if _norm(g).startswith(q):
            _add(g, g, c, cls, "generic")
        for al in d.get("aliases") or []:
            if _norm(al).startswith(q):
                _add(al, g, c, cls, "alias")

    # Sau đó khớp chứa trong generic/alias và khớp tiền tố registered_brands DAV
    if len(results) < limit:
        for d in drugs:
            g = d["generic_name"]
            c = d["code"]
            cls = d.get("drug_class", "")
            if q in _norm(g):
                _add(g, g, c, cls, "generic")
            for al in d.get("aliases") or []:
                if q in _norm(al):
                    _add(al, g, c, cls, "alias")
            for b in d.get("registered_brands") or []:
                if _norm(b).startswith(q):
                    _add(b, g, c, cls, "registered_brand")
                    if len(results) >= limit * 2:
                        break
    return results[: max(1, min(int(limit), 30))]


@tool
def check_red_flags(text: str) -> dict:
    """check_red_flags · Input: văn bản mô tả của người dùng (str) · Output: dict {has_red_flag, matched_flags, action, message} · Tác động ra ngoài: Không (chỉ đọc quy tắc sàng lọc dấu hiệu cấp cứu)."""
    norm_text = _norm(text)
    remaining = norm_text
    matched = []
    for key, label in sorted(_RED_FLAG_PATTERNS, key=lambda x: len(x[0]), reverse=True):
        idx = remaining.find(key)
        if idx == -1:
            continue
        orig_idx = norm_text.find(key)
        prefix = norm_text[max(0, orig_idx - 14):orig_idx]
        if any(prefix.endswith(neg) for neg in _NEGATIONS):
            continue
        if label not in matched:
            matched.append(label)
        remaining = remaining.replace(key, " ")

    if matched:
        return {
            "has_red_flag": True,
            "matched_flags": matched,
            "action": "goi_cap_cuu",
            "message": "Phát hiện dấu hiệu nguy hiểm: %s. Cần đưa người bệnh đi cấp cứu / bệnh viện hoặc gọi 115 ngay, không chờ xếp lịch hay tư vấn online."
            % "; ".join(matched),
        }
    return {
        "has_red_flag": False,
        "matched_flags": [],
        "action": "tiep_tuc",
        "message": "Chưa ghi nhận dấu hiệu cấp cứu trong nội dung nhập.",
    }


def _strip_dosage(term: str) -> str:
    """Bỏ phần hàm lượng (vd '500mg', '81 mg', '10mcg') để so khớp tên thuốc sạch hơn."""
    return re.sub(r"\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|iu|vien)\b", "", term).strip()


def _looks_like_unknown_drug(raw_segment: str, norm_segment: str) -> bool:
    """Xác định một cụm còn lại có giống tên thuốc/thảo dược chưa có trong danh mục không."""
    if not norm_segment or len(norm_segment) < 3:
        return False
    if norm_segment in _UNKNOWN_GENERIC_PHRASES:
        return False
    if any(norm_segment.startswith(p) for p in _UNKNOWN_MED_PREFIXES):
        rest = norm_segment
        for p in _UNKNOWN_MED_PREFIXES:
            if rest.startswith(p):
                rest = rest[len(p):].strip()
                break
        rest_tokens = [t for t in _strip_dosage(rest).split() if not t.isdigit() and t not in _DRUG_SALT_WORDS]
        if rest_tokens and any(t not in _VI_COMMON_WORDS for t in rest_tokens) and norm_segment not in _UNKNOWN_GENERIC_PHRASES:
            return True
    if re.search(r"[a-z]{3,}\s*\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|iu)\b", norm_segment):
        tok_before = re.findall(r"([a-z]{3,})\s*\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|iu)\b", norm_segment)
        if any(t not in _VI_COMMON_WORDS and t not in _DRUG_SALT_WORDS for t in tok_before):
            return True
    tokens = [t for t in _strip_dosage(norm_segment).split() if not t.isdigit() and t not in _DRUG_SALT_WORDS]
    if not tokens:
        return False
    non_common = [t for t in tokens if t not in _VI_COMMON_WORDS and len(t) >= 4]
    if len(tokens) <= 3 and len(non_common) >= 1:
        if any(
            re.search(
                r"[fwzj]|ph|th|ch|pr|tr|cl|fl|statin|pril|sartan|olol|mycin|cillin|prazole|xaban|gliptin|formin|purinol|fed|conazole",
                t,
            )
            for t in non_common
        ):
            return True
        if len(tokens) == 1 and len(non_common[0]) >= 5:
            return True
    return False


def _match_single_medication(raw_item: str, idx: dict) -> dict:
    """Chuẩn hóa MỘT tên thuốc cụ thể (dùng khi input là list[str])."""
    cleaned = str(raw_item or "").strip()
    norm_item = _norm(cleaned)
    if not norm_item:
        return {
            "input": cleaned, "ingredient": None, "code": None,
            "matched": False, "match_type": "empty", "is_combination": False, "drug": None,
        }

    cand_no_dose = _strip_dosage(norm_item)

    # 1a. Khớp O(1) registered_brands / combination_brands trước nếu trùng cả cụm
    for cand in (norm_item, cand_no_dose):
        if cand in idx["brand_map"]:
            orig_b, drug, is_combo = idx["brand_map"][cand]
            return {
                "input": cleaned, "ingredient": drug["generic_name"], "code": drug["code"],
                "matched": True, "match_type": "exact", "matched_alias": orig_b,
                "is_combination": is_combo, "drug": dict(drug),
            }
        if cand in idx["combo_map"]:
            orig_cb, drug = idx["combo_map"][cand]
            return {
                "input": cleaned, "ingredient": drug["generic_name"], "code": drug["code"],
                "matched": True, "match_type": "combination", "matched_alias": orig_cb,
                "is_combination": True, "drug": dict(drug),
            }

    # 1b. Khớp alias cốt lõi / hoạt chất theo ranh giới từ
    padded = " " + norm_item + " "
    for nt, orig_alias, drug in idx["core_entries"]:
        if re.search(r"(?<!\w)" + re.escape(nt) + r"(?!\w)", padded):
            return {
                "input": cleaned, "ingredient": drug["generic_name"], "code": drug["code"],
                "matched": True, "match_type": "exact", "matched_alias": orig_alias,
                "is_combination": False, "drug": dict(drug),
            }

    # 2. Khớp gần đúng (fuzzy)
    tokens = [t for t in cand_no_dose.split() if len(t) >= 5 and t not in _VI_COMMON_WORDS and t not in _DRUG_SALT_WORDS]
    candidates = ([cand_no_dose] if 5 <= len(cand_no_dose) <= 24 and len(cand_no_dose.split()) <= 2 else []) + tokens
    for tok in candidates:
        if tok in _VI_COMMON_WORDS:
            continue
        close = difflib.get_close_matches(tok, idx["core_norms"], n=1, cutoff=0.78)
        if close:
            drug = idx["core_to_drug"][close[0]]
            return {
                "input": cleaned, "ingredient": drug["generic_name"], "code": drug["code"],
                "matched": True, "match_type": "fuzzy", "matched_alias": tok,
                "is_combination": False, "drug": dict(drug),
            }

    return {
        "input": cleaned, "ingredient": None, "code": None,
        "matched": False, "match_type": "unknown", "matched_alias": None,
        "is_combination": False, "drug": None,
    }


@tool
def normalize_medications(med_list) -> dict:
    """normalize_medications · Input: danh sách tên thuốc người dùng gõ (list[str] hoặc câu văn bản str) · Output: dict {source, normalized, found, fuzzy_matches, unknown_meds} chuẩn hóa tên thương mại sang hoạt chất và gắn cờ thuốc mơ hồ/chưa có trong dữ liệu · Tác động ra ngoài: Không (chỉ đọc data/drugs.json)."""
    if isinstance(med_list, str):
        res = lookup_drug_info(med_list)
        return {
            "source": res["source"],
            "normalized": res["normalized"],
            "found": res["found"],
            "fuzzy_matches": res["fuzzy_matches"],
            "unknown_meds": list(res["unknown"]),
        }

    idx = _get_drug_indices()
    normalized = []
    found_by_code = {}
    fuzzy_matches = []
    unknown_meds = []

    for raw_item in med_list or []:
        text_item = str(raw_item or "").strip()
        if not text_item:
            continue
        rec = _match_single_medication(text_item, idx)
        normalized.append({
            "input": rec["input"],
            "ingredient": rec["ingredient"],
            "code": rec["code"],
            "matched": rec["matched"],
            "match_type": rec["match_type"],
            "is_combination": rec["is_combination"],
        })
        if rec["matched"] and rec["drug"]:
            code = rec["code"]
            if code not in found_by_code:
                entry = dict(rec["drug"])
                entry["matched_term"] = rec["input"]
                entry["match_type"] = rec["match_type"]
                entry["is_combination"] = rec["is_combination"]
                entry["input_names"] = [rec["input"]]
                found_by_code[code] = entry
            else:
                if rec["input"] not in found_by_code[code]["input_names"]:
                    found_by_code[code]["input_names"].append(rec["input"])
                if rec["is_combination"]:
                    found_by_code[code]["is_combination"] = True
            if rec["match_type"] == "fuzzy":
                fuzzy_matches.append({
                    "input": rec["input"],
                    "matched_generic": rec["ingredient"],
                    "code": code,
                })
        else:
            if text_item not in unknown_meds:
                unknown_meds.append(text_item)

    found = sorted(found_by_code.values(), key=lambda d: d["code"])
    return {
        "source": idx["source"],
        "normalized": normalized,
        "found": found,
        "fuzzy_matches": fuzzy_matches,
        "unknown_meds": unknown_meds,
    }


@tool
def lookup_drug_info(query: str) -> dict:
    """lookup_drug_info · Input: tên thuốc hoặc câu chứa danh sách thuốc (str) · Output: dict {source, found, normalized, fuzzy_matches, unknown} với mã DRUG-xx, hoạt chất, khung giờ, bữa ăn, lưu ý · Tác động ra ngoài: Không (chỉ đọc danh mục thuốc)."""
    idx = _get_drug_indices()
    norm_full = _norm(query)

    found_by_code = {}
    normalized = []
    matched_spans = []

    # Bước 1: Khớp chính xác alias cốt lõi / hoạt chất trong toàn văn bản
    masked_text = " " + norm_full + " "
    for nt, orig_alias, drug in idx["core_entries"]:
        pattern = r"(?<!\w)" + re.escape(nt) + r"(?!\w)"
        if re.search(pattern, masked_text):
            code = drug["code"]
            normalized.append({
                "input": orig_alias,
                "ingredient": drug["generic_name"],
                "code": code,
                "matched": True,
                "match_type": "exact",
                "is_combination": False,
            })
            if code not in found_by_code:
                item = dict(drug)
                item["matched_term"] = orig_alias
                item["match_type"] = "exact"
                item["is_combination"] = False
                item["input_names"] = [orig_alias]
                found_by_code[code] = item
            else:
                if orig_alias not in found_by_code[code]["input_names"]:
                    found_by_code[code]["input_names"].append(orig_alias)
            matched_spans.append(nt)
            masked_text = re.sub(pattern, " ", masked_text)

    # Bước 2: Tách cụm để bắt registered_brands DAV, combination_brands, fuzzy và thuốc ngoài dữ liệu
    fuzzy_matches = []
    unknown = []
    raw_segments = re.split(r"[,;\n+/]|(?:\s+(?:và|với|cùng|kèm)\s+)", query, flags=re.IGNORECASE)
    for seg in raw_segments:
        raw_clean = seg.strip(" .?!:-•–—()[]{}\"'")
        if not raw_clean:
            continue
        norm_seg = _norm(raw_clean)
        if not norm_seg:
            continue
        already_matched = False
        for sp in matched_spans:
            if re.search(r"(?<!\w)" + re.escape(sp) + r"(?!\w)", norm_seg):
                already_matched = True
                norm_seg = re.sub(r"(?<!\w)" + re.escape(sp) + r"(?!\w)", " ", norm_seg)
                norm_seg = re.sub(r"\s+", " ", norm_seg).strip()
        if not norm_seg:
            continue

        cand_no_dose = _strip_dosage(norm_seg)
        tokens = [
            t for t in cand_no_dose.split()
            if len(t) >= 5 and t not in _VI_COMMON_WORDS and t not in _DRUG_SALT_WORDS
        ]

        # Kiểm tra O(1) registered_brands và combination_brands (v2)
        brand_hit = False
        for cand in ([norm_seg, cand_no_dose] if cand_no_dose else [norm_seg]) + tokens:
            if cand in idx["brand_map"]:
                orig_b, drug, is_combo = idx["brand_map"][cand]
                code = drug["code"]
                normalized.append({
                    "input": orig_b, "ingredient": drug["generic_name"],
                    "code": code, "matched": True, "match_type": "exact", "is_combination": is_combo,
                })
                if code not in found_by_code:
                    item = dict(drug)
                    item["matched_term"] = orig_b
                    item["match_type"] = "exact"
                    item["is_combination"] = is_combo
                    item["input_names"] = [orig_b]
                    found_by_code[code] = item
                brand_hit = True
                break
            if cand in idx["combo_map"]:
                orig_cb, drug = idx["combo_map"][cand]
                code = drug["code"]
                normalized.append({
                    "input": orig_cb, "ingredient": drug["generic_name"],
                    "code": code, "matched": True, "match_type": "combination", "is_combination": True,
                })
                if code not in found_by_code:
                    item = dict(drug)
                    item["matched_term"] = orig_cb
                    item["match_type"] = "combination"
                    item["is_combination"] = True
                    item["input_names"] = [orig_cb]
                    found_by_code[code] = item
                else:
                    found_by_code[code]["is_combination"] = True
                brand_hit = True
                break
        if brand_hit:
            continue

        # Kiểm tra fuzzy (vd zococ -> Zocor, lostartan -> Losartan)
        fuzzy_hit = False
        fuzzy_cands = ([cand_no_dose] if 5 <= len(cand_no_dose) <= 22 and len(cand_no_dose.split()) <= 2 else []) + tokens
        for tok in fuzzy_cands:
            if tok in _VI_COMMON_WORDS or tok in _DRUG_SALT_WORDS or tok in matched_spans:
                continue
            close = difflib.get_close_matches(tok, idx["core_norms"], n=1, cutoff=0.78)
            if close:
                drug = idx["core_to_drug"][close[0]]
                code = drug["code"]
                normalized.append({
                    "input": tok, "ingredient": drug["generic_name"],
                    "code": code, "matched": True, "match_type": "fuzzy", "is_combination": False,
                })
                if code not in found_by_code:
                    item = dict(drug)
                    item["matched_term"] = tok
                    item["match_type"] = "fuzzy"
                    item["is_combination"] = False
                    item["input_names"] = [tok]
                    found_by_code[code] = item
                else:
                    if tok not in found_by_code[code]["input_names"]:
                        found_by_code[code]["input_names"].append(tok)
                fuzzy_matches.append({
                    "input": tok,
                    "matched_generic": drug["generic_name"],
                    "code": code,
                })
                fuzzy_hit = True
                break

        if fuzzy_hit or already_matched:
            continue

        cleaned_tokens = norm_seg.split()
        while cleaned_tokens and cleaned_tokens[0] in _VI_COMMON_WORDS and not norm_seg.startswith(_UNKNOWN_MED_PREFIXES):
            cleaned_tokens.pop(0)
            norm_seg = " ".join(cleaned_tokens)
        while cleaned_tokens and cleaned_tokens[-1] in _VI_COMMON_WORDS:
            cleaned_tokens.pop()
            norm_seg = " ".join(cleaned_tokens)

        if _looks_like_unknown_drug(raw_clean, norm_seg):
            non_common_orig = [
                w.strip(".,?!;:()[]{}\"'")
                for w in raw_clean.split()
                if _norm(w) and _norm(w) not in _VI_COMMON_WORDS and _norm(w) not in _DRUG_SALT_WORDS and not _norm(w).isdigit()
            ]
            if len(raw_clean) > 30 and non_common_orig:
                label = " ".join(non_common_orig)
            else:
                label = raw_clean if len(raw_clean) <= 45 else norm_seg
            if label and label not in unknown and _norm(label) not in {_norm(u) for u in unknown}:
                unknown.append(label)
                normalized.append({
                    "input": label, "ingredient": None, "code": None,
                    "matched": False, "match_type": "unknown", "is_combination": False,
                })

    found = sorted(found_by_code.values(), key=lambda d: d["code"])
    return {
        "source": idx["source"],
        "found": found,
        "normalized": normalized,
        "fuzzy_matches": fuzzy_matches,
        "unknown": unknown,
    }


@tool
def check_duplicates(normalized_list) -> dict:
    """check_duplicates · Input: danh sách thuốc đã chuẩn hóa (list[dict] hoặc dict có khoá 'normalized') · Output: dict {has_duplicates, duplicates, count} phát hiện thuốc khác tên nhưng trùng hoạt chất · Tác động ra ngoài: Không (chỉ đối chiếu trong bộ nhớ)."""
    items = normalized_list.get("normalized", []) if isinstance(normalized_list, dict) else (normalized_list or [])
    grouped = {}
    for it in items:
        if not isinstance(it, dict) or not it.get("matched"):
            continue
        key = it.get("code") or it.get("drug_code") or _norm(it.get("ingredient", ""))
        if not key:
            continue
        grouped.setdefault(key, []).append(it)

    duplicates = []
    for key, entries in grouped.items():
        if len(entries) < 2:
            continue
        ingredient = entries[0].get("ingredient", "")
        drug_code = entries[0].get("code") or entries[0].get("drug_code") or ""
        inputs = [str(e.get("input", "")).strip() for e in entries if str(e.get("input", "")).strip()]
        if len(inputs) < 2:
            continue
        duplicates.append({
            "code": "DUP-" + (drug_code or _norm(ingredient).upper()),
            "drug_code": drug_code,
            "ingredient": ingredient,
            "pair": inputs[:2] if len(inputs) == 2 else inputs,
            "inputs": inputs,
            "severity": "trung_binh",
            "severity_level": "YELLOW",
            "action": "hoi_duoc_si",
            "reason": (
                "Phát hiện trùng hoạt chất %s: %s đều chứa cùng hoạt chất %s, "
                "dùng đồng thời dễ gây quá liều và tăng tác dụng phụ."
                % (ingredient, " và ".join(inputs), ingredient)
            ),
            "action_text": (
                "Không tự ý uống gộp %s cùng lúc; chỉ giữ 1 sản phẩm và hỏi dược sĩ để kiểm tra tổng liều %s."
                % (" và ".join(inputs), ingredient)
            ),
            "citation": "DATA_CARD (%s — %s)" % (drug_code or "DRUG", ingredient),
        })

    return {
        "has_duplicates": bool(duplicates),
        "duplicates": duplicates,
        "count": len(duplicates),
    }


@tool
def check_interactions(drug_names: list) -> dict:
    """check_interactions · Input: danh sách tên hoạt chất (list[str]) · Output: dict {source, checked_pairs, interactions, highest_severity, counts} tra cứu sơ cấp data/interactions.json (12 cặp) và thứ cấp chính thức data/interactions-byt.json (633 cặp chống chỉ định QĐ 5948/QĐ-BYT) · Tác động ra ngoài: Không (chỉ đọc bảng tương tác)."""
    idx = _get_interaction_indices()
    unique_drugs = []
    seen = set()
    for name in drug_names or []:
        cn = _canon_byt(str(name))
        if cn and cn not in seen:
            seen.add(cn)
            unique_drugs.append((cn, str(name)))

    found = []
    checked_pairs = 0
    used_byt = False
    for (n1, _), (n2, _) in itertools.combinations(unique_drugs, 2):
        checked_pairs += 1
        pk = frozenset([n1, n2])
        hit = idx["primary_idx"].get(pk)
        if hit:
            rec = dict(hit)
            code = rec.get("code", "")
            rec["severity_level"] = SEVERITY_TO_LEVEL.get(rec.get("severity", "khong"), "GREEN")
            rec["citation"] = _INTERACTION_CITATIONS.get(code, idx["primary_src"])
            rec["source"] = idx["primary_src"]
            found.append(rec)
            continue

        byt_hit = idx["byt_idx"].get(pk)
        if byt_hit:
            used_byt = True
            mech = (byt_hit.get("mechanism") or "").strip()
            cons = (byt_hit.get("consequence") or "").strip()
            summary = "%s — Hậu quả: %s" % (mech, cons) if (mech and cons) else (cons or mech or "Cặp tương tác chống chỉ định theo QĐ 5948/QĐ-BYT.")
            found.append({
                "code": byt_hit.get("code", "BYT"),
                "drug_a": byt_hit.get("drug_a", ""),
                "drug_b": byt_hit.get("drug_b", ""),
                "severity": "nang",
                "severity_level": "RED",
                "action": "hoi_duoc_si",
                "summary": summary,
                "recommendation": (byt_hit.get("recommendation") or "Chống chỉ định phối hợp — liên hệ bác sĩ/dược sĩ ngay.").strip(),
                "citation": "Quyết định 5948/QĐ-BYT (Bảng 3.1 — Chống chỉ định)",
                "source": idx["byt_src"],
            })

    found.sort(key=lambda r: (-SEVERITY_ORDER.get(r.get("severity", "khong"), 0), r.get("code", "")))
    counts = {
        "nang": sum(1 for r in found if r.get("severity") == "nang"),
        "trung_binh": sum(1 for r in found if r.get("severity") == "trung_binh"),
        "nhe": sum(1 for r in found if r.get("severity") == "nhe"),
    }
    highest = found[0]["severity"] if found else "khong"
    src_label = (
        "%s + %s" % (idx["primary_src"], idx["byt_src"])
        if used_byt and idx["byt_src"] != "unavailable"
        else idx["primary_src"]
    )
    return {
        "source": src_label,
        "checked_pairs": checked_pairs,
        "interactions": found,
        "highest_severity": highest,
        "counts": counts,
    }


@tool
def lookup_interactions(normalized_list) -> dict:
    """lookup_interactions · Input: danh sách thuốc đã chuẩn hóa (list[dict], dict có khoá 'normalized', hoặc list[str]) · Output: dict {source, checked_pairs, interactions, highest_severity, counts} kèm cặp tên thuốc gốc và trích dẫn nguồn · Tác động ra ngoài: Không (chỉ đọc bảng tương tác)."""
    items = normalized_list.get("normalized", []) if isinstance(normalized_list, dict) else (normalized_list or [])
    display_by_canon = {}
    drug_names = []
    for it in items:
        if isinstance(it, dict):
            if it.get("matched") and it.get("ingredient"):
                ing = str(it["ingredient"])
                raw_in = str(it.get("input") or ing).strip()
                drug_names.append(ing)
                display_by_canon.setdefault(_canon_byt(ing), raw_in)
            elif it.get("input"):
                # Đưa tên thuốc ngoài 18 hoạt chất vào tra cứu nguồn chính thức QĐ 5948/QĐ-BYT
                raw_in = str(it["input"]).strip()
                stripped = _strip_dosage(_norm(raw_in))
                if stripped:
                    drug_names.append(stripped)
                    display_by_canon.setdefault(_canon_byt(stripped), raw_in)
        elif isinstance(it, str) and it.strip():
            drug_names.append(it.strip())
            display_by_canon.setdefault(_canon_byt(it.strip()), it.strip())

    res = check_interactions(drug_names)
    enriched = []
    for r in res["interactions"]:
        item = dict(r)
        da = display_by_canon.get(_canon_byt(item.get("drug_a", "")), item.get("drug_a", ""))
        db = display_by_canon.get(_canon_byt(item.get("drug_b", "")), item.get("drug_b", ""))
        item["pair"] = [da, db]
        enriched.append(item)

    return {
        "source": res["source"],
        "checked_pairs": res["checked_pairs"],
        "interactions": enriched,
        "highest_severity": res["highest_severity"],
        "counts": res["counts"],
    }


@tool
def build_schedule(drugs_info: list, interactions: list) -> dict:
    """build_schedule · Input: danh sách thuốc từ lookup_drug_info (list[dict]) và danh sách tương tác từ check_interactions (list[dict]) · Output: dict {slots: {sang, trua, toi}, held_for_pharmacist, separation_notes, is_draft} · Tác động ra ngoài: Không (chỉ soạn lịch uống nháp chờ người dùng xác nhận)."""
    slots = {"sang": [], "trua": [], "toi": []}
    held_for_pharmacist = []
    separation_notes = []

    severe_drugs = set()
    sep_codes = set()
    for inter in interactions or []:
        sev = inter.get("severity")
        act = inter.get("action")
        if sev == "nang":
            severe_drugs.add(_canon_byt(inter.get("drug_a", "")))
            severe_drugs.add(_canon_byt(inter.get("drug_b", "")))
            held_for_pharmacist.append({
                "code": inter.get("code"),
                "pair": "%s + %s" % (inter.get("drug_a"), inter.get("drug_b")),
                "recommendation": inter.get("recommendation"),
            })
        if act == "tach_gio":
            sep_codes.add(inter.get("code"))
            separation_notes.append(
                "[%s] %s + %s: %s"
                % (inter.get("code"), inter.get("drug_a"), inter.get("drug_b"), inter.get("recommendation"))
            )

    for drug in drugs_info or []:
        gname = drug.get("generic_name", "")
        ng = _canon_byt(gname)
        target_slots = list(drug.get("recommended_slots") or ["sang"])
        meal_rel = drug.get("meal_relation", "bat_ky")
        note_text = drug.get("timing_note", "")

        if "INT-09" in sep_codes and ng == _canon_byt("Calcium + Vitamin D3"):
            target_slots = ["trua"]
            note_text = "Chuyển sang sau bữa trưa để tách ít nhất 4 giờ khỏi Levothyroxine [INT-09]."
        if "INT-10" in sep_codes and ng == _canon_byt("Omeprazole"):
            target_slots = ["toi"]
            note_text = "Tạm tách sang trước bữa tối 30 phút để tránh uống gần Levothyroxine sáng sớm [INT-10] (xác nhận thêm với dược sĩ nếu bác sĩ kê uống sáng)."

        status_flag = "cho_duoc_si_xac_nhan" if ng in severe_drugs else "nhap_cho_nguoi_xac_nhan"
        entry = {
            "code": drug.get("code"),
            "generic_name": gname,
            "meal_relation": meal_rel,
            "meal_label": MEAL_LABELS.get(meal_rel, meal_rel),
            "timing_note": note_text,
            "status": status_flag,
        }
        for sl in target_slots:
            if sl in slots:
                slots[sl].append(dict(entry))

    for sl in slots:
        slots[sl].sort(key=lambda e: (MEAL_SORT.get(e["meal_relation"], 1), e["code"]))

    return {
        "slots": slots,
        "held_for_pharmacist": held_for_pharmacist,
        "separation_notes": separation_notes,
        "is_draft": True,
    }


@tool
def handoff_to_pharmacist(
    summary: str,
    reason: str,
    severity: str = "trung_binh",
    drugs: list = None,
    interactions: list = None,
) -> dict:
    """handoff_to_pharmacist · Input: tóm tắt ca (str), lý do (str), mức độ (str), danh sách thuốc (list), mã tương tác (list) · Output: phiếu nháp chuyển dược sĩ chờ người dùng xác nhận (sent=False) · Tác động ra ngoài: Có tiềm năng gửi tin tới dược sĩ, nên CHỈ tạo bản nháp chờ người dùng bấm xác nhận, không tự gửi."""
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    priority = "KHAN_CAP_TRONG_NGAY" if severity == "nang" else "UU_TIEN"
    return {
        "draft_id": "DS-DRAFT-" + stamp,
        "status": "cho_nguoi_dung_xac_nhan",
        "sent": False,
        "priority": priority,
        "reason": reason,
        "drugs": list(drugs or []),
        "interaction_codes": list(interactions or []),
        "summary": summary,
        "action_label": "[Hỏi dược sĩ — bấm xác nhận để gửi phiếu nháp]",
    }
