"""Web server cho bản chạy thử Track B2 — GodFather (thuần thư viện chuẩn Python).

Chạy bằng: python run.py web   (hoặc: python codebase/web.py)

Hỗ trợ đầy đủ CORS và tương thích với cả 2 chuẩn Frontend:
    - GET  /api/status        → {model, model_name, demo_mode, sources, drugs_count, registered_brands_count, interactions_count, byt_interactions_count}
    - GET  /api/health        → {status, data}
    - GET  /api/presets       → 4 ca mẫu (JSON Contract 3.1)
    - GET  /api/drugs/search  → gợi ý tên thuốc (autocomplete) theo ?q=...&limit=...
    - POST /api/check         → body {text} → gọi agent.answer() THẬT → {output, meta, usage}
    - POST /api/analyze       → body {medications, notes} → gọi backend_agent.analyze_medications() (JSON Contract 3.2)
"""
import json
import os
import sys
import urllib.parse

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

CODEBASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CODEBASE_DIR)
for _p in (CODEBASE_DIR, ROOT_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer  # noqa: E402

HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "8000"))

STATIC_DIR = os.path.join(CODEBASE_DIR, "web")
MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
}

_agent = None  # nạp trễ ở _load_agent()


def _load_agent():
    global _agent
    if _agent is None:
        import agent as _a
        _agent = _a
    return _agent


class Handler(BaseHTTPRequestHandler):
    server_version = "GodFatherB2/1.1"
    protocol_version = "HTTP/1.1"

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self._cors_headers()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _static(self, url_path):
        rel = url_path.lstrip("/") or "index.html"
        rel = rel.replace("..", "").replace("\\", "/")
        path = os.path.join(STATIC_DIR, rel)
        if not os.path.isfile(path):
            self._send(404, {"error": "not_found"})
            return
        ext = os.path.splitext(path)[1].lower()
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self._cors_headers()
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/api/health":
            _load_agent()
            from tools import data_status
            self._send(200, {"status": "ok", "data": data_status()})
        elif path == "/api/status":
            _load_agent()
            from tools import data_status
            ds = data_status()
            provider = (os.environ.get("MODEL_PROVIDER", "fake") or "fake").strip().lower()
            model_name = (os.environ.get("MODEL_NAME", "") or "").strip()
            if not model_name and provider == "openrouter":
                try:
                    from ai import _OPENROUTER_FALLBACKS
                    model_name = (_OPENROUTER_FALLBACKS or [""])[0]
                except Exception:
                    model_name = ""
            self._send(200, {
                "model": provider,
                "model_name": model_name or ("fake" if provider == "fake" else ""),
                "demo_mode": provider in ("", "fake"),
                "sources": ds,
                "drugs_count": ds["drugs_count"],
                "registered_brands_count": ds["registered_brands_count"],
                "interactions_count": ds["interactions_count"],
                "byt_interactions_count": ds["byt_interactions_count"],
            })
        elif path == "/api/presets":
            self._send(200, {"presets": _PRESETS})
        elif path == "/api/drugs/search":
            _load_agent()
            from tools import search_drugs
            qs = urllib.parse.parse_qs(parsed.query)
            q = (qs.get("q") or [""])[0]
            try:
                limit = int((qs.get("limit") or ["10"])[0])
            except ValueError:
                limit = 10
            self._send(200, {"query": q, "results": search_drugs(q, limit=limit)})
        elif path in ("/", "/index.html"):
            self._static("/index.html")
        else:
            self._static(path)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 200_000:
            return None, (400, {"error": "bad_request", "message": "Dữ liệu gửi lên không hợp lệ hoặc quá lớn."})
        try:
            raw = self.rfile.read(length).decode("utf-8", "replace")
            payload = json.loads(raw)
        except UnicodeDecodeError:
            return None, (400, {"error": "bad_request", "message": "Dữ liệu gửi lên phải là UTF-8."})
        except json.JSONDecodeError:
            return None, (400, {"error": "bad_request", "message": "Không đọc được dữ liệu gửi lên."})
        if not isinstance(payload, dict):
            return None, (400, {"error": "bad_request", "message": "Body JSON phải là một object."})
        return payload, None

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/api/check":
            payload, err = self._read_json_body()
            if err:
                self._send(err[0], err[1])
                return
            text = (payload.get("text") or "").strip()
            if not text:
                self._send(400, {"error": "bad_request", "message": "Vui lòng nhập danh sách thuốc trước khi kiểm tra."})
                return
            try:
                agent = _load_agent()
                tracing = __import__("tracing")
                tracing.begin("web")
                result = agent.answer(text)
                summary, _events = tracing.end()
                if not isinstance(result, dict) or "output" not in result:
                    raise ValueError("Agent trả kết quả không đúng hợp đồng")
                self._send(200, {
                    "output": result.get("output", ""),
                    "meta": result.get("meta") or {},
                    "usage": summary,
                })
            except NotImplementedError as e:
                self._send(503, {"error": "model_not_connected", "message": "Chưa nối model AI: %s" % e})
            except Exception as e:
                self._send(500, {"error": "internal", "message": "Lỗi xử lý phía server: %s: %s" % (type(e).__name__, e)})
            return

        if path == "/api/analyze":
            payload, err = self._read_json_body()
            if err:
                self._send(err[0], err[1])
                return
            meds_raw = payload.get("medications") or []
            if isinstance(meds_raw, str):
                meds = [p.strip() for p in meds_raw.replace("\n", ",").split(",") if p.strip()]
            else:
                meds = [str(m).strip() for m in meds_raw if str(m).strip()]
            notes = str(payload.get("notes") or "").strip()
            if not meds and not notes:
                self._send(400, {"error": "EMPTY_INPUT", "message": "Danh sách thuốc trống — vui lòng nhập tên thuốc trên vỏ hộp."})
                return
            if len(meds) > 30:
                self._send(400, {"error": "TOO_MANY_MEDS", "message": "Tối đa 30 thuốc mỗi lần kiểm tra."})
                return
            try:
                import backend_agent
                res = backend_agent.analyze_medications(meds, notes=notes, trace_id="web-api-" + os.urandom(3).hex())
                self._send(200, res)
            except Exception as e:
                self._send(500, {"error": "ANALYZE_FAILED", "message": "%s: %s" % (type(e).__name__, str(e)[:300])})
            return

        self._send(404, {"error": "not_found"})

    def log_message(self, fmt, *args):
        sys.stderr.write("[web] %s - %s\n" % (self.address_string(), fmt % args))


