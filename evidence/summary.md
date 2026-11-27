# Tổng hợp bằng chứng pain

> Điền ở guide bước 1.2, xong trước **CP3 10:00 Thứ Bảy 28/11**. Chấm ở rubric R1.
> Ba nguồn ngang nhau — tối thiểu **≥1 nguồn đạt ngưỡng**. Mạnh nhất: đào data ra insight → hỏi người dùng để kiểm lại (hoặc ngược lại).

## 1. Nguồn đã dùng

| Nguồn | Đạt ngưỡng? | File |
|---|---|---|
| Đào data (x/N, %, cách đếm chạy lại được, ≥5 ví dụ) | **✅ đạt** — 150 review (App Store VN, 3 app nhà thuốc, 28/11/2026), cách đếm + script chạy lại được | `evidence/data-mining.md` · `evidence/count_reviews.py` |
| Phỏng vấn (≥3 người ngoài nhóm, đúng người dùng) | ⚠️ 1/3 — P1 hoàn thành; 2 hẹn còn lại đẩy sang CP4 | `evidence/interviews/P1.md` |
| Khảo sát (≥20 người ngoài nhóm, đúng người dùng) | ☐ không làm — xoá thư mục mẫu nếu đến CP4 vẫn không có | — |

**Nguồn đạt ngưỡng: đào data (đủ) · nguồn kiểm lại: phỏng vấn (đang 1/3).**

## 2. Số chính

- Đào data (N=150 review App Store VN — Long Châu, Pharmacity, MEDIGO): **30/150 (20%)** review phàn nàn kênh hỏi dược sĩ/tư vấn thuốc; **50/150 (33%)** review tiêu cực nhắc người thân (người mua không phải người dùng thuốc); tính năng lịch uống gần như không tồn tại trên app (2%)
- Phỏng vấn: **1/3 người** gặp rõ pain (P1 — người con sắp thuốc hộ mẹ uống 5 loại; 2 hẹn còn lại trước CP4) · mỗi lần xếp/đổi lịch mất P1: 15–20 phút
- Khảo sát: chưa làm

Phỏng vấn nhiều vai thì đếm theo từng vai, không cộng chung.

| | Vai | Gặp pain? | Số lần / 1 tháng qua | Lần gần nhất mất | Đang xoay xở bằng |
|---|---|---|---|---|---|
| P1 | Người con (30 tuổi) sắp thuốc hộ mẹ 68 tuổi uống 5 loại (tim mạch, đái tháo đường) | Có — không chắc cặp nào kị nhau | 3–4 lần (mỗi lần đổi đơn) | ~15–20 phút (gọi điện hỏi dược sĩ, buổi tối hay không ai nghe) | Soi toa chụp lại, gọi nhà thuốc, hỏi hội đồng lớp có người làm y tế |
| P2 | *(hẹn trước CP4)* | | | | |
| P3 | *(hẹn trước CP4)* | | | | |

## 3. ≥5 trích dẫn hoặc ví dụ nguyên văn (có nguồn, bỏ tên)

1. "Giá thuốc phải chăng nhưng **tư vấn rất chậm**, nhiều loại thuốc ko cho mua trực tiếp trên app mà chờ nhân viên tư vấn quá lâu." — review 4 sao, Long Châu iOS, 20/11/2026 (`evidence/data-mining.md` ví dụ 1)
2. "**Mình liên hệ cho dược sĩ mà ko một ai thèm trả lời.**" — review 1 sao, Long Châu iOS, 14/11/2026 (ví dụ 2)
3. "**Tư vấn khách hàng ngta nhắn thì 5,10p mới trả lời**, vừa nhắn đến ngta trả lời liền thì lại biến mất." — review 1 sao, Long Châu iOS, 13/11/2026 (ví dụ 3)
4. "Tìm trên shop có thuốc. Nhưng bán là thuốc ngoại **but ko tư vấn rõ ràng**." — review 4 sao, Long Châu iOS, 20/11/2026 (ví dụ 4)
5. "…xin tư vấn thuốc mắt… **Tư vấn cả buổi mà ko biết mua sp gì** còn nhân viên thì tư vấn ko đầu ko đuôi." — review 1 sao, Long Châu iOS, 19/11/2026 (ví dụ 5)
6. **Ví dụ tai biến** (hậu quả của pain): khách tự báo dị ứng Amoxicillin, nhà thuốc vẫn bán Klamentin (cùng hoạt chất) → "Sau khi uống thuốc khoảng 1 giờ 30 phút… khó thở… **phải đến bệnh viện cấp cứu**" — review 1 sao, Long Châu iOS, 23/11/2026 (ví dụ 6)
7. **Từ phỏng vấn P1** (người con 30 tuổi, sắp thuốc cho mẹ): "Chăm chú hơn 10–15 phút cho mỗi lần đổi đơn… thuốc mới các dược sĩ bán thuốc cho mẹ em nói chung chung, còn kị nhau thì em phải hỏi lại từng thuốc, tối gọi không ai nghe." *(trích trong `evidence/interviews/P1.md`)*

## 4. Các nguồn có khớp nhau không

Review công khai nói: kênh hỏi dược sĩ nghẽn — chậm, không trả lời, tư vấn hời hợt (30/150). P1 nói đúng điều đó ở quy mô cá nhân: tối không gọi được ai, phải tự soi toa. **Khớp ở pain "không ai hỏi được lúc tối muộn"**; lệch: review tập trung kênh chat app (khi mua), P1 là việc xếp lịch ở nhà sau khi đổi đơn — hai mặt của cùng nhu cầu "cần người rành thuốc trả lời ngay". Tai biến Amoxicillin trong review cho thấy hậu quả không đảo ngược được — đúng giả định rủi ro ở `evidence/hypothesis.md`.

## 5. Kết luận

Giả thuyết ở `evidence/hypothesis.md`: **đúng ở mức bằng chứng hiện có** — kênh hỏi dược sĩ nghẽn (số từ 150 review) + P1 kể được lần phải tự xếp và không chắc an toàn; tiêu chí "≥2/3 phỏng vấn" chưa đủ (1/3, hoàn thành trước CP4). Điều vẫn chưa biết: người dùng có chịu dùng công cụ xếp lịch riêng không, và tần suất chính xác của việc "đổi đơn phải xếp lại".

## Lịch hẹn (dùng cho CP2 — chỉ ghi vai và giờ, không tên)

| Vai | Giờ hẹn | Đã xong? |
|---|---|---|
| Người con sắp thuốc hộ cha mẹ cao tuổi | 20:00–21:30 Thứ Sáu 27/11 | ✅ P1 (đã ghi `P1.md`) |
| Người con mua và chia thuốc tuần cho mẹ | hẹn lại trước CP4 | ⏳ |
| Người thân đang sắp thuốc nhiều loại mỗi ngày | hẹn lại trước CP4 | ⏳ |
