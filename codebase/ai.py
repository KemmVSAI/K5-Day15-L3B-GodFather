"""Nối model — chỗ DUY NHẤT trong bản chạy thử gọi model AI. NHÓM VIẾT phần gọi model thật.

Hợp đồng (giữ nguyên để khung đo được token):
    call_model(system: str, user: str) -> dict với 4 khoá
        "text":       str   chữ model trả về
        "model":      str   tên model đã gọi (để tra giá ở bảng giá model)
        "tokens_in":  int   số token vào, lấy từ trường usage trong phản hồi API — KHÔNG ước lượng
        "tokens_out": int   số token ra, gồm cả token suy luận / suy nghĩ nếu API tính riêng
    @model_call (từ tracing.py) tự ghi mỗi lần gọi vào trace; agent.py gọi call_model bao nhiêu lần
    cũng được, khung tự cộng token.
    Lỗi gọi model (hết lượt, sai key, mất mạng): cứ để exception bay ra — khung ghi lỗi vào cột error.

Chế độ giả (mặc định khi .env chưa có MODEL_PROVIDER, hoặc MODEL_PROVIDER=fake):
    trả một câu giả cố định, model "fake", token 0 — để luồng chạy hết từ trước CP2 (guide bước 3.2).
    Lượt `run.py eval` / `run.py simulate` chạy bằng model giả KHÔNG được tính.

Nối model thật: điền .env (chép từ .env.example), rồi viết nhánh gọi API ở dưới theo docs/connect-model.md
(có ví dụ OpenAI, Claude, model chạy trên máy, và cách nối nhà cung cấp khác). Không dán API key vào file này.
"""
import os

from tracing import model_call

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env(path=os.path.join(ROOT, ".env")):
    """Đọc file .env (KEY=VALUE mỗi dòng) vào biến môi trường, không ghi đè biến đã có. Khung — không cần sửa."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env()
MODEL_PROVIDER = (os.environ.get("MODEL_PROVIDER") or "fake").strip().lower()
MODEL_NAME = (os.environ.get("MODEL_NAME") or "").strip()
API_KEY = (os.environ.get("API_KEY") or "").strip()

# ---------------------------------------------------------------------------
# Gọi model thật — nhà cung cấp hiện dùng: OpenRouter (API chuẩn OpenAI, gói free)
# MODEL_NAME để trống trong .env thì dùng mặc định dưới đây (model free, chọn ngày 28/11/2026):
#   nvidia/nemotron-3.5-lightning:free — ổn định, tiếng Việt tốt; khi rate-limit tự thử model dự phòng.
# ---------------------------------------------------------------------------
URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"
_OPENROUTER_FALLBACKS = [
    "nvidia/nemotron-3.5-lightning:free",
    "particle-ai/particle-1:free",
]

import json  # noqa: E402
import urllib.error  # noqa: E402
import urllib.request  # noqa: E402


def _post_json(url, headers, body, timeout=60):
    """Gửi POST JSON, trả về JSON phản hồi. Chỉ dùng thư viện chuẩn (urllib)."""
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"), method="POST",
        headers=dict({"Content-Type": "application/json"}, **headers))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError("HTTP %d: %s" % (e.code, e.read().decode("utf-8", "replace")[:300]))


def _call_openai_compatible(system, user):
    """Gọi API chuẩn OpenAI (OpenRouter, DeepSeek…). Rate-limit (429) thì thử model dự phòng."""
    candidates = [MODEL_NAME] if MODEL_NAME else []
    candidates += [m for m in _OPENROUTER_FALLBACKS if m not in candidates]
    last_error = None
    for model_id in candidates:
        messages = ([{"role": "system", "content": system}] if system else []) + [
            {"role": "user", "content": user}
        ]
        try:
            data = _post_json(
                URL_OPENROUTER,
                {"Authorization": "Bearer " + API_KEY},
                {"model": model_id, "messages": messages, "max_tokens": 2048},
            )
        except RuntimeError as e:
            last_error = e
            if "HTTP 429" in str(e) or "HTTP 502" in str(e) or "HTTP 503" in str(e):
                continue  # rate-limit upstream: thử model dự phòng
            raise
        u = data.get("usage") or {}
        return {
            "text": (data["choices"][0]["message"]["content"] or "").strip(),
            "model": data.get("model") or model_id,
            "tokens_in": int(u.get("prompt_tokens") or 0),
            "tokens_out": int(u.get("completion_tokens") or 0),
        }
    raise last_error or RuntimeError("không gọi được model nào")


@model_call
def call_model(system: str, user: str) -> dict:
    if MODEL_PROVIDER == "fake":
        last = (user.strip().splitlines() or [""])[-1]
        return {"text": "[câu trả lời giả — chưa nối model] " + last[:60], "model": "fake", "tokens_in": 0, "tokens_out": 0}

    if MODEL_PROVIDER in ("openrouter", "openai"):
        r = _call_openai_compatible(system, user)
    elif MODEL_PROVIDER == "anthropic":
        r = _call_claude(system, user)
    else:
        raise NotImplementedError(
            "chưa viết phần gọi model thật cho MODEL_PROVIDER=%s trong codebase/ai.py — xem docs/connect-model.md"
            % MODEL_PROVIDER)
    return {"text": r["text"], "model": r["model"],
            "tokens_in": int(r["tokens_in"]), "tokens_out": int(r["tokens_out"])}


URL_CLAUDE = "https://api.anthropic.com/v1/messages"


def _call_claude(system, user):
    data = _post_json(
        URL_CLAUDE,
        {"x-api-key": API_KEY, "anthropic-version": "2023-06-01"},
        {"model": MODEL_NAME, "max_tokens": 1024, "system": system or "",
         "messages": [{"role": "user", "content": user}]})
    text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    u = data.get("usage") or {}
    return {"text": text, "model": data.get("model") or MODEL_NAME,
            "tokens_in": int(u.get("input_tokens") or 0), "tokens_out": int(u.get("output_tokens") or 0)}
