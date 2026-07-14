#!/usr/bin/env python3
"""Jimeng (即梦 AI) Image Generation Proxy Server

Wraps Volcengine Visual API (jimeng_t2i_v40) into an HTTP API for the StoryLens Generator HTML UI.

Usage:
    export JIMENG_ACCESS_KEY=your_ak
    export JIMENG_SECRET_KEY=your_sk
    python3 jimeng_proxy_server.py [--port 18901]

Endpoints:
    GET  /health   - Check server status
    POST /generate - Generate an image (ak/sk via env or POST body)

Official docs: https://www.volcengine.com/docs/85621/1817045
"""

import base64
import hashlib
import hmac
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

# Load .env if present (same directory as this script)
_ENV_FILE = Path(__file__).resolve().parent / ".env"
if _ENV_FILE.is_file():
    for _line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

# ---------------------------------------------------------------------------
# Volcengine Visual API config
# ---------------------------------------------------------------------------

HOST = "visual.volcengineapi.com"
ENDPOINT = f"https://{HOST}"
REGION = "cn-north-1"
SERVICE = "cv"
API_VERSION = "2022-08-31"
REQ_KEY = "jimeng_t2i_v40"

POLL_INTERVAL = 3
MAX_POLL_TIMES = 60

_SCRIPT_DIR = Path(__file__).resolve().parent
ASSETS_DIR = _SCRIPT_DIR.parent / "assets"
STYLE_REFS_DIR = ASSETS_DIR / "style-refs"
LORA_DIR = ASSETS_DIR / "lora"
HISTORY_DIR = ASSETS_DIR / "history"
HISTORY_FILE = HISTORY_DIR / "history.json"
HISTORY_MAX = 10
STYLE_REFS_DIR.mkdir(parents=True, exist_ok=True)
LORA_DIR.mkdir(parents=True, exist_ok=True)
HISTORY_DIR.mkdir(parents=True, exist_ok=True)

# SSL context for macOS / corporate proxy environments
_SSL_CTX = ssl.create_default_context()
try:
    import certifi
    _SSL_CTX.load_verify_locations(certifi.where())
except ImportError:
    pass


def _urlopen(req, timeout=120):
    return urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX)


def _sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _get_signature_key(secret_key: str, date_stamp: str) -> bytes:
    k_date = _sign(secret_key.encode("utf-8"), date_stamp)
    k_region = _sign(k_date, REGION)
    k_service = _sign(k_region, SERVICE)
    return _sign(k_service, "request")


