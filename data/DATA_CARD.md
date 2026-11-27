# Data card — dữ liệu bản chạy thử dùng

> Điền ở guide bước 2.4 (bản đầu ở CP2, đủ ở CP3). Ôn lại: ngày 6 · lab ngày 6. Chấm ở rubric R4.
> Một trang. Mỗi dataset một mục. Dữ liệu chạy thử (bài mẫu, thông báo mẫu, đoạn transcript…) để trong thư mục `data/` này.
> Không commit nguyên tài liệu khoá, dữ liệu cá nhân thật hay nguyên file data BTC cấp — chỉ đoạn trích ngắn, bản viết lại, hoặc số đã tổng hợp.

## Dataset 1 · Danh mục thuốc người cao tuổi (`data/drugs.json`, v2.0)

| | |
|---|---|
| Dùng để làm gì | Nguồn tra cứu cho công cụ `lookup_drug_info`: ánh xạ tên biệt dược/hoạt chất, nhóm thuốc, khung giờ uống khuyến nghị, quan hệ với bữa ăn và lưu ý an toàn; kèm danh sách biệt dược **đã đăng ký hợp lệ tại Việt Nam** để nhận diện tên thuốc người dùng nhập. |
| Từ đâu | Hai nguồn: **(1) Phần chuyên môn** (khung giờ, bữa ăn, lưu ý) — nhóm tự tổng hợp và đối chiếu từ tài liệu dược lý công khai (Dược thư Quốc gia Việt Nam, tờ hướng dẫn sử dụng thuốc lưu hành tại Cục Quản lý Dược — Bộ Y tế, MedlinePlus Drug Information); **(2) Phần đăng ký** (`registered_brands`, `combination_brands`, `registration_note`) — trích từ Cổng công bố giấy đăng ký thuốc, nguyên liệu làm thuốc tại Việt Nam, https://dichvucong.dav.gov.vn/congbothuoc/index (file `cong_bo_thuoc_DAV.xlsx`, 55.030 bản ghi). Không dùng dữ liệu bệnh nhân thật. |
| Xử lý những bước gì | (1) Chọn lọc 18 hoạt chất bệnh mạn tính thường gặp ở người cao tuổi; gắn khung giờ (`sang`, `trua`, `toi`), bữa ăn (`truoc_an`, `sau_an`, `bat_ky`), kiểm tra chéo từng mục với tài liệu nguồn. (2) Lọc bản ghi DAV còn hạn hiệu lực tại 27/11/2026 (hoặc chưa ghi ngày hết hạn): 49.808/55.030 bản ghi (bỏ 5.222 bản ghi hết hạn); tách **thuốc đơn chất** (hoạt chất duy nhất thuộc 18 hoạt chất) vào `registered_brands` — nguyên văn tên thuốc, chỉ gọn khoảng trắng và cắt chú thích đóng gói/xuất xưởng dính vào tên; **thuốc phối hợp** vào `combination_brands` (tối đa 40, chỉ để nhận diện). |
| Số dòng / số đoạn | 18 thuốc (`DRUG-01` → `DRUG-18`); tổng ~2.800 biệt dược đơn chất còn hạn + ~370 thuốc phối hợp đại diện. Số brand từng thuốc: Metformin 130, Glimepiride 198, Amlodipine 136, Perindopril 109, Losartan 172, Bisoprolol 128, Spironolactone 30, Furosemide 42, Atorvastatin 295, Simvastatin 123, Aspirin 43, Clopidogrel 162, Warfarin 14, Omeprazol 471, Levothyroxine 21, Canxi+D3 38, Ibuprofen 220, Paracetamol 686. |
| Phiên bản / ngày lấy | v2.0 — 27/11/2026 (v1.0: chỉ phần chuyên môn; v2.0 thêm phần đăng ký DAV) |
| Nhãn | Hai nhãn trong một file: phần chuyên môn `synthetic` (tổng hợp có đối chiếu tài liệu chuẩn); phần đăng ký `official` (dữ liệu công khai của Cục Quản lý Dược, nhóm chỉ lọc + làm sạch định dạng). |
| Giới hạn | Chỉ phủ 18 hoạt chất; thuốc ngoài danh mục (vd Gliclazide/Diamicron, kháng sinh, thuốc đông y) phải trả "chưa có trong dữ liệu" và chuyển dược sĩ. Chưa có hàm lượng chi tiết từng viên trong dữ liệu tra cứu (tên brand giữ nguyên hàm lượng nếu có). Bản ghi chưa ghi ngày hết hạn được giữ và đánh dấu qua `registration_note` (không phân biệt được còn hạn hay đã hết hạn). Match tên thuốc phụ thuộc logic của `tools.py` (exact → prefix → containment, không dấu, chữ thường). |

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

---

## Dataset 3 · Danh mục tương tác thuốc chống chỉ định BYT (`data/interactions-byt.json`)

