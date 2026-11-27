"""api.py — Phần 3 của Backend (theo tài liệu phân công 3 phần).

Tầng API FastAPI cho Frontend:
    GET  /api/presets   → 4 ca mẫu (JSON Contract 3.1)
    POST /api/analyze   → nhận {medications, notes} → backend_agent.analyze_medications()
                          → trả JSON Contract 3.2 (validate trước khi trả)
    GET  /api/health    → kiểm server + nguồn data đang dùng

Chạy server:
    python -m pip install -r requirements.txt   (một lần)
    uvicorn api:app --reload                    (hoặc: python api.py)

Không làm gãy CLI đánh giá: api.py tách biệt hoàn toàn — run.py không import file này.
"""
from __future__ import annotations

import os
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

_CODEBASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "codebase")
if _CODEBASE not in sys.path:
    sys.path.insert(0, _CODEBASE)

import backend_agent  # noqa: E402
import backend_tools  # noqa: E402
from tools import data_status  # noqa: E402

app = FastAPI(
    title="GodFather — Track B2 API",
    description="Kiểm tra tương tác thuốc & xếp lịch nháp cho người con sắp thuốc hộ cha mẹ cao tuổi",
    version="1.0.0",
)

# CORS: Frontend gọi trực tiếp từ trình duyệt không lỗi
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # demo trong lớp; xuống production thay bằng domain cụ thể
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 4 ca mẫu — đúng JSON Contract 3.1, chốt cứng để Frontend ghép giao diện
# ---------------------------------------------------------------------------
PRESETS = [
    {
        "id": "safe",
        "label": "Ca 1: An toàn",
        "medications": ["Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 10mg", "Vitamin D3"],
        "notes": "Uống duy trì hàng ngày",
    },
    {
        "id": "yellow",
        "label": "Ca 2: Cảnh báo vàng (Tách giờ / Trùng hoạt chất)",
        "medications": ["Levothyroxine 50mcg", "Canxi Carbonate 500mg", "Panadol 500mg", "Efferalgan 500mg"],
        "notes": "Mẹ hay uống chung buổi sáng",
    },
    {
        "id": "red",
        "label": "Ca 3: Báo động đỏ (Tương tác nặng)",
        "medications": ["Warfarin 5mg", "Aspirin 81mg", "Ibuprofen 400mg", "Omeprazole 20mg"],
        "notes": "Mới mua thêm thuốc giảm đau khớp",
    },
    {
        "id": "edge",
        "label": "Ca 4: Ca khó / Ngoài thẩm quyền",
        "medications": ["Thuốc huyết áp viên màu hồng", "Thuốc đau đầu gói xanh"],
        "notes": "Mẹ đang đau ngực, kê thêm thuốc giúp tôi",
    },
]


class AnalyzeRequest(BaseModel):
    """Request body của POST /api/analyze — JSON Contract 3.2."""

    medications: list[str] = Field(default_factory=list, description="Danh sách tên thuốc người dùng nhập")
    notes: str = Field(default="", description="Ghi chú tuỳ chọn của người dùng")


class AnalyzeResponse(BaseModel):
    """Response body — JSON Contract 3.2 (validate trước khi trả về UI)."""

    risk_level: str
    risk_summary: str
    escalate_to_pharmacist: bool
    interactions: list
    schedule_locked: bool
    schedule: dict
    pharmacist_summary: str
    trace: dict


@app.get("/api/health")
def health():
    """Kiểm server sống + nguồn data đang dùng (data/ hay mock fallback)."""
    try:
        status = data_status()
        return {"status": "ok", "data": status, "model_note": "(xem trace.model_note sau mỗi lần analyze)"}
    except Exception as e:  # lỗi đọc data vẫn trả 200 để Frontend biết server sống
        return {"status": "degraded", "error": "%s: %s" % (type(e).__name__, str(e)[:200])}


@app.get("/api/presets")
def get_presets():
    """4 ca mẫu phục vụ demo 5 phút — JSON Contract 3.1."""
    return {"presets": PRESETS}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """Nhận danh sách thuốc → gọi agent → validate JSON Contract 3.2 → trả UI.

    Xử lý lỗi: đầu vào rỗng → 400; lỗi bất ngờ → 500 với message rõ ràng
    (Frontend hiện trạng thái Lỗi mà không chết console).
    """
    meds = [str(m).strip() for m in (req.medications or []) if str(m).strip()]
    if not meds and not (req.notes or "").strip():
        raise HTTPException(
            status_code=400,
            detail={"error": "EMPTY_INPUT", "message": "Danh sách thuốc trống — vui lòng nhập tên thuốc trên vỏ hộp."},
        )
    if len(meds) > 30:
        raise HTTPException(
            status_code=400,
            detail={"error": "TOO_MANY_MEDS", "message": "Tối đa 30 thuốc mỗi lần kiểm tra."},
        )

    try:
        result = backend_agent.analyze_medications(meds, notes=req.notes, trace_id="api-" + os.urandom(3).hex())
    except Exception as e:  # lỗi bất ngờ trong luồng agent — trả 500 rõ ràng
        raise HTTPException(
            status_code=500,
            detail={"error": "ANALYZE_FAILED", "message": "%s: %s" % (type(e).__name__, str(e)[:300])},
        )

    # Validate đúng JSON Contract trước khi trả (ép kiểu + khoá bắt buộc)
    try:
        validated = AnalyzeResponse(**result)
        return validated
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "CONTRACT_VIOLATION", "message": "Kết quả không khớp JSON Contract: %s" % str(e)[:300]},
        )


if __name__ == "__main__":
    # python api.py → chạy uvicorn thay vì phải nhớ câu lệnh
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
