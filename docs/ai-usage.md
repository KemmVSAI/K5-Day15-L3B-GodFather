# Khai báo dùng AI

README của nhóm có mục "Dùng AI vào việc gì" (2–3 dòng, bắt buộc). Ghi chi tiết vào bảng dưới đây.

> Luật của đề: dùng AI để làm bài thoải mái, nhưng **ai không giải thích được phần có tên mình thì phần đó nhận 0 điểm**. Khai thiếu không bị trừ; giấu mới bị.

| Việc | Công cụ AI | AI làm gì | Người kiểm/sửa gì | Ai phụ trách |
|---|---|---|---|---|
| Code bản chạy thử | Claude Code (coding agent) | Viết khung `tools.py`, `agent.py` theo sơ đồ §4; trích xuất QĐ 5948 thành `data/interactions-byt.json` (script `tools-extract/`); backend 3 phần (backend_tools/backend_agent/api.py) | Review từng commit; chạy lại `run.py check` + test 4 ca preset tay | Đ.Q. Việt (kiến trúc, guardrail) · N.T. Dũng (luồng, tools) |
| Prompt / thiết kế lời gọi mô hình | Claude Code soạn nháp | SYSTEM prompt trong `agent.py` + `_model_prompt` (ràng buộc chỉ dựa công cụ) | Việt duyệt từng nguyên tắc khớp §4; test tấn công B11/B12 không nhường | Đ.Q. Việt |
| Đào data (viết script đếm, gợi ý nhãn) | Claude Code | Script `evidence/count_reviews.py` (iTunes RSS công khai); gợi ý nhãn từ khoá | **Kiểm tay 30/150 dòng** nhãn tư vấn, khớp 30/30; trích dẫn nguyên văn lấy nguyên văn review | L.S.L. Nhật + Đ.Q. Việt |
| Rà câu hỏi phỏng vấn / khảo sát | — | Chỉ rà câu dẫn dắt | Câu hỏi P1 viết tay theo Mom Test | L.S.L. Nhật |
| Viết câu thử (benchmark) | — | 13 câu CP2 viết tay theo lưới độ phủ §5; câu AI viết: **0** | Mỗi câu có `source` trỏ data/track | L.S.L. Nhật |
| Sinh data `synthetic` (nếu có) | — | 18 thuốc + 12 cặp: tra tay từ Dược thư QG VN, tờ HDSD, Drugs.com; QĐ 5948: trích xuất script (không phải AI sinh nội dung) | Seed không dùng (data tay) · kiểm tay từng mục, nguồn từng dòng ở `DATA_CARD.md` | V.Q. Thắng |
| Chấm cột `pass` bằng LLM (nếu có) | — | metric `tu_choi_dung` grader=llm (chỉ chạy khi có model thật); LLM chỉ gợi ý, quyết định pass là người | Kiểm tra thủ công toàn bộ câu `tu_choi` sau lượt 1 | L.S.L. Nhật + Đ.Q. Việt |
| Slide, văn bản | — | (CP4) | | |
| Model trong sản phẩm | OpenRouter — `nvidia/nemotron-3.5-lightning:free` | Chỉ viết lại câu tóm tắt rủi ro (`risk_summary`) trên căn cứ công cụ | Guardrail cứng bằng code — model không đổi được mức, không khoá/bỏ khoá lịch | Đ.Q. Việt |

**Không dùng AI để:** tạo người được phỏng vấn, trích dẫn, câu trả lời khảo sát; sửa kết quả các lượt đã chạy (`eval/run-*.csv`, `cost/simulate-*.csv`, `traces/`).

**Tái dùng code lab:** code trích xuất `data/interactions-byt.json` viết mới cho bài (script giữ ở `tools-extract/` ngoài repo); không tái dùng lab nào.
