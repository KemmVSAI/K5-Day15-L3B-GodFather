# Nguồn dữ liệu & Thư mục Google Drive — Nhóm GodFather (Track B2)

File này lưu đường link tới **thư mục Google Drive công khai** chứa các bộ dữ liệu gốc dung lượng lớn (không commit trực tiếp vào GitHub theo quy tắc repo) và danh sách đầy đủ link tải dữ liệu 2 lớp (**Lớp 1: Biệt dược & ngữ cảnh VN · Lớp 2: Tương tác lâm sàng theo hoạt chất**) để cả nhóm tiện tải về dùng chung.

> **Lưu ý an toàn:** Tuyệt đối không đưa đơn thuốc thật, tên thật hoặc bệnh án thật của bệnh nhân vào repo hay Google Drive.

---

## 1. Thư mục Google Drive dùng chung (Public — Ai có link đều xem/tải được)

- **Link thư mục:** https://drive.google.com/drive/folders/1TBlVLU7k_1fNiTUSa7KI70_twFIGx_vv
- **Các file đã tải sẵn trong Drive:**
  - `README_DATA_LINKS.md` — Bảng tổng hợp đầy đủ link tải các bộ dữ liệu (Lớp 1 & Lớp 2)
  - `ddinter_downloads_code_A.csv` (3.2 MB) — Tương tác thuốc nhóm **A** (Tiêu hóa & Chuyển hóa: tiểu đường, dạ dày, canxi…)
  - `ddinter_downloads_code_B.csv` (847 KB) — Tương tác thuốc nhóm **B** (Máu & Chống đông: Warfarin, Aspirin, Clopidogrel…)
  - `ddinter_downloads_code_M.csv` (1.2 MB) — Tương tác thuốc nhóm **M** (Cơ – Xương – Khớp: NSAID như Ibuprofen…)

---

## 2. Danh sách link tải nhanh theo 2 lớp dữ liệu

### Lớp 1 · Biệt dược lưu hành & Ngữ cảnh người dùng Việt Nam
| Bộ dữ liệu / Nguồn | Link trực tiếp | Mục đích |
|---|---|---|
| **DrugBank Việt Nam** *(Cục Quản lý Dược – Bộ Y tế)* | https://drugbank.vn | Tra số đăng ký, tên biệt dược lưu hành tại VN & hoạt chất chuẩn cho `data/drugs.json` |
| **Long Châu Medical Dataset** (`mtue29/vietnamese-medical-dataset`) | https://huggingface.co/datasets/mtue29/vietnamese-medical-dataset | Dữ liệu thuốc & giáo dục sức khỏe từ Nhà thuốc Long Châu (~463k dòng) |
| **Medical Vietnamese QA** (`Dqdung205/medical-vietnamese-qa`) | https://huggingface.co/datasets/Dqdung205/medical-vietnamese-qa | Hỏi–đáp y tế từ Vinmec & Long Châu |
| **ViMedAQA** (`tmnam20/ViMedAQA`) | https://huggingface.co/datasets/tmnam20/ViMedAQA | Ngữ cảnh lâm sàng, chỉ định, cách dùng & bảo quản thuốc tiếng Việt |
| **VietMed-NER** (`leduckhai/MultiMed`) | https://github.com/leduckhai/MultiMed/tree/master/VietMed-NER | Nhận diện thực thể y khoa tiếng Việt (tên thuốc, triệu chứng) |
| **ViHealthQA** (`tarudesu/ViHealthQA`) | https://huggingface.co/datasets/tarudesu/ViHealthQA | Câu hỏi bệnh nhân VN thực tế (bổ sung cách tả triệu chứng cho `check_red_flags`) |

### Lớp 2 · Tương tác thuốc lâm sàng ở cấp hoạt chất (DDI)
| Bộ dữ liệu | Link trực tiếp | Mục đích |
|---|---|---|
| **DDInter (Official Downloads)** | https://ddinter.scbdd.com/download/ | Cặp hoạt chất `Drug_A`, `Drug_B`, mức độ `Major / Moderate / Minor` (CC BY-NC-SA 4.0) |
| **DDInter CSV (Nhóm tim mạch `C`, tuyến giáp `H`, thần kinh `N`)** | • `C`: http://ddinter.scbdd.com/static/media/download/ddinter_downloads_code_C.csv<br>• `H`: http://ddinter.scbdd.com/static/media/download/ddinter_downloads_code_H.csv<br>• `N`: http://ddinter.scbdd.com/static/media/download/ddinter_downloads_code_N.csv | Tải bổ sung ngoài 3 file `A, B, M` đã có sẵn trên Drive |
| **DDInter Parser (GitHub)** | https://github.com/mnarayan1/DDInter | Script Python gom toàn bộ CSV DDInter sang JSON |
| **openFDA Drug Labeling** | • Bulk: https://open.fda.gov/apis/drug/label/download/<br>• API: `https://api.fda.gov/drug/label.json` | Kiểm chéo `drug_interactions`, `dosage_and_administration`, `boxed_warning` từ FDA |
| **RxNorm (NIH/NLM)** | • Chính thức: https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html<br>• Kaggle: https://www.kaggle.com/datasets/fda/rxnorm | Chuẩn hóa tên biệt dược ↔ hoạt chất quốc tế (RxCUI) |