def _jimeng_request(action: str, body_params: dict, access_key: str, secret_key: str) -> dict:
    """Send signed request to Volcengine Visual API."""
    t = datetime.now(timezone.utc)
    current_date = t.strftime("%Y%m%dT%H%M%SZ")
    datestamp = t.strftime("%Y%m%d")

    query_params = f"Action={action}&Version={API_VERSION}"
    req_body = json.dumps(body_params, ensure_ascii=False)
    payload_hash = hashlib.sha256(req_body.encode("utf-8")).hexdigest()

    signed_headers = "content-type;host;x-content-sha256;x-date"
    canonical_headers = (
        f"content-type:application/json\n"
        f"host:{HOST}\n"
        f"x-content-sha256:{payload_hash}\n"
        f"x-date:{current_date}\n"
    )
    canonical_request = (
        f"POST\n/\n{query_params}\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
    )

    credential_scope = f"{datestamp}/{REGION}/{SERVICE}/request"
    string_to_sign = (
        f"HMAC-SHA256\n{current_date}\n{credential_scope}\n"
        + hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
    )

    signing_key = _get_signature_key(secret_key, datestamp)
    signature = hmac.new(
        signing_key, string_to_sign.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    authorization = (
        f"HMAC-SHA256 Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )

    headers = {
        "X-Date": current_date,
        "Authorization": authorization,
        "X-Content-Sha256": payload_hash,
        "Content-Type": "application/json",
    }

    url = f"{ENDPOINT}?{query_params}"
    req = urllib.request.Request(url, data=req_body.encode("utf-8"), headers=headers, method="POST")

    try:
        with _urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {err_body}") from e


def _download_image(url: str) -> tuple[bytes, str]:
    """Download image from URL, return (bytes, format)."""
    with _urlopen(urllib.request.Request(url, method="GET"), timeout=120) as resp:
        image_bytes = resp.read()
        ct = resp.headers.get("Content-Type", "image/png")
        fmt = "png"
        if "jpeg" in ct or "jpg" in ct:
            fmt = "jpeg"
        elif "webp" in ct:
            fmt = "webp"
        return image_bytes, fmt


def _extract_image_from_result(result: dict) -> tuple[bytes, str]:
    """Extract image bytes from CVSync2AsyncGetResult response."""
    data = result.get("data") or {}

    # Try image_urls first
    image_urls = data.get("image_urls") or []
    if isinstance(image_urls, str):
        image_urls = [image_urls]
    if image_urls:
        return _download_image(image_urls[0])

    # Try binary_data_base64
    b64_list = data.get("binary_data_base64") or []
    if isinstance(b64_list, str):
        b64_list = [b64_list]
    if b64_list:
        raw = base64.b64decode(b64_list[0])
        fmt = "png"
        if raw[:3] == b"\xff\xd8\xff":
            fmt = "jpeg"
        elif raw[:4] == b"RIFF":
            fmt = "webp"
        return raw, fmt

    raise RuntimeError(f"No image in result: {json.dumps(result, ensure_ascii=False)[:500]}")


def _sdk_request(action: str, body_params: dict, access_key: str, secret_key: str) -> dict:
    """Use official volcengine SDK when available (more reliable signing)."""
    from volcengine.visual.VisualService import VisualService

    vs = VisualService()
    vs.set_ak(access_key)
    vs.set_sk(secret_key)
    if action == "CVSync2AsyncSubmitTask":
        return vs.cv_sync2async_submit_task(body_params)
    if action == "CVSync2AsyncGetResult":
        return vs.cv_sync2async_get_result(body_params)
    raise ValueError(f"Unsupported action: {action}")


def _api_request(action: str, body_params: dict, access_key: str, secret_key: str) -> dict:
    try:
        return _sdk_request(action, body_params, access_key, secret_key)
    except ImportError:
        return _jimeng_request(action, body_params, access_key, secret_key)
    except Exception as sdk_err:
        err = str(sdk_err)
        if "SignatureDoesNotMatch" in err or "InvalidAccessKey" in err:
            raise RuntimeError(
                "鉴权失败：请确认 Access Key ID 以 AKLT 开头，且 Secret Access Key 与 IAM 控制台配对。"
                " 即梦 API Key（cP6q…）不能作为 Access Key 使用。"
            ) from sdk_err
        raise


def _normalize_ref_image(image: str) -> str:
    """Return base64 payload (no data-URL prefix) for Jimeng image param."""
    image = (image or "").strip()
    if not image:
        return ""
    if image.startswith("data:"):
        return image.split(",", 1)[1]
    if image.startswith("http://") or image.startswith("https://"):
        return image
    return image


def _normalize_ref_images(
    reference_image: str | None = None,
    reference_images: list | None = None,
) -> list[str]:
    """Normalize one or many reference images for Jimeng (supports up to 10)."""
    raw: list = []
    if reference_images:
        if isinstance(reference_images, list):
            raw.extend(reference_images)
        else:
            raw.append(reference_images)
    if reference_image:
        raw.insert(0, reference_image)
    out: list[str] = []
    for item in raw:
        normalized = _normalize_ref_image(str(item or ""))
        if normalized:
            out.append(normalized)
    return out[:10]


def list_style_refs() -> dict:
    out = {}
    for style_dir in sorted(STYLE_REFS_DIR.iterdir()):
        if not style_dir.is_dir():
            continue
        files = sorted(
            p.name
            for p in style_dir.iterdir()
            if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        )
        if files:
            out[style_dir.name] = files
    return out


def list_lora_models() -> list:
    models = []
    for model_dir in sorted(LORA_DIR.iterdir()):
        if not model_dir.is_dir():
            continue
        meta_path = model_dir / "meta.json"
        meta = {}
        if meta_path.is_file():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                meta = {}
        images = sorted(
            p.name
            for p in model_dir.iterdir()
            if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        )
        if not images and not meta:
            continue
        models.append(
            {
                "name": meta.get("name") or model_dir.name,
                "folder": model_dir.name,
                "trigger": meta.get("trigger", ""),
                "steps": meta.get("steps", 0),
                "files": len(images),
                "time": meta.get("time", ""),
                "images": images,
            }
        )
    return models


def load_history() -> list:
    if not HISTORY_FILE.is_file():
        return []
    try:
        data = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_history_entry(entry: dict) -> list:
    history = load_history()
    entry_id = entry.get("id")
    history = [h for h in history if h.get("id") != entry_id]
    history.insert(0, entry)
    history = history[:HISTORY_MAX]
    HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    return history


def save_lora_model(payload: dict) -> dict:
    name = re.sub(r"[^\w\u4e00-\u9fff\-]+", "_", (payload.get("name") or "unnamed").strip())
    if not name:
        raise ValueError("Missing lora model name")
    images = payload.get("images") or []
    if len(images) < 1:
        raise ValueError("Need at least 1 reference image")

    model_dir = LORA_DIR / name
    model_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    for idx, item in enumerate(images):
        data_url = item.get("data") or item.get("data_url") or ""
        fname = item.get("name") or f"ref_{idx + 1}.jpg"
        fname = re.sub(r"[^\w.\-]+", "_", fname)
        if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            fname += ".jpg"
        if "," in data_url:
            data_url = data_url.split(",", 1)[1]
        raw = base64.b64decode(data_url)
        out = model_dir / fname
        out.write_bytes(raw)
        saved.append(fname)

    meta = {
        "name": name,
        "trigger": payload.get("trigger", ""),
        "steps": int(payload.get("steps") or 0),
        "time": payload.get("time") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "files": len(saved),
        "images": saved,
        "type": "pseudo_lora",
    }
    (model_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def generate_image(
    prompt: str,
    width: int,
    height: int,
    access_key: str,
    secret_key: str,
    reference_image: str | None = None,
    reference_images: list | None = None,
    strength: float | None = None,
) -> str:
    """Generate image via Jimeng t2i v4.0, return data URL."""
    print(f"[JIMENG] Submitting task: {prompt[:80]}...", flush=True)

    body = {"req_key": REQ_KEY, "prompt": prompt, "width": width, "height": height}
    refs = _normalize_ref_images(reference_image, reference_images)
    if refs:
        body["image"] = refs if len(refs) > 1 else refs[0]
        if strength is not None:
            body["strength"] = float(strength)
        print(f"[JIMENG] Using {len(refs)} reference image(s)", flush=True)

    submit_resp = _api_request(
        "CVSync2AsyncSubmitTask",
        body,
        access_key,
        secret_key,
    )

    if submit_resp.get("code") != 10000:
        raise RuntimeError(f"Submit failed: {submit_resp.get('message', submit_resp)}")

    task_id = submit_resp["data"]["task_id"]
    print(f"[JIMENG] Task submitted: {task_id}", flush=True)

    for i in range(MAX_POLL_TIMES):
        time.sleep(POLL_INTERVAL)
        result = _api_request(
            "CVSync2AsyncGetResult",
            {"req_key": REQ_KEY, "task_id": task_id},
            access_key,
            secret_key,
        )

        if result.get("code") != 10000:
            print(f"[JIMENG] Poll {i+1}: {result.get('message', 'error')}", flush=True)
            continue

        status = (result.get("data") or {}).get("status", "")
        print(f"[JIMENG] Poll {i+1}: status={status}", flush=True)

        if status == "done":
            image_bytes, fmt = _extract_image_from_result(result)
            print(f"[JIMENG] Done. Size: {len(image_bytes)} bytes", flush=True)
            b64 = base64.b64encode(image_bytes).decode()
            return f"data:image/{fmt};base64,{b64}"

        if status in ("failed", "error", "expired"):
            raise RuntimeError(f"Task {status}: {result}")

    raise RuntimeError("Generation timed out (3 min)")


# ---------------------------------------------------------------------------
# HTTP Handler
# ---------------------------------------------------------------------------

class JimengHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass

    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            ak = os.getenv("JIMENG_ACCESS_KEY", "")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._set_cors()
            self.end_headers()
            self.wfile.write(
                json.dumps(
                    {
                        "status": "ok",
                        "engine": "jimeng_t2i_v40",
                        "credentials": bool(ak),
                        "style_refs": list_style_refs(),
                        "lora_models": len(list_lora_models()),
                    }
                ).encode()
            )
            return
        if path == "/style-refs":
            self._json_ok({"status": "ok", "styles": list_style_refs()})
            return
        if path.startswith("/style-refs/"):
            parts = [unquote(p) for p in path.split("/")[2:] if p]
            if len(parts) == 2:
                self._serve_file(STYLE_REFS_DIR / parts[0] / parts[1])
                return
            return self._json_error(404, "Use /style-refs/{style}/{file}")
        if path == "/lora/list":
            self._json_ok({"status": "ok", "models": list_lora_models()})
            return
        if path == "/history/list":
            self._json_ok({"status": "ok", "history": load_history()[:HISTORY_MAX]})
            return
        if path.startswith("/lora/"):
            parts = [unquote(p) for p in path.split("/")[2:] if p]
            if len(parts) == 2:
                self._serve_file(LORA_DIR / parts[0] / parts[1])
                return
            return self._json_error(404, "Use /lora/{name}/{file}")
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/generate":
            self._handle_generate()
        elif path == "/lora/save":
            self._handle_lora_save()
        elif path == "/history/save":
            self._handle_history_save()
        else:
            self.send_response(404)
            self.end_headers()

    def _json_ok(self, payload):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._set_cors()
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode())

    def _serve_file(self, file_path: Path):
        if not file_path.is_file():
            self._json_error(404, "File not found")
            return
        ext = file_path.suffix.lower()
        ctype = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".json": "application/json",
        }.get(ext, "application/octet-stream")
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self._set_cors()
        self.end_headers()
        self.wfile.write(data)

    def _handle_generate(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            self._json_error(400, f"Invalid JSON: {e}")
            return

        prompt = data.get("prompt", "")
        width = int(data.get("width", 1024))
        height = int(data.get("height", 640))
        reference_image = data.get("reference_image")
        reference_images = data.get("reference_images")
        if not reference_image and not reference_images:
            legacy = data.get("image")
            if isinstance(legacy, list):
                reference_images = legacy
            elif legacy:
                reference_image = legacy
        strength = data.get("strength")

        access_key = data.get("access_key") or os.getenv("JIMENG_ACCESS_KEY", "")
        secret_key = data.get("secret_key") or os.getenv("JIMENG_SECRET_KEY", "")

        if not prompt:
            self._json_error(400, "Missing 'prompt'")
            return
        if not access_key or not secret_key:
            self._json_error(
                503,
                "No credentials. Set JIMENG_ACCESS_KEY/JIMENG_SECRET_KEY env or pass in POST body.",
            )
            return

        try:
            data_url = generate_image(
                prompt,
                width,
                height,
                access_key,
                secret_key,
                reference_image=reference_image,
                reference_images=reference_images,
                strength=strength,
            )
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._set_cors()
            self.end_headers()
            self.wfile.write(
                json.dumps({"status": "success", "data_url": data_url}).encode()
            )
        except Exception as e:
            self._json_error(500, str(e))

    def _handle_history_save(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            self._json_error(400, f"Invalid JSON: {e}")
            return
        if not isinstance(data, dict) or not data.get("state"):
            self._json_error(400, "Missing history entry with state")
            return
        try:
            history = save_history_entry(data)
            self._json_ok({"status": "success", "history": history})
        except Exception as e:
            self._json_error(500, str(e))

    def _handle_lora_save(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            self._json_error(400, f"Invalid JSON: {e}")
            return
        try:
            meta = save_lora_model(data)
            self._json_ok({"status": "success", "model": meta})
        except Exception as e:
            self._json_error(400, str(e))

    def _json_error(self, code, message):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._set_cors()
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())


def main():
    port = 18901
    for i, arg in enumerate(sys.argv):
        if arg == "--port" and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])

    ak = os.getenv("JIMENG_ACCESS_KEY", "")
    print("=== Jimeng (即梦) Image Proxy Server ===", flush=True)
    print(f"  Port:    http://127.0.0.1:{port}", flush=True)
    print(f"  Engine:  {REQ_KEY}", flush=True)
    print(f"  AK:      {'configured' if ak else 'not set — pass via POST body'}", flush=True)
    print("  Endpoints:", flush=True)
    print("    GET  /health", flush=True)
    print("    GET  /style-refs", flush=True)
    print("    GET  /style-refs/{style}/{file}", flush=True)
    print("    GET  /lora/list", flush=True)
    print("    GET  /history/list", flush=True)
    print("    POST /lora/save  body={name, images[], trigger?, steps?}", flush=True)
    print("    POST /history/save  body={id, time, name, thumb, state}", flush=True)
    print("    POST /generate  body={prompt, width?, height?, reference_image?, reference_images?, strength?, access_key?, secret_key?}", flush=True)
    print("  Press Ctrl+C to stop", flush=True)
    print("=======================================", flush=True)

    server = HTTPServer(("127.0.0.1", port), JimengHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    main()
