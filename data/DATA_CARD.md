# Data card — dữ liệu bản chạy thử dùng

> Điền ở guide bước 2.4 (bản đầu ở CP2, đủ ở CP3). Ôn lại: ngày 6 · lab ngày 6. Chấm ở rubric R4.
> Một trang. Mỗi dataset một mục. Dữ liệu chạy thử (bài mẫu, thông báo mẫu, đoạn transcript…) để trong thư mục `data/` này.
> Không commit nguyên tài liệu khoá, dữ liệu cá nhân thật hay nguyên file data BTC cấp — chỉ đoạn trích ngắn, bản viết lại, hoặc số đã tổng hợp.

## Dataset 1 · Danh mục thuốc người cao tuổi (`data/drugs.json`)

| | |
|---|---|
| Dùng để làm gì | Nguồn tra cứu cho công cụ `lookup_drug_info`: ánh xạ tên biệt dược/hoạt chất, nhóm thuốc, khung giờ uống khuyến nghị, quan hệ với bữa ăn và lưu ý an toàn. |
| Từ đâu | Nhóm tự tổng hợp và chuẩn hóa từ tài liệu dược lý công khai (Dược thư Quốc gia Việt Nam & tờ hướng dẫn sử dụng thuốc phổ thông). Không dùng dữ liệu bệnh nhân thật. |
| Xử lý những bước gì | Chọn lọc 18 hoạt chất bệnh mạn tính thường gặp ở người cao tuổi (đái tháo đường, tăng huyết áp, mỡ máu, tim mạch, chống đông, dạ dày, tuyến giáp, giảm đau); chuẩn hóa tên biệt dược phổ biến ở Việt Nam vào trường `aliases`; tách khung giờ (`sang`, `trua`, `toi`) và bữa ăn (`truoc_an`, `sau_an`, `bat_ky`). |
| Số dòng / số đoạn | 18 thuốc (mã `DRUG-01` → `DRUG-18`), mỗi thuốc kèm 2–5 tên gọi/biệt dược. |
| Phiên bản / ngày lấy | v1.0 — 27/11/2026 |
| Nhãn | `synthetic` (dữ liệu tổng hợp có kiểm duyệt từ tài liệu y khoa chuẩn, không chứa dữ liệu cá nhân/bệnh nhân thật) |
| Giới hạn | Chỉ phủ 18 hoạt chất phổ biến; chưa có hàm lượng chi tiết từng viên (mg), chưa phủ thuốc kê đơn đặc trị, kháng sinh hay thuốc đông y. Thuốc ngoài 18 mục này phải báo "chưa có trong dữ liệu" và chuyển dược sĩ. |

## Dataset 2 · Bảng cặp tương tác thuốc (`data/interactions.json`)

| | |
|---|---|
| Dùng để làm gì | Nguồn tra cứu cho công cụ `check_interactions`: phát hiện cặp thuốc tương tác theo mức độ (`nang`, `trung_binh`, `nhe`) và hướng xử trí (`hoi_duoc_si`, `tach_gio`, `theo_doi`). |
| Từ đâu | Nhóm tổng hợp từ tra cứu tương tác thuốc công khai (Drugs.com Interaction Checker & Dược thư Quốc gia Việt Nam) đối chiếu trên 18 thuốc ở Dataset 1. |
| Xử lý những bước gì | Lọc các cặp tương tác có ý nghĩa lâm sàng cho người cao tuổi (chảy máu khi phối hợp chống đông/NSAID, giảm hiệu quả Clopidogrel + Omeprazole, tăng kali máu ACEi + Spironolactone, giảm hấp thu Levothyroxine khi uống gần Canxi/PPI...); chuẩn hóa 3 mức độ và 3 hành động xử trí; người viết kiểm tra chéo từng cặp. |
| Số dòng / số đoạn | 12 cặp tương tác (mã `INT-01` → `INT-12`). |
| Phiên bản / ngày lấy | v1.0 — 27/11/2026 |
| Nhãn | `synthetic` (dữ liệu tổng hợp có kiểm duyệt, phục vụ chạy thử lát cắt B2) |
| Giới hạn | Mới mô hình hóa tương tác cặp đôi (2 thuốc) trong phạm vi 18 thuốc mẫu; chưa tính đến suy gan/suy thận theo từng bệnh nhân cụ thể hoặc tương tác với thực phẩm chức năng/thuốc nam. Không dùng thay thế cho chẩn đoán hay quyết định điều trị của bác sĩ/dược sĩ. |
