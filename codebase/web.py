"""Web server cho bản chạy thử Track B2 — GodFather.

Chạy bằng: python run.py web   (hoặc: python codebase/web.py)

- Chỉ dùng thư viện chuẩn của Python (http.server) — không thêm dependency, không phá CLI.
- Frontend gọi 2 endpoint:
    GET  /api/status   → {model, drugs_count, interactions_count, sources, demo_mode}
    POST /api/check    → body {text} → gọi agent.answer() THẬT → {output, meta}
- Frontend KHÔNG hardcode kết quả: mọi cảnh báo / lịch / mức độ đều từ meta do backend trả.
- API key không bao giờ rời backend (đọc từ .env trong codebase/ai.py).
"""
import json
import os
import sys

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer  # noqa: E402

HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "8000"))

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
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
    server_version = "GodFatherB2/1.0"
    protocol_version = "HTTP/1.1"

    # ---------- helpers ----------
    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
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
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    # ---------- routes ----------
    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/status":
            _load_agent()
            from tools import data_status
            ds = data_status()
            n_drugs, n_int = _load_status_counts()
            model_name = os.environ.get("MODEL_NAME", "")
            if not model_name:
                try:
                    from ai import _OPENROUTER_FALLBACKS
                    model_name = (_OPENROUTER_FALLBACKS or [""])[0]
                except Exception:
                    model_name = ""
            self._send(200, {
                "model": os.environ.get("MODEL_PROVIDER", "fake"),
                "model_name": model_name,
                "demo_mode": (os.environ.get("MODEL_PROVIDER", "fake") or "fake").lower() in ("", "fake"),
                "sources": ds,
                "drugs_count": n_drugs,
                "interactions_count": n_int,
            })
        elif path == "/api/presets":
            self._send(200, {"presets": _PRESETS})
        elif path in ("/", "/index.html"):
            self._static("/index.html")
        else:
            self._static(path)

    def do_POST(self):
        if self.path.split("?")[0] != "/api/check":
            self._send(404, {"error": "not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > 200_000:
                self._send(400, {"error": "bad_request", "message": "Dữ liệu gửi lên không hợp lệ hoặc quá lớn."})
                return
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8", "replace"))
            except UnicodeDecodeError:
                self._send(400, {"error": "bad_request", "message": "Dữ liệu gửi lên phải là UTF-8."})
                return
            text = (payload.get("text") or "").strip() if isinstance(payload, dict) else ""
            if not text:
                self._send(400, {"error": "bad_request", "message": "Vui lòng nhập danh sách thuốc trước khi kiểm tra."})
                return

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
        except json.JSONDecodeError:
            self._send(400, {"error": "bad_request", "message": "Không đọc được dữ liệu gửi lên."})
        except NotImplementedError as e:
            self._send(503, {"error": "model_not_connected", "message": "Chưa nối model AI: %s" % e})
        except Exception as e:
            self._send(500, {"error": "internal", "message": "Lỗi xử lý phía server: %s: %s" % (type(e).__name__, e)})

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

def _load_status_counts():
    import json as _json
    drugs_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "drugs.json")
    inter_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "interactions.json")
    try:
        with open(drugs_path, encoding="utf-8-sig") as f:
            n_drugs = len(_json.load(f).get("drugs", []))
    except Exception:
        n_drugs = 0
    try:
        with open(inter_path, encoding="utf-8-sig") as f:
            n_int = len(_json.load(f).get("interactions", []))
    except Exception:
        n_int = 0
    return (n_drugs, n_int)


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
