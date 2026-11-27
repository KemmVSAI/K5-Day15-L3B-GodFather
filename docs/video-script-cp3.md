# Kịch bản quay Video 30 giây — CP3 (bản chạy thử gọi AI thật)

> CP3 yêu cầu video 30 giây: thao tác thật, AI trả kết quả thật. YouTube "Không công khai"
> hoặc Drive "Bất kỳ ai có đường liên kết". **Mở thử link bằng cửa sổ ẩn danh** trước khi nộp.
> Sau khi quay, thay dòng "link video: ____" ở README.md mục 7 bằng link.

## Chuẩn bị trước khi quay (2 phút)

1. Mở terminal: `python run.py web` → http://127.0.0.1:8000
2. Kiểm badge trên phải hiện **"Model: nvidia/nemotron-3.5-lightning:free"** (không phải "Chế độ demo").
3. Mở sẵn 2 tab: trang web + trang YouTube/Drive để dừng quay giữa chừng nếu lỗi.
4. Dựng sẵn câu nhập (copy để dán nhanh — đừng gõ tay mất giờ quay):
   - "Mẹ uống Coumadin với Aspirin pH8, hôm nay bác sĩ ngoài cho thêm Allopurinol. Kiểm giúp rồi xếp lịch cho mẹ."
5. Bật trình quay màn hình (Win+G trên Windows / Cmd+Shift+5 trên macOS). Bấm quay.

## Kịch bản 30 giây (giữ nhịp — mỗi mục ~5 giây)

| Giây | Thao tác | Lời nói (nếu có tiếng) |
|---|---|---|
| 0–5 | Chỉ badge "Model: …free" + tên sản phẩm | "Thuốc Nhà — trợ lý kiểm tra tương tác thuốc cho người nhà cao tuổi, chạy AI thật." |
| 5–10 | Dán câu RED (Coumadin + Aspirin + Allopurinol), bấm Kiểm tra | "Nhập danh sách thuốc mẹ uống theo tên trên vỏ hộp." |
| 10–20 | Kết quả hiện: risk-card ĐỎ + cặp Warfarin–Aspirin NẶNG + Allopurinol "chưa có trong dữ liệu" + lịch bị chặn | "Hệ thống tra data của nhóm, cảnh báo cặp nặng, báo rõ thuốc ngoài danh mục và không xếp lịch tự động." |
| 20–27 | Bấm "Hỏi Dược Sĩ Ngay" → modal phiếu nháp → bấm Copy | "Tạo sẵn phiếu hỏi dược sĩ để gửi Zalo — hệ thống không tự gửi." |
| 27–30 | Chỉ usage line (token thật) | "Mọi kết quả đo được token, mọi quyết định an toàn là code đọc data." |

## Sau khi quay

1. Xem lại 1 lần: chữ trên màn hình đọc được không, số token có hiện không.
2. Tải YouTube (đặt "Không công khai") hoặc Drive (chia sẻ "Bất kỳ ai có đường liên kết").
3. Mở link bằng **cửa sổ ẩn danh** — thấy được mới nộp.
4. Sửa README.md mục 7: thay `link video: ____` bằng link.