| | |
|---|---|
| Dùng để làm gì | Nguồn tra cứu thứ cấp cho công cụ `check_interactions`: bảng tra "cặp chống chỉ định" theo **hoạt chất** — mở rộng phạm vi nhận diện cặp nặng ra ngoài 18 thuốc mẫu; mọi cặp trong danh mục này có mức độ **chống chỉ định** (mức nặng nhất). |
| Từ đâu | **Quyết định 5948/QĐ-BYT ngày 30/12/2022 của Bộ Y tế** ban hành "Danh mục tương tác thuốc chống chỉ định trong thực hành lâm sàng tại các cơ sở khám bệnh, chữa bệnh" — văn bản công khai (file gốc `data/quyet-dinh-5948-qd-byt.pdf`). Trích Bảng 3.1 "Danh mục tương tác thuốc theo từng hoạt chất" (633 cặp, trang 11–155). |
| Xử lý những bước gì | Trích xuất bảng PDF bằng script (pdfplumber) → hợp nhất các dòng bị wrap → ghép các tên thuốc bị ngắt giữa dòng (`Acenocoumar ol` → `Acenocoumarol`, `Lopinavir/ri tonavir` → `Lopinavir/ritonavir`…) → khử lỗi font (`(cid:…)` → ký tự tiếng Việt). Script trích xuất: `tools-extract/extract_byt.py` + `clean_byt.py` (không commit vào repo bài nộp, chỉ giữ lại để chạy lại được). **Nhóm KHÔNG thêm/sửa nội dung chuyên môn** — chỉ làm sạch định dạng. |
| Số dòng / số đoạn | 633 cặp (`BYT-001` → `BYT-633`), 257 hoạt chất khác nhau. Mỗi dòng: `code, drug_a, drug_b, mechanism (cơ chế), consequence (hậu quả), recommendation (xử trí)`. |
| Phiên bản / ngày lấy | v1.0 — 27/11/2026 (trích từ bản PDF gốc, không sửa nội dung) |
| Nhãn | **`official`** — văn bản quy phạm của Bộ Y tế, không phải dữ liệu tự dựng; khác nhãn với Dataset 1, 2 (`synthetic`). |
| Giới hạn | Danh mục chỉ gồm tương tác **mức chống chỉ định** (theo trang 7 của QĐ 5948: "các tương tác được đưa vào danh mục là các tương tác ở mức độ chống chỉ định") — không phủ tương tác mức trung bình/nhẹ; không thay thế tham khảo tương tác đầy đủ. Tên hoạt chất theo chính tả trong văn bản gốc (vd `Omeprazol`, không có `Levothyroxin`/`Clopidogrel`/`Spironolacton` trong danh mục chống chỉ định). Tra thuốc không khớp → trả "chưa có trong dữ liệu" và chuyển dược sĩ, không suy ra "không tương tác". |

---

## Dataset 4 · Lịch uống mẫu & ca bệnh mẫu (`data/medication_schedules.json`)

| | |
|---|---|
| Dùng để làm gì | Đầu vào mẫu cho agent (`answer`) và nguồn dựng bộ câu thử (`eval/benchmark.csv`): 8 ca bệnh mẫu (`patients`) phủ đủ 4 loại đường đi (ca lành · tương tác trung bình · tương tác nặng phải dừng · tách giờ) + 3 lịch nháp tham chiếu (`reference_schedules`) khớp đúng output shape của `build_schedule()` trong `codebase/tools.py`. |
| Từ đâu | Nhóm tự dựng — **không phải đơn thuốc của người thật**. Tổ hợp thuốc mô phỏng đơn điển hình của người cao tuổi có bệnh mạn tính; mỗi tên brand lấy nguyên văn từ dữ liệu đăng ký thật trong `data/drugs.json` (Dataset 1, nguồn DAV); mỗi kỳ vọng tương tác trỏ đúng mã cặp trong `data/interactions.json` (INT-01…INT-12). |
| Xử lý những bước gì | Dựng ca theo từng đường đi của trải nghiệm (spec §6); kiểm tự động: 24/24 thuốc trong lịch tra ra đúng `expected_drug_code` bằng logic match của `tools.py`; mọi `expected_interaction_codes` tồn tại trong `interactions.json`. |
| Số dòng / số đoạn | 8 ca (`PAT-01` → `PAT-08`) · 3 lịch tham chiếu (`SCH-01` → `SCH-03`). |
| Phiên bản / ngày lấy | v1.0 — 28/11/2026 |
| Nhãn | **`synthetic`** — toàn bộ ca bệnh, tên người bệnh và tổ hợp thuốc đều dựng; brand là tên đăng ký thật nhưng không gắn với người dùng thật nào. |
| Giới hạn | Không phải khuyến cáo y tế; không dùng thay thế đơn bác sĩ. Biến thể chính tả sai (fuzzy) không đặt ở data lịch — dành cho câu thử ở `eval/benchmark.csv` (test hành vi G10 của agent, không phải dữ liệu). Khi thêm ca mới: thuốc phải tra được trong Dataset 1, cặp tương tác phải có trong Dataset 2/3; nếu kỳ vọng khác kết quả công cụ thì sửa giả thuyết ca, không sửa dữ liệu cho khớp output. |
