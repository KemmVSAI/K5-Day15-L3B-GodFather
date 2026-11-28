# Tổng hợp bằng chứng pain

> Điền ở guide bước 1.2, xong trước **CP3 10:00 Thứ Bảy 28/11**. Chấm ở rubric R1.
> Ba nguồn ngang nhau — tối thiểu **≥1 nguồn đạt ngưỡng**. Mạnh nhất: đào data ra insight → hỏi người dùng để kiểm lại (hoặc ngược lại).

## 1. Nguồn đã dùng

| Nguồn | Đạt ngưỡng? | File |
|---|---|---|
| Đào data (x/N, %, cách đếm chạy lại được, ≥5 ví dụ) | **✅ đạt** — 150 review (App Store VN, 3 app nhà thuốc, 28/11/2026), cách đếm + script chạy lại được | `evidence/data-mining.md` · `evidence/count_reviews.py` |
| Phỏng vấn (≥3 người ngoài nhóm, đúng người dùng) | ⚠️ 1/3 — P1 hoàn thành; 2 hẹn còn lại đẩy sang CP4 | `evidence/interviews/P1.md` |
| Khảo sát (≥20 người ngoài nhóm, đúng người dùng) | ⚠️ 18 phản hồi (**4/18** đúng vai hỗ trợ người thân ≥60 tuổi — chưa đạt ngưỡng ≥20 đúng vai; dùng kiểm lại bổ sung) | `evidence/survey/summary.md` · `evidence/survey/responses.csv` |

**Nguồn đạt ngưỡng: đào data (đủ) · nguồn kiểm lại: phỏng vấn (đang 1/3) + khảo sát (18 phản hồi, 4/18 đúng vai).**

## 2. Số chính

- Đào data (N=150 review App Store VN — Long Châu, Pharmacity, MEDIGO): **30/150 (20%)** review phàn nàn kênh hỏi dược sĩ/tư vấn thuốc; **50/150 (33%)** review tiêu cực nhắc người thân (người mua không phải người dùng thuốc); tính năng lịch uống gần như không tồn tại trên app (2%)
- Phỏng vấn: **1/3 người** gặp rõ pain (P1 — người con sắp thuốc hộ mẹ uống 5 loại; 2 hẹn còn lại trước CP4) · mỗi lần xếp/đổi lịch mất P1: 15–20 phút
- Khảo sát (N=18, `evidence/survey/summary.md`): **8/18 (44.4%)** có hỗ trợ người thân sắp thuốc; **4/18 (22.2%)** hỗ trợ người thân ≥60 tuổi (3 Ông/bà, 1 họ hàng). Trong 4 người đúng vai: **4/4 (100%)** trực tiếp mua/chia/sắp lịch trong 3 tháng qua; **4/4 (100%)** đơn có ≥4 loại thuốc (3/4 từ 7 loại trở lên); **4/4 (100%)** đều kiểm tra **cả tương tác thuốc lẫn thuốc cần uống cách giờ**; 3/4 mất 5–10 phút, 1/4 mất >20 phút; chủ yếu dùng ghi chú điện thoại (3/4), đơn/nhãn (2/4), giấy/sổ (2/4).

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

Review công khai nói: kênh hỏi dược sĩ nghẽn — chậm, không trả lời, tư vấn hời hợt (30/150). P1 nói đúng điều đó ở quy mô cá nhân: tối không gọi được ai, phải tự soi toa. Khảo sát (`evidence/survey/summary.md`, n=4 đúng vai ≥60 tuổi) xác nhận 4/4 đều phải kiểm tra cả tương tác lẫn tách giờ uống trên đơn nhiều thuốc (≥4 loại, 3/4 từ 7 loại trở lên) bằng cách thủ công (ghi chú điện thoại, giấy/sổ). **Khớp ở nhu cầu tự kiểm tra tương tác + tách giờ cho người thân cao tuổi uống nhiều thuốc**; lệch nhẹ: 2/4 người khảo sát liên hệ được BS/DS trả lời trong ngày (2/4 không cần hỏi), khác với P1/review tập trung vào tình huống nghẽn lúc tối muộn. Tai biến Amoxicillin trong review cho thấy hậu quả không đảo ngược được — đúng giả định rủi ro ở `evidence/hypothesis.md`.

## 5. Kết luận

Giả thuyết ở `evidence/hypothesis.md`: **đúng ở mức bằng chứng hiện có** — kênh hỏi dược sĩ nghẽn (số từ 150 review) + P1 kể được lần phải tự xếp và không chắc an toàn + khảo sát 4/4 người hỗ trợ người thân ≥60 tuổi đều phải kiểm tra cả tương tác và tách giờ trên đơn ≥4 loại thuốc; tiêu chí "≥2/3 phỏng vấn" và "≥20 khảo sát đúng vai" chưa đạt ngưỡng độc lập (đào data vẫn là nguồn đạt ngưỡng chính). Điều vẫn chưa biết: người dùng có chịu dùng công cụ xếp lịch riêng không, và tỉ lệ nghẽn khi hỏi dược sĩ vào buổi tối trên mẫu lớn hơn.

## Lịch hẹn (dùng cho CP2 — chỉ ghi vai và giờ, không tên)

| Vai | Giờ hẹn | Đã xong? |
|---|---|---|
| Người con sắp thuốc hộ cha mẹ cao tuổi | 20:00–21:30 Thứ Sáu 27/11 | ✅ P1 (đã ghi `P1.md`) |
| Người con mua và chia thuốc tuần cho mẹ | hẹn lại trước CP4 | ⏳ |
| Người thân đang sắp thuốc nhiều loại mỗi ngày | hẹn lại trước CP4 | ⏳ |
