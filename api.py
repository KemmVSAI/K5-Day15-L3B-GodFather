"""api.py — Phần 3 của Backend (FastAPI hợp nhất cho cả 2 chuẩn Frontend).

Hỗ trợ đầy đủ cả 2 nhóm endpoint:
  1. Chuẩn JSON Contract 3.1 & 3.2 (phancong.md):
     - GET  /api/presets   → 4 ca mẫu phục vụ demo 5 phút
     - POST /api/analyze   → nhận {medications, notes} → backend_agent.analyze_medications()
     - GET  /api/health    → kiểm server + nguồn data đang dùng
  2. Chuẩn React Frontend (`frontend/server/lib/medication-backend.ts` & `codebase/web.py`):
     - GET  /api/status    → {model, model_name, demo_mode, sources, drugs_count, interactions_count}
     - POST /api/check     → nhận {text} → gọi codebase/agent.answer() → {output, meta, usage}

Chạy server bằng 1 lệnh duy nhất:
    uvicorn api:app --reload        (hoặc: python api.py)

Tách biệt hoàn toàn, không làm gãy `python run.py check / eval / simulate`.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from typing import Any, List, Literal, Optional, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

ROOT = os.path.dirname(os.path.abspath(__file__))
_CODEBASE = os.path.join(ROOT, "codebase")
if _CODEBASE not in sys.path:
    sys.path.insert(0, _CODEBASE)

import ai as ai_module  # noqa: E402
import agent as core_agent  # noqa: E402
import backend_agent  # noqa: E402
import tracing  # noqa: E402
from tools import data_status  # noqa: E402

API_TIMEOUT_SECONDS = int(os.environ.get("API_ANALYZE_TIMEOUT_SECONDS", "90"))

app = FastAPI(
    title="GodFather — Track B2 API",
    description="Kiểm tra tương tác thuốc, trùng hoạt chất & xếp lịch nháp an toàn cho người cao tuổi",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 4 ca mẫu — đúng JSON Contract 3.1 (phancong.md)
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


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    """Request body của POST /api/analyze — nhận list[str] hoặc chuỗi ngăn cách phẩy/xuống dòng."""

    medications: Union[List[str], str] = Field(default_factory=list, description="Danh sách tên thuốc người dùng nhập")
    notes: Optional[str] = Field(default="", description="Ghi chú tuỳ chọn của người dùng")

    @field_validator("medications", mode="before")
    @classmethod
    def _normalize_med_input(cls, v: Any):
        if v is None:
            return []
        raw_items = [v] if isinstance(v, str) else list(v)
        out = []
        for item in raw_items:
            if not isinstance(item, str):
                continue
            for part in re.split(r"[,;\n]+", item):
                cleaned = part.strip()
                if cleaned:
                    out.append(cleaned)
        return out

    @field_validator("notes", mode="before")
    @classmethod
    def _normalize_notes(cls, v: Any):
        return "" if v is None else str(v)


class AnalyzeResponse(BaseModel):
    """Response body — JSON Contract 3.2 (validate trước khi trả về UI)."""

    risk_level: Literal["GREEN", "YELLOW", "RED"]
    risk_summary: str
    escalate_to_pharmacist: bool
    interactions: list
    schedule_locked: bool
    schedule: dict
    pharmacist_summary: str
    trace: dict


class CheckRequest(BaseModel):
    """Request body của POST /api/check — tương thích React Frontend (`frontend/server/lib/medication-backend.ts`)."""

    text: str = Field(..., description="Danh sách thuốc / câu hỏi tự do")


def _load_status_counts() -> tuple:
    drugs_path = os.path.join(ROOT, "data", "drugs.json")
    inter_path = os.path.join(ROOT, "data", "interactions.json")
    try:
        with open(drugs_path, encoding="utf-8-sig") as f:
            n_drugs = len(json.load(f).get("drugs", []))
    except Exception:
        n_drugs = 0
    try:
        with open(inter_path, encoding="utf-8-sig") as f:
            n_int = len(json.load(f).get("interactions", []))
    except Exception:
        n_int = 0
    return n_drugs, n_int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    """Kiểm server sống + nguồn data đang dùng."""
    try:
        provider, model_name, _, _ = ai_module._runtime_config()
        return {
            "status": "ok",
            "model_provider": provider,
            "model_name": model_name or ("fake" if provider == "fake" else ""),
            "data": data_status(),
        }
    except Exception as e:
        return {"status": "degraded", "error": "%s: %s" % (type(e).__name__, str(e)[:200])}


@app.get("/api/status")
def status():
    """Trạng thái backend cho React Frontend (`frontend/server/lib/medication-backend.ts`)."""
    provider, model_name, _, _ = ai_module._runtime_config()
    if not model_name and provider == "openrouter":
        model_name = (ai_module._OPENROUTER_FALLBACKS or [""])[0]
    n_drugs, n_int = _load_status_counts()
    return {
        "model": provider,
        "model_name": model_name or ("fake" if provider == "fake" else ""),
        "demo_mode": provider in ("", "fake"),
        "sources": data_status(),
        "drugs_count": n_drugs,
        "interactions_count": n_int,
    }


@app.get("/api/presets")
def get_presets():
    """4 ca mẫu phục vụ demo 5 phút — JSON Contract 3.1."""
    return {"presets": PRESETS}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    """Nhận {medications, notes} → gọi backend_agent → validate JSON Contract 3.2 → trả UI."""
    meds = [str(m).strip() for m in (req.medications or []) if str(m).strip()]
    notes = (req.notes or "").strip()
    if not meds and not notes:
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
        result = await asyncio.wait_for(
            asyncio.to_thread(
                backend_agent.analyze_medications,
                meds,
                notes,
                "api-" + os.urandom(3).hex(),
            ),
            timeout=API_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=504,
            content={"detail": {"error": "LLM_TIMEOUT", "message": "Hệ thống phản hồi quá thời gian cho phép (%ds)." % API_TIMEOUT_SECONDS}},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": {"error": "ANALYZE_FAILED", "message": "%s: %s" % (type(e).__name__, str(e)[:300])}},
        )

    try:
        return AnalyzeResponse.model_validate(result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "CONTRACT_VIOLATION", "message": "Kết quả không khớp JSON Contract: %s" % str(e)[:300]},
        )


@app.post("/api/check")
async def check_medications(req: CheckRequest):
    """Endpoint tương thích trực tiếp với React Frontend (`frontend/server/lib/medication-backend.ts`) & `codebase/web.py`."""
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail={"error": "bad_request", "message": "Vui lòng nhập danh sách thuốc trước khi kiểm tra."},
        )
    if len(text) > 5000:
        raise HTTPException(
            status_code=400,
            detail={"error": "bad_request", "message": "Nội dung quá dài (tối đa 5.000 ký tự)."},
        )

    def _run_check():
        tracing.begin("api-check")
        try:
            res = core_agent.answer(text)
            summary, _ = tracing.end()
            return res, summary
        except Exception:
            tracing.end()
            raise

    try:
        result, summary = await asyncio.wait_for(asyncio.to_thread(_run_check), timeout=API_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=504,
            content={"error": "timeout", "message": "Hệ thống phản hồi quá thời gian cho phép (%ds)." % API_TIMEOUT_SECONDS},
        )
    except NotImplementedError as e:
        return JSONResponse(
            status_code=503,
            content={"error": "model_not_connected", "message": "Chưa nối model AI: %s" % e},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "internal", "message": "Lỗi xử lý phía server: %s: %s" % (type(e).__name__, e)},
        )

    return {
        "output": result.get("output", ""),
        "meta": result.get("meta") or {},
        "usage": summary,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", "8000")))
