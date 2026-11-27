# Data card — dữ liệu bản chạy thử dùng

> Điền ở guide bước 2.4 (bản đầu ở CP2, đủ ở CP3). Ôn lại: ngày 6 · lab ngày 6. Chấm ở rubric R4.
> Một trang. Mỗi dataset một mục. Dữ liệu chạy thử (bài mẫu, thông báo mẫu, đoạn transcript…) để trong thư mục `data/` này.
> Không commit nguyên tài liệu khoá, dữ liệu cá nhân thật hay nguyên file data BTC cấp — chỉ đoạn trích ngắn, bản viết lại, hoặc số đã tổng hợp.

## Dataset 1 · Danh mục thuốc người cao tuổi (`data/drugs.json`)

| | |
|---|---|
| Dùng để làm gì | Nguồn tra cứu cho công cụ `lookup_drug_info`: ánh xạ tên biệt dược/hoạt chất, nhóm thuốc, khung giờ uống khuyến nghị, quan hệ với bữa ăn và lưu ý an toàn. |
| Từ đâu | Nhóm tự tổng hợp và đối chiếu từ tài liệu dược lý công khai (Dược thư Quốc gia Việt Nam, tờ hướng dẫn sử dụng thuốc lưu hành tại Cục Quản lý Dược — Bộ Y tế, MedlinePlus Drug Information). Không dùng dữ liệu bệnh nhân thật. |
| Xử lý những bước gì | Chọn lọc 18 hoạt chất bệnh mạn tính thường gặp ở người cao tuổi; chuẩn hóa tên biệt dược phổ biến tại VN vào trường `aliases`; gắn khung giờ (`sang`, `trua`, `toi`) và bữa ăn (`truoc_an`, `sau_an`, `bat_ky`); kiểm tra chéo từng mục với tài liệu nguồn. |
| Số dòng / số đoạn | 18 thuốc (`DRUG-01` → `DRUG-18`), mỗi thuốc kèm 2–5 tên gọi/biệt dược. |
| Phiên bản / ngày lấy | v1.0 — 27/11/2026 |
| Nhãn | `synthetic` (dữ liệu tổng hợp có đối chiếu tài liệu y khoa chuẩn, không chứa dữ liệu cá nhân/bệnh nhân thật) |
| Giới hạn | Chỉ phủ 18 hoạt chất phổ biến; chưa có hàm lượng chi tiết từng viên (mg), chưa phủ thuốc kê đơn đặc trị, kháng sinh hay thuốc đông y. Thuốc ngoài 18 mục này phải báo "chưa có trong dữ liệu" và chuyển dược sĩ. |

### Nguồn công khai theo từng mục (`data/drugs.json`)

| Mã | Hoạt chất | Nguồn đối chiếu công khai |
|---|---|---|
| `DRUG-01` | Metformin | Dược thư Quốc gia Việt Nam (chuyên luận Metformin hydroclorid) · Tờ HDSD Glucophage (Cục QLD - Bộ Y tế) |
| `DRUG-02` | Glimepiride | Dược thư Quốc gia Việt Nam (chuyên luận Glimepirid) · Tờ HDSD Amaryl (Cục QLD - Bộ Y tế) |
| `DRUG-03` | Amlodipine | Dược thư Quốc gia Việt Nam (chuyên luận Amlodipin) · Tờ HDSD Amlor (Cục QLD - Bộ Y tế) |
| `DRUG-04` | Perindopril | Dược thư Quốc gia Việt Nam (chuyên luận Perindopril) · Tờ HDSD Coversyl (Cục QLD - Bộ Y tế) |
| `DRUG-05` | Losartan | Dược thư Quốc gia Việt Nam (chuyên luận Losartan kali) · Tờ HDSD Cozaar (Cục QLD - Bộ Y tế) |
| `DRUG-06` | Bisoprolol | Dược thư Quốc gia Việt Nam (chuyên luận Bisoprolol fumarat) · Tờ HDSD Concor (Cục QLD - Bộ Y tế) |
| `DRUG-07` | Spironolactone | Dược thư Quốc gia Việt Nam (chuyên luận Spironolacton) · Tờ HDSD Aldactone (Cục QLD - Bộ Y tế) |
| `DRUG-08` | Furosemide | Dược thư Quốc gia Việt Nam (chuyên luận Furosemid) · Tờ HDSD Lasix (Cục QLD - Bộ Y tế) |
| `DRUG-09` | Atorvastatin | Dược thư Quốc gia Việt Nam (chuyên luận Atorvastatin) · Tờ HDSD Lipitor (Cục QLD - Bộ Y tế) |
| `DRUG-10` | Simvastatin | Dược thư Quốc gia Việt Nam (chuyên luận Simvastatin) · Tờ HDSD Zocor (Cục QLD - Bộ Y tế) |
| `DRUG-11` | Aspirin | Dược thư Quốc gia Việt Nam (chuyên luận Acid acetylsalicylic) · Tờ HDSD Aspirin pH8 / 81mg (Cục QLD - Bộ Y tế) |
| `DRUG-12` | Clopidogrel | Dược thư Quốc gia Việt Nam (chuyên luận Clopidogrel) · Tờ HDSD Plavix (Cục QLD - Bộ Y tế) |
| `DRUG-13` | Warfarin | Dược thư Quốc gia Việt Nam (chuyên luận Warfarin natri) · MedlinePlus (Warfarin patient instructions) |
| `DRUG-14` | Omeprazole | Dược thư Quốc gia Việt Nam (chuyên luận Omeprazol) · Tờ HDSD Losec (Cục QLD - Bộ Y tế) |
| `DRUG-15` | Levothyroxine | Dược thư Quốc gia Việt Nam (chuyên luận Levothyroxin natri) · Tờ HDSD Levothyrox / Berlthyrox (Cục QLD - Bộ Y tế) |
| `DRUG-16` | Calcium + Vitamin D3 | Dược thư Quốc gia Việt Nam (chuyên luận Calci / Cholecalciferol) · Tờ HDSD bổ sung Canxi D3 phổ thông |
| `DRUG-17` | Ibuprofen | Dược thư Quốc gia Việt Nam (chuyên luận Ibuprofen) · Tờ HDSD Brufen (Cục QLD - Bộ Y tế) |
| `DRUG-18` | Paracetamol | Dược thư Quốc gia Việt Nam (chuyên luận Paracetamol) · Tờ HDSD Panadol / Efferalgan (Cục QLD - Bộ Y tế) |

