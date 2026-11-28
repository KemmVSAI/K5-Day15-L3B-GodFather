"""Nối model — chỗ DUY NHẤT trong bản chạy thử gọi model AI.

Hợp đồng (giữ nguyên để khung đo được token):
    call_model(system: str, user: str) -> dict với 4 khoá
        "text":       str   chữ model trả về
        "model":      str   tên model đã gọi (để tra giá ở bảng giá model)
        "tokens_in":  int   số token vào, lấy từ trường usage trong phản hồi API — KHÔNG ước lượng
        "tokens_out": int   số token ra, gồm cả token suy luận / suy nghĩ nếu API tính riêng

Hỗ trợ đầy đủ các nhà cung cấp qua biến môi trường trong `.env` (TUYỆT ĐỐI KHÔNG hardcode API key):
    - fake (mặc định khi chưa điền MODEL_PROVIDER)
    - openrouter (mặc định gói free: nvidia/nemotron-3.5-lightning:free, dự phòng particle-ai/particle-1:free khi 429)
    - openai (hoặc openai_compatible / deepseek / groq qua API_BASE_URL)
    - gemini (Google Gemini REST API — dùng header x-goog-api-key, cộng cả thoughtsTokenCount)
    - anthropic / claude (Anthropic Messages API)
    - ollama (model chạy cục bộ tại localhost:11434)
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request

from tracing import model_call

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOW_RAW = False  # đổi thành True khi cần in nguyên phản hồi API để kiểm trường usage

URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"
URL_OPENAI = "https://api.openai.com/v1/chat/completions"
URL_CLAUDE = "https://api.anthropic.com/v1/messages"
URL_GEMINI_TMPL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
URL_OLLAMA = "http://localhost:11434/api/chat"

# Giữ biến _OPENROUTER_FALLBACKS vì codebase/web.py import trực tiếp cho /api/status
_OPENROUTER_FALLBACKS = [
    "nvidia/nemotron-3.5-lightning:free",
    "particle-ai/particle-1:free",
]


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


def _runtime_config() -> tuple:
    """Đọc cấu hình model hiện tại từ biến môi trường (hỗ trợ cả khi biến được nạp sau import)."""
    provider = (os.environ.get("MODEL_PROVIDER") or MODEL_PROVIDER or "fake").strip().lower()
    model_name = (os.environ.get("MODEL_NAME") or MODEL_NAME or "").strip()
    api_key = (os.environ.get("API_KEY") or API_KEY or "").strip()
    timeout_raw = (os.environ.get("MODEL_TIMEOUT_SECONDS") or "60").strip()
    try:
        timeout = max(5, int(timeout_raw))
    except ValueError:
        timeout = 60
    return provider, model_name, api_key, timeout


def _post_json(url: str, headers: dict, body: dict, timeout: int = 60) -> dict:
    """Gửi POST JSON bằng thư viện chuẩn (urllib), trả về dict phản hồi."""
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers=dict({"Content-Type": "application/json"}, **headers),
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError("HTTP %d: %s" % (e.code, e.read().decode("utf-8", "replace")[:300])) from None
    except urllib.error.URLError as e:
        raise RuntimeError("Lỗi kết nối tới API model: %s" % e.reason) from None
    if SHOW_RAW:
        print(json.dumps(data, ensure_ascii=False, indent=2)[:3000])
    return data


# Alias giữ tương thích nếu script khác gọi post_json
post_json = _post_json


def _require_key(provider: str, api_key: str) -> None:
    if not api_key:
        raise RuntimeError(
            "Thiếu API_KEY trong file .env cho MODEL_PROVIDER=%s (xem .env.example và docs/connect-model.md)."
            % provider
        )


def _call_openrouter(system: str, user: str, model_name: str, api_key: str, timeout: int) -> dict:
    """Gọi OpenRouter (chuẩn OpenAI). Khi 429/502/503 tự động thử model dự phòng.
    `MODEL_MAX_TOKENS` có thể điều chỉnh; reasoning model cần đủ budget cho phần trả lời."""
    _require_key("openrouter", api_key)
    try:
        max_tokens = max(256, int(os.environ.get("MODEL_MAX_TOKENS", "8192")))
    except ValueError:
        max_tokens = 8192
    candidates = [model_name] if model_name else []
    candidates += [m for m in _OPENROUTER_FALLBACKS if m not in candidates]
    url = (os.environ.get("API_BASE_URL") or URL_OPENROUTER).strip()
    last_error = None
    for model_id in candidates:
        messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}]
        try:
            data = _post_json(
                url,
                {"Authorization": "Bearer " + api_key},
                {"model": model_id, "messages": messages, "max_tokens": max_tokens, "temperature": 0.2},
                timeout=timeout,
            )
        except RuntimeError as e:
            last_error = e
            if any(code in str(e) for code in ("HTTP 429", "HTTP 502", "HTTP 503")):
                continue
            raise
        u = data.get("usage") or {}
        return {
            "text": ((data.get("choices") or [{}])[0].get("message", {}).get("content") or "").strip(),
            "model": data.get("model") or model_id,
            "tokens_in": int(u.get("prompt_tokens") or 0),
            "tokens_out": int(u.get("completion_tokens") or 0),
        }
    raise last_error or RuntimeError("Không gọi được model nào trên OpenRouter")


def _call_openai(system: str, user: str, model_name: str, api_key: str, timeout: int) -> dict:
    """Gọi OpenAI hoặc API tương thích chuẩn OpenAI Chat Completions (qua API_BASE_URL)."""
    _require_key("openai", api_key)
    if not model_name:
        raise RuntimeError("Thiếu MODEL_NAME trong .env cho MODEL_PROVIDER=openai.")
    url = (os.environ.get("API_BASE_URL") or URL_OPENAI).strip()
    messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}]
    data = _post_json(
        url,
        {"Authorization": "Bearer " + api_key},
        {"model": model_name, "messages": messages, "max_tokens": 2048, "temperature": 0.2},
        timeout=timeout,
    )
    u = data.get("usage") or {}
    return {
        "text": ((data.get("choices") or [{}])[0].get("message", {}).get("content") or "").strip(),
        "model": data.get("model") or model_name,
        "tokens_in": int(u.get("prompt_tokens") or 0),
        "tokens_out": int(u.get("completion_tokens") or 0),
    }


def _call_claude(system: str, user: str, model_name: str, api_key: str, timeout: int) -> dict:
    """Gọi Anthropic Claude Messages API."""
    _require_key("anthropic", api_key)
    if not model_name:
        raise RuntimeError("Thiếu MODEL_NAME trong .env cho MODEL_PROVIDER=anthropic.")
    data = _post_json(
        URL_CLAUDE,
        {"x-api-key": api_key, "anthropic-version": "2023-06-01"},
        {
            "model": model_name,
            "max_tokens": 1536,
            "temperature": 0.2,
            "system": system or "",
            "messages": [{"role": "user", "content": user}],
        },
        timeout=timeout,
    )
    text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
    u = data.get("usage") or {}
    return {
        "text": text,
        "model": data.get("model") or model_name,
        "tokens_in": int(u.get("input_tokens") or 0),
        "tokens_out": int(u.get("output_tokens") or 0),
    }


def _call_gemini(system: str, user: str, model_name: str, api_key: str, timeout: int) -> dict:
    """Gọi Google Gemini generateContent API (truyền key qua header x-goog-api-key, cộng cả thoughtsTokenCount)."""
    _require_key("gemini", api_key)
    if not model_name:
        raise RuntimeError("Thiếu MODEL_NAME trong .env cho MODEL_PROVIDER=gemini.")
    safe_model = urllib.parse.quote(model_name, safe=".-_")
    url = URL_GEMINI_TMPL.format(model=safe_model)
    body = {
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2048},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    data = _post_json(url, {"x-goog-api-key": api_key}, body, timeout=timeout)
    candidates = data.get("candidates") or []
    parts = (candidates[0].get("content") or {}).get("parts", []) if candidates else []
    text = "".join(p.get("text", "") for p in parts if isinstance(p, dict) and not p.get("thought")).strip()
    usage = data.get("usageMetadata") or {}
    tokens_in = int(usage.get("promptTokenCount") or 0)
    tokens_out = int(usage.get("candidatesTokenCount") or 0) + int(usage.get("thoughtsTokenCount") or 0)
    return {"text": text, "model": model_name, "tokens_in": tokens_in, "tokens_out": tokens_out}


def _call_ollama(system: str, user: str, model_name: str, timeout: int) -> dict:
    """Gọi model chạy cục bộ qua Ollama."""
    if not model_name:
        raise RuntimeError("Thiếu MODEL_NAME trong .env cho MODEL_PROVIDER=ollama.")
    url = (os.environ.get("OLLAMA_URL") or URL_OLLAMA).strip()
    messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}]
    data = _post_json(
        url,
        {},
        {"model": model_name, "messages": messages, "stream": False},
        timeout=max(timeout, 300),
    )
    text = ((data.get("message") or {}).get("content") or "").strip()
    return {
        "text": text,
        "model": model_name,
        "tokens_in": int(data.get("prompt_eval_count") or 0),
        "tokens_out": int(data.get("eval_count") or 0),
    }


@model_call
def call_model(system: str, user: str) -> dict:
    provider, model_name, api_key, timeout = _runtime_config()
    if provider == "fake":
        last = (user.strip().splitlines() or [""])[-1]
        return {
            "text": "[câu trả lời giả — chưa nối model] " + last[:60],
            "model": "fake",
            "tokens_in": 0,
            "tokens_out": 0,
        }

    if provider == "openrouter":
        r = _call_openrouter(system, user, model_name, api_key, timeout)
    elif provider in ("openai", "openai_compatible", "deepseek", "groq"):
        r = _call_openai(system, user, model_name, api_key, timeout)
    elif provider in ("anthropic", "claude"):
        r = _call_claude(system, user, model_name, api_key, timeout)
    elif provider in ("gemini", "google"):
        r = _call_gemini(system, user, model_name, api_key, timeout)
    elif provider == "ollama":
        r = _call_ollama(system, user, model_name, timeout)
    else:
        raise NotImplementedError(
            "Chưa hỗ trợ MODEL_PROVIDER=%s trong codebase/ai.py — hỗ trợ: fake, openrouter, openai, gemini, anthropic, ollama."
            % provider
        )

    return {
        "text": str(r["text"]),
        "model": str(r["model"]),
        "tokens_in": int(r["tokens_in"]),
        "tokens_out": int(r["tokens_out"]),
    }
