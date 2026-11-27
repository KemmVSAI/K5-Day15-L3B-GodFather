# TEAMS

> **Khi chấm và đánh giá, BTC dùng máy quét file này để ghép điểm cho từng người. Phải điền đúng format.**
> Giữ nguyên tên file `TEAMS.md` ở thư mục gốc repo, giữ nguyên các dòng `- Tên nhóm:` … và tiêu đề cột của bảng. Chỉ thay chỗ `____`.
> Kiểm bằng `python run.py check`: phần "Kiểm TEAMS.md" không báo gì là đúng format.

- Tên nhóm: GodFather
- Lớp: L3B
- Track: B
- Link repo: https://github.com/KemmVSAI/K5-Day15-L3B-GodFather

| STT | Họ và tên | Mã học viên | Vai trò | Phần việc chính |
|---|---|---|---|---|
| 1 | Đinh Quốc Việt | 2A202603885 | Đội trưởng | Tổng hợp canvas, nộp CP, kiến trúc agent |
| 2 | Lê Sỹ Long Nhật | 2A202603881 | Thành viên | Phỏng vấn người dùng và thu thập bằng chứng |
| 3 | Vương Quang Thắng | 2A202603855 | Thành viên | Dữ liệu thuốc/tương tác, DATA_CARD, bộ câu thử |
| 4 | Nguyễn Tuấn Dũng | 2A202603859 | Thành viên | Xây dựng codebase (tools.py, agent.py), chạy eval |

## Phân công CP2

| Người phụ trách | Đầu việc | File / đầu ra |
|---|---|---|
| Đinh Quốc Việt | Vẽ kiến trúc Input → AI Core → Chặn rủi ro → Output; ghi chỗ chuyển dược sĩ và chốt chuẩn đạt bằng số trước 19:30. | `spec.md` §4, §7 |
| Lê Sỹ Long Nhật | Viết ít nhất 10 câu thử có expected, điều kiện đạt và nguồn; định nghĩa ít nhất 3 metric đo được. | `eval/benchmark.csv`, `eval/metric_spec.yaml` |
| Vương Quang Thắng | Mô tả nguồn, cách xử lý và giới hạn dữ liệu; chuẩn bị dữ liệu mẫu/mock và chốt schema dùng chung. | `data/DATA_CARD.md`, dữ liệu trong `data/` |
| Nguyễn Tuấn Dũng | Thay workflow ví dụ bằng luồng mock chạy hết từ input đến output; chạy kiểm tra sau tích hợp. | `codebase/agent.py`, `codebase/tools.py`; `python run.py`, `python run.py check` |

**Bàn giao:** Thắng chốt schema/dữ liệu mẫu sớm cho Nhật và Dũng; Nhật và Dũng làm song song trên schema đó. Việt rà soát §4 và khóa ngưỡng §7 trước 19:30; không sửa chuẩn đạt sau thời điểm này.

**Quy tắc điền**
- **Lớp:** `L3A` hoặc `L3B`. **Track:** một chữ `A` (EdTech), `B` (Y tế), `C` (Du lịch), `D` (Thương mại điện tử), `E` (Tài chính) hoặc `F` (Làn khác). **Link repo:** link GitHub công khai của nhóm.
- Mỗi thành viên một dòng, nhóm **3–5 người**. Thiếu thì thêm dòng theo đúng mẫu, thừa thì xoá dòng.
- **Đội trưởng ở dòng 1**, cột Vai trò ghi đúng chữ `Đội trưởng`. Người khác ghi `Thành viên`.
- **Mã học viên** ghi đúng như trên hệ thống của khoá, không có khoảng trắng. Đội trưởng nộp các checkpoint bằng mã ở dòng 1.
- **Họ và tên** ghi đủ, có dấu.
- **Phần việc chính:** 1 dòng ngắn, khớp với phần có tên người đó trong repo.