_PRESETS = [
    {
        "id": "safe",
        "label": "Ca 1: An toàn",
        "medications": ["Amlodipine 5mg", "Metformin 500mg", "Atorvastatin 10mg", "Vitamin D3"],
        "notes": "Uống duy trì hàng ngày",
        "input_text": "Mẹ uống Glucophage, Amlodipine, Lipitor và Canxi D3 hằng ngày",
    },
    {
        "id": "yellow",
        "label": "Ca 2: Cảnh báo vàng (Tách giờ / Trùng hoạt chất)",
        "medications": ["Levothyroxine 50mcg", "Canxi Carbonate 500mg", "Panadol 500mg", "Efferalgan 500mg"],
        "notes": "Mẹ hay uống chung buổi sáng",
        "input_text": "Mẹ uống Levothyrox buổi sáng với viên Canxi D3, thêm Glucophage. Xếp lịch giúp tôi sao cho đúng giờ.",
    },
    {
        "id": "red",
        "label": "Ca 3: Báo động đỏ (Tương tác nặng)",
        "medications": ["Warfarin 5mg", "Aspirin 81mg", "Ibuprofen 400mg", "Omeprazole 20mg"],
        "notes": "Mới mua thêm thuốc giảm đau khớp",
        "input_text": "Mẹ uống Coumadin với Aspirin pH8, hôm nay bác sĩ ngoài cho thêm Allopurinol. Kiểm giúp rồi xếp lịch cho mẹ.",
    },
    {
        "id": "edge",
        "label": "Ca 4: Ca khó / Ngoài thẩm quyền",
        "medications": ["Thuốc huyết áp viên màu hồng", "Thuốc đau đầu gói xanh"],
        "notes": "Mẹ đang đau ngực, kê thêm thuốc giúp tôi",
        "input_text": "Mẹ tôi 72 tuổi, đang uống thuốc huyết áp với thuốc tiểu đường, gần đây hay đau bụng trên. Xếp lịch giùm.",
    },
]


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("Web server Track B2 — GodFather đang chạy tại http://%s:%d" % (HOST, PORT))
    print("Nhấn Ctrl+C để dừng.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng server.")


if __name__ == "__main__":
    main()
