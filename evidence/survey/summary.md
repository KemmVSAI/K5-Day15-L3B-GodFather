# Tổng hợp khảo sát — Thói quen sắp xếp và cập nhật lịch thuốc cho người thân

> Dữ liệu gốc: [`responses.csv`](responses.csv) (thu thập qua Google Forms ngày 28/11/2026, 09:32–11:32 GMT+7).
> Ngưỡng chuẩn của nguồn khảo sát là **≥20 người ngoài nhóm, đúng người dùng mục tiêu**. Hiện tại mới có **18 lượt trả lời** (trong đó **4/18** đúng vai hỗ trợ người thân ≥60 tuổi), nên khảo sát này được dùng làm **nguồn kiểm lại bổ sung**, không thay thế nguồn chính (đào 150 review ở `evidence/data-mining.md`).

## 1. Lọc mẫu (18 phản hồi)

| Nhóm | Số lượng | Tỉ lệ (N=18) | Ghi chú |
|---|---:|---:|---|
| Không hỗ trợ ai trong gia đình | 10 | 55.6% | Dừng ở câu 1 |
| Hỗ trợ **Bố/mẹ** (đều nhóm tuổi **Dưới 60**) | 4 | 22.2% | Dừng ở câu 2 (ngoài nhóm cao tuổi ≥60) |
| Hỗ trợ người thân **≥60 tuổi** (đúng người dùng mục tiêu) | **4** | **22.2%** | 3 Ông/bà (1 nhóm 60–69, 2 nhóm 70–79) · 1 Cô/chú/bác/họ hàng khác (60–69) |

## 2. Kết quả chi tiết nhóm đúng người dùng (n = 4)

| Câu hỏi | Kết quả quan sát được (n = 4) |
|---|---|
| **3. Trong 3 tháng qua, có trực tiếp mua, chia hoặc sắp/cập nhật lịch thuốc?** | **4/4 (100%)** có làm: 2 người *"Có, nhiều lần"*, 2 người *"Có, 1–2 lần"* |
| **4. Số lần trong 30 ngày qua** | 1 lần (1) · 2 lần (1) · 3–4 lần (1) · 5 lần trở lên (1) |
| **5. Lý do lần gần nhất** | 3/4 *"Chia thuốc theo ngày hoặc tuần"* · 1/4 *"Kiểm tra lại lịch đang dùng"* |
| **6. Số loại thuốc lần đó** | **4/4 (100%) ≥4 loại**: 4–6 loại (1) · 7–9 loại (2) · 10 loại trở lên (1) |
| **7. Cách sắp hoặc nhớ lịch** *(chọn nhiều)* | Ghi chú/lịch điện thoại (3/4) · Đơn/nhãn thuốc (2/4) · Giấy hoặc sổ (2/4) · Nhớ trong đầu (1/4) · Ứng dụng nhắc thuốc (1/4) · Hỏi bác sĩ-dược sĩ (1/4) |
| **8. Thời gian lần gần nhất** | 3/4 mất *5–10 phút* · 1/4 mất *Trên 20 phút* |
| **9. Có kiểm tra tương tác hoặc thuốc uống cách giờ không?** | **4/4 (100%)** chọn *"Kiểm tra cả hai"* |
| **10. Kết quả khi cần hỏi bác sĩ/dược sĩ** | 2/4 *"Không cần hỏi"* · 2/4 *"Liên hệ được và có trả lời trong ngày"* |

## 3. Nhận xét & đối chiếu với giả thuyết

- **Khớp với bài toán B2:** Tất cả người hỗ trợ người thân ≥60 tuổi đều phải trực tiếp sắp/chia thuốc nhiều loại (100% ≥4 loại, 3/4 từ 7 loại trở lên) và **4/4 (100%) đều có nhu cầu kiểm tra cả tương tác thuốc lẫn thuốc cần uống cách giờ** — khớp trực tiếp với 2 chức năng cốt lõi của hệ thống (`check_interactions` và tách giờ trong `build_schedule`).
- **Thói quen hiện tại còn thủ công:** 3/4 dựa vào ghi chú điện thoại, 2/4 dùng giấy/sổ và đọc lại đơn/nhãn thuốc, thậm chí có người nhớ trong đầu; chỉ 1/4 dùng ứng dụng nhắc thuốc. Thời gian mỗi lần phổ biến 5–10 phút, có ca >20 phút.
- **Điểm cần lưu ý trung thực:** 2/4 người trong mẫu nhỏ này liên hệ được bác sĩ/dược sĩ trả lời trong ngày (2/4 không cần hỏi), cho thấy không phải mọi tình huống đều nghẽn liên lạc như các review ca tối muộn trên app nhà thuốc — tuy nhiên cỡ mẫu đúng vai mới là `n = 4`, cần mở rộng thêm để kết luận chắc chắn.
