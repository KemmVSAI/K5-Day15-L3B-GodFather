# -*- coding: utf-8 -*-
"""Đếm review công khai App Store VN cho bằng chứng pain B2 — chạy lại được.

Nguồn: iTunes RSS API công khai (không cần key):
    https://itunes.apple.com/vn/rss/customerreviews/id=<APP_ID>/sortby=mostrecent/json
Lấy 50 review mới nhất mỗi app, gắn nhãn theo từ khoá, in bảng x/N (%).

Chạy: python evidence/count_reviews.py
"""
import json
import re
import time
import urllib.request

APPS = {
    "Long Châu iOS": 1586071844,
    "Pharmacity iOS": 1414835869,
    "MEDIGO iOS": 1476660376,
}
LABELS = {
    "tu_van_thuoc": r"tư vấn|dược sĩ|thuốc nào|uống thế nào|liều|khám|bác sĩ",
    "lich_uong": r"lịch|giờ uống|nhắc uống|quên uống|thứ tự",
    "tuong_tac": r"tương tác|kị nhau|xung đột|kết hợp",
    "gia_hang": r"giá|đắt|rẻ|khuyến mãi|ưu đãi",
    "giao_hang": r"giao|ship|đơn hàng|chậm|đặt",
    "app_ky_thuat": r"app|lỗi|đăng nhập|bảo trì|crash|chậm|update|cập nhật",
}


def fetch(app_id):
    url = "https://itunes.apple.com/vn/rss/customerreviews/id=%s/sortby=mostrecent/json" % app_id
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode("utf-8"))
    entries = d.get("feed", {}).get("entry", [])
    if isinstance(entries, dict):
        entries = [entries]
    out = []
    for e in entries:
        out.append({
            "rating": int(e.get("im:rating", {}).get("label", "0") or 0),
            "title": e.get("title", {}).get("label", ""),
            "text": e.get("content", {}).get("label", ""),
            "date": (e.get("updated", {}) or {}).get("label", "")[:10],
        })
    return out


def main():
    pool = []
    for name, aid in APPS.items():
        try:
            rs = fetch(aid)
            pool.extend([dict(r, app=name) for r in rs])
            print("%s: %d review" % (name, len(rs)))
            time.sleep(1)
        except Exception as e:
            print("%s: FAIL %s" % (name, e))

    n = len(pool)
    counts = {}
    for k, pat in LABELS.items():
        rx = re.compile(pat)
        c = sum(1 for r in pool if rx.search((r["title"] + " " + r["text"]).lower()))
        counts[k] = c
    caregiver = sum(1 for r in pool
                    if r["rating"] <= 3
                    and re.search(r"mẹ|bố|ông|bà|người thân|cha mẹ|con nhỏ|trẻ|người già", (r["title"] + " " + r["text"]).lower()))
    print("\nN =", n)
    for k, c in counts.items():
        print("%-14s %d/%d (%.0f%%)" % (k, c, n, 100 * c / n))
    print("le_3_sao_nguoi_than %d/%d (%.0f%%)" % (caregiver, n, 100 * caregiver / n))
    print("\nLưu ý: mẫu là review MỚI NHẤT — nghiêng người đang bực, không suy ra % cho toàn bộ người dùng.")


if __name__ == "__main__":
    main()
