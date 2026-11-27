# Đào data — cách đếm và kết quả

> Điền ở guide bước 1.2. Ôn lại: ngày 2, lab ngày 2.
> Nguồn: review công khai trên App Store (VN) của 3 app nhà thuốc người dùng B2 dùng nhiều nhất — đúng hướng dẫn track B ("đào review công khai… repo chỉ giữ số đếm và trích ngắn đã bỏ tên").
> Script đếm: `evidence/count_reviews.py` (chạy lại được, dùng iTunes RSS API công khai của Apple, không cần key).

## 1. Cách đếm — viết TRƯỚC khi chạy

- Data dùng: review mới nhất trên App Store Việt Nam (iTunes RSS `customerreviews`, sortby=mostrecent) của 3 app:
  1. Long Châu — Chuyên gia thuốc (id 1586071844)
  2. Pharmacity - Nhà thuốc uy tín (id 1414835869)
  3. MEDIGO - Đặt thuốc nhanh 24/7 (id 1476660376)
- Ngày lấy: 28/11/2026 · 50 review mới nhất mỗi app.
- Đếm gì: gắn nhãn chủ đề theo từ khoá (bảng dưới), mỗi review được gắn 1+ nhãn nếu khớp.
- **Mẫu số:** N = 150 (tổng review đã đọc và gắn nhãn của 3 app, kể cả review không liên quan). Ghi rõ giới hạn: mẫu "mới nhất" nghiêng về người đang bực — % dưới đây không phải % mọi người dùng.

## 2. Đọc trước, đếm sau

Đã đọc 30 review đầu (Long Châu) trước khi đặt nhãn. Các *kiểu* hành vi thấy được:
- Phàn nàn kênh tư vấn dược sĩ: chậm, không trả lời, tư vấn hời hợt, "biến mất" giữa buổi.
- Lỗi kỹ thuật app (đăng nhập, bảo trì, cập nhật).
- Giao hàng / giá / khuyến mãi.
- Một review mô tả tai biến dị ứng thuốc do tư vấn sai — hậu quả thật của việc "hỏi dược sĩ không được".

## 3. Kết quả (N = 150)

| Đếm gì | x / N | % | Ghi chú |
|---|---|---|---|
| Review phàn nàn **kênh hỏi dược sĩ / tư vấn thuốc** (từ khoá: "tư vấn", "dược sĩ", "thuốc nào", "uống thế nào", "liều", "khám", "bác sĩ") | 30 / 150 | 20% | Lớn nhất trong các nhóm nội dung (ngoài lỗi app và giao hàng) |
| Review ≤3 sao nhắc **người thân** (mẹ, bố, con, người già…) | 50 / 150 | 33% | Người mua là người nhà — đúng vai người dùng B2 |
| Review nhắc **lịch uống / nhắc uống / quên uống** | 3 / 150 | 2% | Hiếm vì app nhà thuốc không có tính năng này — đúng chỗ trống |
| Review nhắc **tương tác / kị nhau** | 1 / 150 | 1% | Rất ít người nhắc — nhưng review đó mô tả hậu quả nhập viện |
| Giá / khuyến mãi | 14 / 150 | 9% | |
| Giao hàng | 77 / 150 | 51% | |
| Lỗi app / kỹ thuật | 58 / 150 | 39% | |

Cách đọc: 20% review phàn nàn đúng pain "hỏi dược sĩ không được" ở 3 nhà thuốc lớn nhất — kênh hỏi hiện tại nghẽn thật. 33% review tiêu cực nhắc người thân — người mua không phải người dùng thuốc.

## 4. ≥5 ví dụ cụ thể (trích ngắn, bỏ tên, đã ghi ngày + app)

1. **[Long Châu, 4 sao, 20/11/2026]** "Giá thuốc phải chăng nhưng **tư vấn rất chậm**, nhiều loại thuốc ko cho mua trực tiếp trên app mà chờ nhân viên tư vấn quá lâu."
2. **[Long Châu, 1 sao, 14/11/2026]** "**Mình liên hệ cho dược sĩ mà ko một ai thèm trả lời.**"
3. **[Long Châu, 1 sao, 13/11/2026]** "**Tư vấn khách hàng ngta nhắn thì 5,10p mới trả lời**, vừa nhắn đến ngta trả lời liền thì lại biến mất."
4. **[Long Châu, 4 sao, 20/11/2026]** "Tìm trên shop có thuốc. Nhưng bán là thuốc ngoại **but ko tư vấn rõ ràng**."
5. **[Long Châu, 1 sao, 19/11/2026]** "…xin tư vấn thuốc mắt… **Tư vấn cả buổi mà ko biết mua sp gì** còn nhân viên thì tư vấn ko đầu ko đuôi."
6. **[Long Châu, 1 sao, 23/11/2026]** — review dài mô tả **tai biến thật**: khách báo dị ứng Amoxicillin nhưng vẫn được bán Klamentin (chứa cùng hoạt chất), "Sau khi uống thuốc khoảng 1 giờ 30 phút… khó thở… phải đến bệnh viện cấp cứu." → đúng hậu quả "bỏ sót cặp kị nhau" mà B2 nhắm.

## 5. Giới hạn của data

- Review cho biết người dùng **bực ở kênh tư vấn**, không cho biết họ xếp lịch thuốc thế nào ở nhà (mục đích app không phải ghi lịch).
- Mẫu lấy review mới nhất → nghiêng người đang bực; % không suy ra cho toàn bộ người dùng.
- Tính năng "lịch uống" gần như không được nhắc (2%) — vì chưa ai có; không chứng minh nhu cầu thấp, chỉ chứng minh chỗ trống.
→ Kiểm lại bằng phỏng vấn ≥3 người con sắp thuốc hộ người nhà (nguồn kiểm lại, `evidence/interviews/`).
