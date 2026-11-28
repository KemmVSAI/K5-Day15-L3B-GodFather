# Tóm tắt mô phỏng simulate-1@20261128-122323

Do `python run.py simulate` sinh ra — không sửa tay. Chép bảng sang `cost/cost-estimate.md`.

| Persona | Số phiên mô phỏng | Lượt hỏi / phiên | Token vào / phiên | Token ra / phiên | Gọi model / phiên | Gọi công cụ / phiên |
|---|---:|---:|---:|---:|---:|---:|
| dung_it | 21 | 1 | 1114 | 1976 | 0.9 | 5.9 |
| dung_vua | 19 | 1 | 1291 | 2320 | 1.0 | 6.3 |
| dung_nhieu | 8 | 1 | 1194 | 1982 | 1.0 | 6.5 |

Tỉ lệ đạt dùng để tính: 20/22 (91%) — lượt run-4@20261128-112702

- Tỉ lệ đạt lấy từ lượt nhóm chọn: eval/run-4.csv (--rate-from).

| Model (giá) | Chi phí / phiên | Chi phí / task thành công | Chi phí / câu hỏi đạt | Chi phí / tháng — thấp (300 người) | Chi phí / tháng — cơ sở (700 người) | Chi phí / tháng — cao (1.000 người) | Chi phí / người / tháng (cơ sở) |
|---|---:|---:|---:|---:|---:|---:|---:|
| gpt-5-nano (vào 0.05 · ra 0.4 $/1M) | $0.00091 (≈ 24 ₫) | $0.00100 (≈ 26 ₫) | $0.00100 (≈ 26 ₫) | $0.7265 (≈ 18.888 ₫) | $1.70 (≈ 44.072 ₫) | $2.42 (≈ 62.960 ₫) | $0.0024 (≈ 63 ₫) |
| claude-haiku-5-5 (vào 0.1 · ra 0.5 $/1M) | $0.0012 (≈ 31 ₫) | $0.0013 (≈ 34 ₫) | $0.0013 (≈ 34 ₫) | $0.9444 (≈ 24.555 ₫) | $2.20 (≈ 57.295 ₫) | $3.15 (≈ 81.850 ₫) | $0.0031 (≈ 82 ₫) |

- Chi phí / task thành công = chi phí / phiên ÷ tỉ lệ đạt. Chi phí / câu hỏi đạt = chi phí / phiên ÷ số lượt hỏi trung bình mỗi phiên (1.0) ÷ tỉ lệ đạt — tỉ lệ đạt đo theo từng câu thử.
- Token đo trên model: nvidia/nemotron-3.5-lightning:free. Giá tính theo từng model trong bảng — model khác bộ tách token thì số token thật có thể lệch; ghi rõ "đo trên model X, tính giá model Y" trong cost/cost-estimate.md.
- Phiên lỗi (không tính vào trung bình): 2/50.
- Tỷ giá: 1 USD = 26.000 ₫ (Tỷ giá giả định làm tròn để dễ đọc, không phải tỷ giá cam kết.).
