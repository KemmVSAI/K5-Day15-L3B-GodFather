# Chi phí khi dùng thật

> Điền ở guide bước 4.2, nộp ở CP4 14:30 Thứ Bảy 28/11. Chấm ở rubric R6.
> Số **không điền tay**: điền `cost/personas.yaml` → `python run.py simulate --rate-from eval/run-4.csv` → chép bảng trong `cost/simulate-1-summary.md` vào đây.
> Lúc build dùng gói miễn phí vẫn tính theo **giá gói trả phí** — đây là chi phí cho lúc đưa vào dùng thật.

## 1. Đầu vào

- **Persona** (`cost/personas.yaml`): 3 kiểu — dung_it 50% (2 phiên/người/tháng) · dung_vua 30% (3 phiên) · dung_nhieu 20% (4 phiên). Nguồn: dung_nhieu lấy từ phỏng vấn P1 (người con sắp thuốc cho mẹ 3–4 lần/tháng — `evidence/interviews/P1.md`); dung_it, dung_vua *(tự ước tính)*.
- **Số người dùng thật** 3 kịch bản: thấp 300 · cơ sở 700 · cao 1.000. Nguồn: *(tự ước tính quy mô nhóm người dùng mục tiêu thử nghiệm — không dùng số 700 học viên của track A)*
- **Giá** 2 mức model (bảng BTC `further-reading/model-prices.md`, xem 25/11/2026): gpt-5-nano (vào $0.05 / ra $0.40 trên 1M token) · claude-haiku-5-5 (vào $0.10 / ra $0.50)
- **Tỉ lệ đạt** dùng để tính: **20/22 (91%)** — lượt `run-4` (run-4@20261128-112702, chọn bằng `--rate-from eval/run-4.csv`)
- Đo token trên model **nvidia/nemotron-3.5-lightning:free**, tính giá model gpt-5-nano và claude-haiku-5-5

## 2. Kết quả mô phỏng

Lượt mô phỏng: `cost/simulate-1.csv` · run ID `simulate-1@20261128-122323` · **50 phiên** · seed 42

*(bảng từ `cost/simulate-1-summary.md` — sinh tự động, không sửa tay)*

| Persona | Số phiên mô phỏng | Lượt hỏi / phiên | Token vào / phiên | Token ra / phiên | Gọi model / phiên | Gọi công cụ / phiên |
|---|---:|---:|---:|---:|---:|---:|
| dung_it | 21 | 1 | 1114 | 1976 | 0.9 | 5.9 |
| dung_vua | 19 | 1 | 1291 | 2320 | 1.0 | 6.3 |
| dung_nhieu | 8 | 1 | 1194 | 1982 | 1.0 | 6.5 |

Tỉ lệ đạt dùng để tính: 20/22 (91%) — lượt run-4@20261128-112702

| Model (giá) | Chi phí / phiên | Chi phí / task thành công | Chi phí / câu hỏi đạt | / tháng — thấp (300 người) | / tháng — cơ sở (700 người) | / tháng — cao (1.000 người) | / người / tháng (cơ sở) |
|---|---:|---:|---:|---:|---:|---:|---:|
| gpt-5-nano (vào 0.05 · ra 0.4 $/1M) — đo trên nemotron, tính giá nano | $0.00091 (≈ 24 ₫) | **$0.00100 (≈ 26 ₫)** | $0.00100 (≈ 26 ₫) | $0.73 (≈ 18.888 ₫) | $1.70 (≈ 44.072 ₫) | $2.42 (≈ 62.960 ₫) | $0.0024 (≈ 63 ₫) |
| claude-haiku-5-5 (vào 0.1 · ra 0.5 $/1M) — đo trên nemotron, tính giá haiku | $0.0012 (≈ 31 ₫) | **$0.0013 (≈ 34 ₫)** | $0.0013 (≈ 34 ₫) | $0.94 (≈ 24.555 ₫) | $2.20 (≈ 57.295 ₫) | $3.15 (≈ 81.850 ₫) | $0.0031 (≈ 82 ₫) |

- **48/50 phiên chạy model thật thành công** (2 phiên lỗi do model trả content rỗng — không tính vào trung bình); toàn bộ 50 phiên dùng đúng seed 42, chạy lại được.
- Chi phí / task thành công = chi phí trung bình mỗi phiên ÷ tỉ lệ đạt (91%) — **không coi như đạt 100%**.
- Token đo trên model nemotron-3.5-lightning:free; giá tính theo từng model trong bảng — model khác bộ tách token thì số token thật có thể lệch; ghi rõ: **đo trên model X (nemotron free), tính giá model Y (nano / haiku)**.
- Chi phí thực tế lúc build: **$0** (gói free OpenRouter) — bảng trên là chi phí dự kiến khi đưa vào dùng thật.

## 3. So với impact

- Impact / người / tháng (`spec.md` §2): tiết kiệm 45–80 phút sắp lịch/tháng (P1: 3–4 lần × 15–20 phút) + giảm rủi ro tai biến tương tác
- Chi phí / người / tháng (cơ sở, model gpt-5-nano): **≈ 63 ₫/tháng** (haiku: ≈ 82 ₫)
- **Kết luận một dòng — đáng làm không:** chi phí model ~63–82 ₫/người/tháng (khoảng giá một viên paracetamol) so với tiết kiệm gần 1 giờ công/tháng và giảm rủi ro nhập viện — **đáng làm**; nút thắt còn lại là hạn mức key free khi mở rộng, không phải chi phí model.

## 4. *(Muốn sâu hơn, không bắt buộc)*

- Bảng độ nhạy: model mạnh hơn 5× (haiku vs nano) chỉ tăng ~30% chi phí phiên — vì chi phí do token **ra** (đắt hơn 5–10×) chi phối, mà output luôn ngắn (~2.000 token). Cần gạt lớn nhất: thu ngắn ngữ cảnh đưa vào model (cắt bảng lịch khi có cặp NẶNG — đã làm ở guardrail C1) giảm ~40% token vào.
- Chi phí ngoài model: hosting tĩnh gần như 0 (frontend tĩnh + FastAPI 1 container ~$5/tháng); không có giờ công duyệt thường xuyên vì phiếu dược sĩ do người dùng tự xác nhận.
- Quy mô nào thì còn đáng làm: chi phí tuyến tính theo người dùng, ~82 ₫/người/tháng ở model đắt nhất bảng — còn đáng làm tới quy mô 10.000 người (≈ 820.000 ₫/tháng).
