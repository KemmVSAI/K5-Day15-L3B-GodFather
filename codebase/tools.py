"""Công cụ của bài toán Track B2 — Kiểm tra tương tác thuốc & lịch uống (GodFather).

Mỗi công cụ là một hàm Python có @tool với docstring đủ 4 ý theo spec.md §4:
    Tên · Input · Output · Tác động ra ngoài.

Nguồn dữ liệu:
    Ưu tiên đọc trực tiếp từ `data/drugs.json` và `data/interactions.json` (schema v1.0 do nhóm chốt).
    Nếu hai file chưa được merge vào nhánh hiện tại, tự động dùng bản dữ liệu mock dự phòng cùng schema
    và ghi rõ nguồn dữ liệu (`mock_fallback`) để không giả làm thật.
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

SEVERITY_ORDER = {"nang": 3, "trung_binh": 2, "nhe": 1, "khong": 0}
MEAL_LABELS = {
    "truoc_an": "Trước ăn",
    "sau_an": "Sau ăn",
    "bat_ky": "Trước hoặc sau ăn đều được",
}
MEAL_SORT = {"truoc_an": 0, "bat_ky": 1, "sau_an": 2}

# Dữ liệu mock dự phòng cùng schema v1.0 với data/drugs.json & data/interactions.json
# (chỉ kích hoạt khi nhánh hiện tại chưa có file trong data/)
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

# Từ tiếng Việt thông thường để tránh nhận nhầm câu hội thoại thành tên thuốc lạ
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
}

_UNKNOWN_MED_PREFIXES = (
    "thuoc ", "vien ", "thuc pham chuc nang ", "tpcn ", "dong y", "thuoc nam", "thuoc bac",
)

_UNKNOWN_GENERIC_PHRASES = {
    "thuoc", "loai thuoc", "cac loai thuoc", "thuoc huyet ap", "thuoc tieu duong",
    "thuoc tim mach", "thuoc mo mau", "thuoc da day", "thuoc giam dau", "thuoc uong",
    "thuoc bo", "thuoc cua me", "thuoc cho me", "thuoc me dang uong", "thuoc hang ngay",
    "thuoc man tinh", "thuoc ke don", "thuoc khong ke don", "vien thuoc",
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


def _load_drugs() -> tuple:
    """Đọc danh mục thuốc từ data/drugs.json; fallback sang dữ liệu mock cùng schema nếu file chưa có."""
    if os.path.exists(DRUGS_PATH):
        with open(DRUGS_PATH, encoding="utf-8-sig") as f:
            payload = json.load(f)
        return payload.get("drugs", []), "data/drugs.json"
    return list(_FALLBACK_DRUGS), "mock_fallback(drugs.json)"


def _load_interactions() -> tuple:
    """Đọc bảng tương tác từ data/interactions.json; fallback sang dữ liệu mock cùng schema nếu file chưa có."""
    if os.path.exists(INTERACTIONS_PATH):
        with open(INTERACTIONS_PATH, encoding="utf-8-sig") as f:
            payload = json.load(f)
        return payload.get("interactions", []), "data/interactions.json"
    return list(_FALLBACK_INTERACTIONS), "mock_fallback(interactions.json)"


def data_status() -> dict:
    """Kiểm tra nhanh nguồn dữ liệu đang chạy thật từ data/ hay dùng fallback mock."""
    _, d_src = _load_drugs()
    _, i_src = _load_interactions()
    return {"drugs_source": d_src, "interactions_source": i_src}


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
        if rest and rest not in _VI_COMMON_WORDS and norm_segment not in _UNKNOWN_GENERIC_PHRASES:
            return True
    # Cụm có đơn vị hàm lượng như "Xarelto 15mg", "Amoxicillin 500mg"
    if re.search(r"[a-z]{3,}\s*\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|ui|iu)\b", norm_segment):
        return True
    tokens = [t for t in _strip_dosage(norm_segment).split() if not t.isdigit()]
    if not tokens:
        return False
    non_common = [t for t in tokens if t not in _VI_COMMON_WORDS and len(t) >= 4]
    # Nếu là tên đơn/cặp ngắn gồm từ giống tên thuốc Latin/nước ngoài (không nằm trong từ điển Việt thông dụng)
    if len(tokens) <= 3 and len(non_common) >= 1:
        # Tránh câu mô tả bệnh hoặc hội thoại dài
        if any(re.search(r"[fwzj]|ph|th|ch|pr|tr|cl|fl|statin|pril|sartan|olol|mycin|cillin|prazole|xaban|gliptin|formin", t) for t in non_common):
            return True
        if len(tokens) == 1 and len(non_common[0]) >= 5:
            return True
    return False


@tool
def lookup_drug_info(query: str) -> dict:
    """lookup_drug_info · Input: tên thuốc hoặc câu chứa danh sách thuốc (str) · Output: dict {source, found, fuzzy_matches, unknown} với mã DRUG-xx, hoạt chất, khung giờ, bữa ăn, lưu ý · Tác động ra ngoài: Không (chỉ đọc danh mục thuốc)."""
    drugs, source = _load_drugs()
    norm_full = _norm(query)

    # Xây bảng ánh xạ alias đã chuẩn hóa -> drug (ưu tiên alias dài hơn khớp trước)
    alias_entries = []
    for d in drugs:
        terms = list(d.get("aliases") or []) + [d.get("generic_name", "")]
        seen_t = set()
        for t in terms:
            nt = _norm(t)
            if nt and nt not in seen_t:
                seen_t.add(nt)
                alias_entries.append((nt, t, d))
    alias_entries.sort(key=lambda x: len(x[0]), reverse=True)

    found_by_code = {}
    matched_spans = []

    # Bước 1: Khớp chính xác alias / hoạt chất trong toàn văn bản
    masked_text = " " + norm_full + " "
    for nt, orig_alias, drug in alias_entries:
        pattern = r"(?<!\w)" + re.escape(nt) + r"(?!\w)"
        if re.search(pattern, masked_text):
            code = drug["code"]
            if code not in found_by_code:
                item = dict(drug)
                item["matched_term"] = orig_alias
                item["match_type"] = "exact"
                found_by_code[code] = item
            matched_spans.append(nt)
            masked_text = re.sub(pattern, " ", masked_text)

    # Bước 2: Tách các cụm trong phần văn bản còn lại để bắt lỗi chính tả (fuzzy) và thuốc ngoài dữ liệu
    fuzzy_matches = []
    unknown = []
    all_alias_norms = [nt for nt, _, _ in alias_entries]
    alias_to_drug = {nt: d for nt, _, d in alias_entries}

    raw_segments = re.split(r"[,;\n+/]|(?:\s+(?:và|với|cùng|kèm)\s+)", query, flags=re.IGNORECASE)
    for seg in raw_segments:
        raw_clean = seg.strip(" .?!:-•–—()[]{}\"'")
        if not raw_clean:
            continue
        norm_seg = _norm(raw_clean)
        if not norm_seg:
            continue
        # Bỏ qua nếu cụm này đã chứa thuốc khớp chính xác ở Bước 1
        already_matched = False
        for sp in matched_spans:
            if re.search(r"(?<!\w)" + re.escape(sp) + r"(?!\w)", norm_seg):
                already_matched = True
                # Nếu trong cụm còn từ lạ kèm theo (vd "mẹ uống Metformin và Xarelto" chưa tách hết) thì bỏ phần đã khớp
                norm_seg = re.sub(r"(?<!\w)" + re.escape(sp) + r"(?!\w)", " ", norm_seg)
                norm_seg = re.sub(r"\s+", " ", norm_seg).strip()
        if not norm_seg:
            continue

        # Kiểm tra fuzzy từng từ đơn dài >= 5 ký tự hoặc cả cụm ngắn (để bắt lỗi chính tả như metfomin, warfarrin, amlodpin)
        cand_no_dose = _strip_dosage(norm_seg)
        tokens = [t for t in cand_no_dose.split() if len(t) >= 5 and t not in _VI_COMMON_WORDS]
        fuzzy_hit = False
        for tok in ([cand_no_dose] if 5 <= len(cand_no_dose) <= 22 and len(cand_no_dose.split()) <= 2 else []) + tokens:
            if tok in _VI_COMMON_WORDS or tok in matched_spans:
                continue
            close = difflib.get_close_matches(tok, all_alias_norms, n=1, cutoff=0.78)
            if close:
                best_alias = close[0]
                drug = alias_to_drug[best_alias]
                code = drug["code"]
                if code not in found_by_code:
                    item = dict(drug)
                    item["matched_term"] = tok
                    item["match_type"] = "fuzzy"
                    found_by_code[code] = item
                fuzzy_matches.append({
                    "input": tok,
                    "matched_generic": drug["generic_name"],
                    "code": code,
                })
                fuzzy_hit = True
                break

        if fuzzy_hit or already_matched:
            continue

        # Nếu không khớp exact và không khớp fuzzy, kiểm tra xem có phải thuốc ngoài danh mục không
        # Loại bỏ các từ dẫn chuyện phổ biến ở đầu cụm (vd "mẹ tôi đang uống Xarelto 15mg")
        cleaned_tokens = norm_seg.split()
        while cleaned_tokens and cleaned_tokens[0] in _VI_COMMON_WORDS and not norm_seg.startswith(_UNKNOWN_MED_PREFIXES):
            cleaned_tokens.pop(0)
            norm_seg = " ".join(cleaned_tokens)
        while cleaned_tokens and cleaned_tokens[-1] in _VI_COMMON_WORDS:
            cleaned_tokens.pop()
            norm_seg = " ".join(cleaned_tokens)

        if _looks_like_unknown_drug(raw_clean, norm_seg):
            label = raw_clean if len(raw_clean) <= 45 else norm_seg
            if label not in unknown and _norm(label) not in {_norm(u) for u in unknown}:
                unknown.append(label)

    found = sorted(found_by_code.values(), key=lambda d: d["code"])
    return {
        "source": source,
        "found": found,
        "fuzzy_matches": fuzzy_matches,
        "unknown": unknown,
    }


@tool
def check_interactions(drug_names: list) -> dict:
    """check_interactions · Input: danh sách tên hoạt chất generic_name (list[str]) · Output: dict {source, checked_pairs, interactions, highest_severity, counts} với mã INT-xx, mức độ và hướng xử trí · Tác động ra ngoài: Không (chỉ đọc bảng tương tác)."""
    interactions_db, source = _load_interactions()
    # Loại trùng, giữ thứ tự
    unique_drugs = []
    seen = set()
    for name in drug_names or []:
        nn = _norm(str(name))
        if nn and nn not in seen:
            seen.add(nn)
            unique_drugs.append((nn, str(name)))

    index = {}
    for row in interactions_db:
        pair_key = frozenset([_norm(row["drug_a"]), _norm(row["drug_b"])])
        index[pair_key] = row

    found = []
    checked_pairs = 0
    for (n1, _), (n2, _) in itertools.combinations(unique_drugs, 2):
        checked_pairs += 1
        hit = index.get(frozenset([n1, n2]))
        if hit:
            found.append(dict(hit))

    found.sort(key=lambda r: (-SEVERITY_ORDER.get(r.get("severity", "khong"), 0), r.get("code", "")))
    counts = {
        "nang": sum(1 for r in found if r.get("severity") == "nang"),
        "trung_binh": sum(1 for r in found if r.get("severity") == "trung_binh"),
        "nhe": sum(1 for r in found if r.get("severity") == "nhe"),
    }
    highest = found[0]["severity"] if found else "khong"
    return {
        "source": source,
        "checked_pairs": checked_pairs,
        "interactions": found,
        "highest_severity": highest,
        "counts": counts,
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
            severe_drugs.add(_norm(inter.get("drug_a", "")))
            severe_drugs.add(_norm(inter.get("drug_b", "")))
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
        ng = _norm(gname)
        target_slots = list(drug.get("recommended_slots") or ["sang"])
        meal_rel = drug.get("meal_relation", "bat_ky")
        note_text = drug.get("timing_note", "")

        # Áp quy tắc tách giờ từ bảng tương tác (INT-09, INT-10)
        if "INT-09" in sep_codes and ng == _norm("Calcium + Vitamin D3"):
            target_slots = ["trua"]
            note_text = "Chuyển sang sau bữa trưa để tách ít nhất 4 giờ khỏi Levothyroxine [INT-09]."
        if "INT-10" in sep_codes and ng == _norm("Omeprazole"):
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
