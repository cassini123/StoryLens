#!/usr/bin/env python3
"""Buddy Cloud Image Generation Proxy Server

Wraps buddy-cloud.py's image command into an HTTP API for the StoryLens Generator HTML UI.

Usage:
    python3 image_proxy_server.py [--port 18900]

Endpoints:
    GET  /health              - Check server status
    POST /generate            - Generate an image (token via env var or POST body)
    POST /generate-with-token - Generate with token in body (recommended)

The server auto-detects buddy-cloud.py from:
    1. Same directory as this script
    2. WorkBuddy app bundle (macOS)

Token can be passed:
    - Via BUDDY_CLOUD_TOKEN env var (legacy)
    - Via "token" field in POST body to /generate-with-token (recommended)
    - Via "token" field in POST body to /generate (fallback)
"""

import base64 as _b64
import json
import os
import subprocess
import sys
import tempfile as _tf
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

# ---------------------------------------------------------------------------
# Locate buddy-cloud.py
# ---------------------------------------------------------------------------

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_CANDIDATES = [
    os.path.join(_SCRIPT_DIR, "buddy-cloud.py"),
    os.path.join(_SCRIPT_DIR, "..", "buddy-cloud.py"),
    "/Applications/LearnBuddy.app/Contents/Resources/app.asar.unpacked/"
    "resources/builtin-skills/buddy-multimodal-generation/scripts/buddy-cloud.py",
]

BUDDY_CLOUD_SCRIPT = None
for _c in _CANDIDATES:
    if os.path.isfile(_c):
        BUDDY_CLOUD_SCRIPT = _c
        break


# ---------------------------------------------------------------------------
# Image generation core
# ---------------------------------------------------------------------------

def _generate_image(prompt, resolution, revise, seed, token):
    """Generate an image via buddy-cloud.py. Returns data_url string."""
    cmd = [
        sys.executable,
        BUDDY_CLOUD_SCRIPT,
        "image",
        prompt,
        "--revise", str(revise),
        "--poll-interval", "3",
        "--max-poll-time", "300",
    ]

    # Write token to a temp file to avoid stdin pipe issues
    # buddy-cloud.py's _ensure_requests() pip install can consume stdin
    _token_fd, _token_path = _tf.mkstemp(prefix="buddy_token_")
    try:
        os.write(_token_fd, token.encode())
        os.close(_token_fd)
        cmd.extend(["--token-file", _token_path])

        if resolution:
            # buddy-cloud.py expects 'width:height' format (e.g. 1024:1024)
            # Auto-convert 'widthxheight' or 'widthXheight' to 'width:height'
            if "x" in resolution.lower() and ":" not in resolution:
                parts = resolution.lower().split("x")
                resolution = ":".join(parts)
            cmd.extend(["--resolution", resolution])
        if seed is not None:
            cmd.extend(["--seed", str(seed)])

        print(f"[GEN] Generating image...", flush=True)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            err = result.stdout.strip() or result.stderr.strip()
            raise RuntimeError(f"buddy-cloud.py failed: {err}")

        output = json.loads(result.stdout)
        result_url = output.get("result_url", [])
        if isinstance(result_url, str):
            result_url = [result_url]
        if not result_url:
            raise RuntimeError("No image URL in response")

        # Download image
        image_url = result_url[0]
        print(f"[GEN] Downloading image...", flush=True)
        resp = urllib.request.urlopen(image_url, timeout=120)
        image_bytes = resp.read()

        # Detect format
        ct = resp.headers.get("Content-Type", "image/png")
        fmt = "png"
        if "jpeg" in ct or "jpg" in ct:
            fmt = "jpeg"
        elif "webp" in ct:
            fmt = "webp"

        print(f"[GEN] Done. Size: {len(image_bytes)} bytes, format: {fmt}", flush=True)
        return f"data:image/{fmt};base64,{_b64.b64encode(image_bytes).decode()}"
    finally:
        # Always clean up token file
        try:
            os.unlink(_token_path)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# HTTP Handler
# ---------------------------------------------------------------------------

class ImageHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        """Silence default request logging."""
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
        if self.path == "/health":
            token = os.getenv("BUDDY_CLOUD_TOKEN", "")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._set_cors()
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "token": bool(token),
                "script": bool(BUDDY_CLOUD_SCRIPT),
                "script_path": BUDDY_CLOUD_SCRIPT or "not found",
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path in ("/generate", "/generate-with-token"):
            self._handle_generate()
        else:
            self.send_response(404)
            self.end_headers()

    def _handle_generate(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            self._json_error(400, f"Invalid JSON: {e}")
            return

        prompt = data.get("prompt", "")
        resolution = data.get("resolution")        # e.g. "1024:576"
        revise = data.get("revise", 0)               # 0 = faster, 1 = better quality (+20s)
        seed = data.get("seed")                      # random seed int
        token = data.get("token", "")                 # token from body (preferred)

        # Fallback to env var if not in body
        if not token:
            token = os.getenv("BUDDY_CLOUD_TOKEN", "")

        if not prompt:
            self._json_error(400, "Missing 'prompt'")
            return

        if not token:
            self._json_error(503, "No token provided. Pass 'token' in POST body or set BUDDY_CLOUD_TOKEN env var.")
            return

        if not BUDDY_CLOUD_SCRIPT:
            self._json_error(503, "buddy-cloud.py not found.")
            return

        try:
            data_url = _generate_image(prompt, resolution, revise, seed, token)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._set_cors()
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "data_url": data_url,
            }).encode())

        except subprocess.TimeoutExpired:
            self._json_error(504, "Generation timed out (5 min)")
        except Exception as e:
            self._json_error(500, str(e))

    def _json_error(self, code, message):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._set_cors()
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    port = 18900
    for i, arg in enumerate(sys.argv):
        if arg == "--port" and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])

    token = os.getenv("BUDDY_CLOUD_TOKEN", "")
    print(f"=== Buddy Cloud Image Proxy Server ===", flush=True)
    print(f"  Port:    http://127.0.0.1:{port}", flush=True)
    print(f"  Token:   {'configured (env)' if token else 'not in env — accept via POST body'}", flush=True)
    print(f"  Script:  {BUDDY_CLOUD_SCRIPT or 'NOT FOUND'}", flush=True)
    print(f"  Endpoints:", flush=True)
    print(f"    GET  /health", flush=True)
    print(f"    POST /generate  body={{prompt, resolution?, revise?, seed?, token?}}", flush=True)
    print(f"  Press Ctrl+C to stop", flush=True)
    print(f"======================================", flush=True)

    server = HTTPServer(("127.0.0.1", port), ImageHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    main()