---

## Dataset 2 · Bảng cặp tương tác thuốc (`data/interactions.json`)

| | |
|---|---|
| Dùng để làm gì | Nguồn tra cứu cho công cụ `check_interactions`: phát hiện cặp thuốc tương tác theo mức độ (`nang`, `trung_binh`, `nhe`) và hướng xử trí (`hoi_duoc_si`, `tach_gio`, `theo_doi`). |
| Từ đâu | Nhóm tổng hợp từ tra cứu tương tác thuốc công khai (Drugs.com Drug Interactions Checker, Dược thư Quốc gia Việt Nam, cảnh báo an toàn thuốc của Cục Quản lý Dược — Bộ Y tế) đối chiếu trên 18 thuốc ở Dataset 1. |
| Xử lý những bước gì | Lọc các cặp tương tác có ý nghĩa lâm sàng với người cao tuổi; chuẩn hóa 3 mức độ và 3 hành động xử trí; đối chiếu từng cặp với nguồn công khai trước khi chốt. |
| Số dòng / số đoạn | 12 cặp tương tác (`INT-01` → `INT-12`). |
| Phiên bản / ngày lấy | v1.0 — 27/11/2026 |
| Nhãn | `synthetic` (dữ liệu tổng hợp có đối chiếu tài liệu y khoa chuẩn, phục vụ chạy thử lát cắt B2) |
| Giới hạn | Mới mô hình hóa tương tác cặp đôi (2 thuốc) trong phạm vi 18 thuốc mẫu; chưa tính đến mức độ suy gan/suy thận theo từng bệnh nhân cụ thể hoặc tương tác với thực phẩm chức năng/thuốc đông y. Không thay thế chỉ định của bác sĩ/dược sĩ. |

### Nguồn công khai theo từng mục (`data/interactions.json`)

| Mã | Cặp thuốc | Mức | Nguồn đối chiếu công khai |
|---|---|---|---|
| `INT-01` | Warfarin + Aspirin | `nang` | Dược thư Quốc gia VN (mục tương tác Warfarin) · Drugs.com Interaction (Major) |
| `INT-02` | Warfarin + Ibuprofen | `nang` | Dược thư Quốc gia VN (chống đông + NSAID) · Drugs.com Interaction (Major) |
| `INT-03` | Warfarin + Paracetamol | `trung_binh` | Dược thư Quốc gia VN (Warfarin: thận trọng khi dùng Paracetamol kéo dài/liều cao) · Drugs.com (Moderate) |
| `INT-04` | Clopidogrel + Omeprazole | `nang` | Cảnh báo tương tác CYP2C19 (FDA / Cục QLD VN · Tờ HDSD Plavix) · Drugs.com (Major) |
| `INT-05` | Aspirin + Ibuprofen | `nang` | Dược thư Quốc gia VN (tương tác NSAID kép & cản trở tác dụng chống kết tập tiểu cầu của Aspirin liều thấp) · Drugs.com (Major) |
| `INT-06` | Perindopril + Spironolactone | `nang` | Dược thư Quốc gia VN (ACEi + lợi tiểu giữ kali: nguy cơ tăng kali máu) · Drugs.com (Major) |
| `INT-07` | Perindopril + Ibuprofen | `trung_binh` | Dược thư Quốc gia VN (ACEi + NSAID: giảm hiệu quả hạ áp, nguy cơ suy thận) · Drugs.com (Moderate) |
| `INT-08` | Losartan + Ibuprofen | `trung_binh` | Dược thư Quốc gia VN (ARB + NSAID: giảm hiệu quả hạ áp, nguy cơ tổn thương thận) · Drugs.com (Moderate) |
| `INT-09` | Levothyroxine + Calcium + Vitamin D3 | `trung_binh` | Tờ HDSD Levothyrox (cách chế phẩm chứa Canxi ≥ 4 giờ) · Drugs.com (Moderate) |
| `INT-10` | Levothyroxine + Omeprazole | `trung_binh` | Dược thư Quốc gia VN / Tờ HDSD Levothyrox (PPI làm giảm hấp thu Levothyroxine) · Drugs.com (Moderate) |
| `INT-11` | Simvastatin + Amlodipine | `trung_binh` | Khuyến cáo an toàn thuốc Cục QLD VN / FDA (giới hạn liều Simvastatin ≤ 20 mg/ngày khi dùng cùng Amlodipine) · Drugs.com (Moderate) |
| `INT-12` | Metformin + Furosemide | `nhe` | Dược thư Quốc gia VN (tương tác dược động học nhẹ Metformin – Furosemid) · Drugs.com (Moderate/Minor — theo dõi đường huyết) |
