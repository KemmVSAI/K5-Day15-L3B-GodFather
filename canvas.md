# Canvas — GodFather · Track B

> Điền ở guide bước 1.4. CP1 17:00 Thứ Sáu 27/11: nộp bản đầu, đủ 7 dòng (dòng 4 được ghi giả thuyết + nguồn sẽ kiểm).
> CP2 19:30 Thứ Sáu 27/11: cập nhật (số bằng chứng đầu, lát cắt đã chốt) và điền dòng "Đã đổi gì so với CP1".
> Track F: chép thêm thẻ đề của nhóm (khung trong file track F) xuống dưới bảng này.

| # | Dòng | Nhóm điền |
|---|---|---|
| 1 | Track + lát cắt dự kiến | **Track B (Y tế)** — hướng B2: kiểm tra tương tác thuốc và lịch uống cho người uống nhiều thuốc |
| 2 | Người dùng chính (một vai cụ thể — không phải "học viên nói chung") | Người con (25–40 tuổi) sắp thuốc và mua thuốc hộ cha mẹ cao tuổi có bệnh mạn tính đang uống 4–6 loại thuốc mỗi ngày |
| 3 | Pain một câu: ai — đang làm gì — vướng đâu — hậu quả | Người con sắp thuốc cho mẹ — nhập/soi lại từng loại thuốc để xếp giờ uống trong ngày — không ai kiểm được cặp thuốc có kị nhau không, giờ uống chồng nhau — mẹ uống nhầm giờ hoặc dùng chung hai thuốc tương tác, con lo nhưng không biết hỏi ai lúc tối muộn |
| 4 | Bằng chứng đầu — CP1: giả thuyết + nguồn sẽ kiểm · CP2: số đầu tiên + 1 trích dẫn | **Giả thuyết:** người con sắp thuốc cho cha mẹ gặp khó khi xếp lịch uống vì không tra được tương tác giữa các thuốc đang dùng, hậu quả là xếp sai giờ hoặc bỏ sót cặp kị nhau. **Mình đúng nếu thấy:** ≥2/3 người phỏng vấn kể được 1 lần trong 1 tháng qua phải tự xếp/sửa lịch thuốc cho người nhà và không chắc lịch đó có an toàn. **Trạng thái CP2:** đã lập lịch hẹn phỏng vấn ≥3 người thân sắp thuốc hộ cha mẹ (tối 27/11) kết hợp đào review công khai app nhà thuốc trên Google Play/App Store (cập nhật số đếm và trích dẫn nguyên văn vào `evidence/summary.md` trước CP3). |
| 5 | **Lát cắt MỘT CÂU** (1 người dùng · 1 việc · 1 quyết định AI · 1 kết quả) | Một người con sắp thuốc cho mẹ · nhập 5 loại thuốc mẹ đang uống · AI tra tương tác bằng công cụ và quyết định cảnh báo mức nào, có chuyển dược sĩ không, xếp lịch sáng/trưa/tối · người con nhận lịch kèm cảnh báo và nút "hỏi dược sĩ" |
| 6 | AI tự làm đến đâu + 1 dòng lý do: sai thì ai chịu gì | AI tự tra tương tác và xếp lịch nháp, nhưng cảnh báo chỉ dừng ở mức "đề nghị" — người con phải xác nhận lịch trước khi mẹ dùng; sai ở mức nhẹ người dùng tự chịu được (sửa lại lịch rẻ), tương tác nặng hoặc không chắc thì chuyển dược sĩ người quyết — vì sai ở đây là hại sức khoẻ một người cụ thể |
| 7 | Phân công có tên | Đinh Quốc Việt (đội trưởng — tổng hợp canvas, nộp CP, kiến trúc agent) · Lê Sỹ Long Nhật (phỏng vấn người dùng + bằng chứng) · Vương Quang Thắng (data thuốc + tương tác, DATA_CARD, bộ câu thử) · Nguyễn Tuấn Dũng (codebase: tools.py + agent.py, chạy eval) |
| — | *(CP2)* Đã đổi gì so với CP1 | Chốt thiết kế workflow cố định 5 công cụ (`check_red_flags`, `lookup_drug_info`, `check_interactions`, `build_schedule`, `handoff_to_pharmacist`), dựng dữ liệu mẫu 18 thuốc & 12 cặp tương tác (`data/`), chốt 13 câu thử (`eval/benchmark.csv`) và 3 điều kiện cứng C1–C3 + ngưỡng đạt ≥85% trong `spec.md` §7 và `eval/metric_spec.yaml`. |
