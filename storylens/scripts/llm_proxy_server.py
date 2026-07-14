#!/usr/bin/env python3
"""StoryLens LLM Proxy Server

OpenAI-compatible chat API wrapper for scene parsing and storyboard generation.

Usage:
    export OPENAI_API_KEY=sk-...
    export OPENAI_BASE_URL=https://api.openai.com/v1   # optional
    export OPENAI_MODEL=gpt-4o-mini                     # optional
    python3 llm_proxy_server.py [--port 18902]

Endpoints:
    GET  /health              - Server + LLM config status
    POST /parse               - Parse scene text → summary + guided questions (optional expertId)
    POST /refine-questions    - Round-2 follow-up questions after round-1 answers (optional expertId)
    POST /generate-storyboard - Generate frames + per-frame kgData + prompts
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

_ENV_FILE = Path(__file__).resolve().parent / ".env"
if _ENV_FILE.is_file():
    for _line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

DEFAULT_PORT = 18902
DEFAULT_BASE = "https://api.openai.com/v1"
DEFAULT_MODEL = "gpt-4o-mini"

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
EXPERT_AGENT_FILES: dict[str, Path] = {
    "xinxiangyang": _PROJECT_ROOT / "专家skill/xin-xiangyang/agents/xin-xiangyang.md",
    "louyongqi": _PROJECT_ROOT / "专家skill/lou-yongqi-perspective/agents/lou-yongqi-perspective.md",
    "lihejin": _PROJECT_ROOT / "专家skill/li-hejin/agents/li-hejin.md",
    "liuzhejun": _PROJECT_ROOT / "专家skill/liu-zhe-jun/agents/liu-zhe-jun.md",
}
EXPERT_DISPLAY_NAMES: dict[str, str] = {
    "xinxiangyang": "辛向阳",
    "louyongqi": "娄永琪",
    "lihejin": "李何槿",
    "liuzhejun": "柳喆俊",
}

_SSL_CTX = ssl.create_default_context()
try:
    import certifi

    _SSL_CTX.load_verify_locations(certifi.where())
except ImportError:
    pass

PARSE_SYSTEM = """你是 StoryLens 分镜解析助手。根据用户场景描述，输出严格 JSON（不要 markdown 代码块）。
JSON 结构：
{
  "title": "简短标题（4-8字）",
  "summary": "解析摘要（2-3句）",
  "entities": {
    "characters": ["人物列表"],
    "location": "主要场景",
    "time": "时间/光线",
    "mood": "整体情绪"
  },
  "gaps": ["信息空白1", "信息空白2"],
  "guidedQuestions": [
    {
      "key": "focus",
      "label": "表达重点",
      "icon": "🎯",
      "color": "var(--red)",
      "options": ["选项A", "选项B", "选项C"]
    },
    {
      "key": "scene",
      "label": "场景偏好",
      "icon": "🌆",
      "color": "var(--cyan)",
      "options": ["选项A", "选项B", "选项C"]
    },
    {
      "key": "character",
      "label": "人物偏好",
      "icon": "👤",
      "color": "var(--orange)",
      "options": ["选项A", "选项B", "选项C"]
    }
  ],
  "followUpQuestions": [
    {
      "key": "followup_1",
      "label": "细化问题标题",
      "icon": "🎬",
      "color": "var(--yellow)",
      "options": ["选项A", "选项B", "选项C"]
    }
  ]
}
要求：guidedQuestions 固定 3 题（focus/scene/character），选项必须结合场景内容定制；followUpQuestions 3-5 题，关于镜头节奏/影调/构图/叙事/参考风格。"""

REFINE_SYSTEM = """你是 StoryLens 分镜细化提问助手。根据场景描述、第一轮引导答案和解析摘要，输出严格 JSON（不要 markdown 代码块）。
JSON 结构：
{
  "followUpQuestions": [
    {
      "key": "followup_1",
      "label": "细化问题标题",
      "icon": "🎬",
      "color": "var(--yellow)",
      "options": ["选项A", "选项B", "选项C"]
    }
  ]
}
要求：followUpQuestions 3-5 题，结合第一轮答案生成，方向可含镜头节奏/影调风格/构图偏好/叙事结构/参考风格；选项必须具体、可执行。"""

GENERATE_SYSTEM = """你是 StoryLens 分镜生成助手。根据场景描述和用户偏好，输出严格 JSON（不要 markdown 代码块）。
JSON 结构：
{
  "frames": [
    {
      "id": 1,
      "desc": "帧描述（中文，一句）",
      "shot": "远景|全景|中景|近景|特写 之一",
      "chars": [{"n": "角色名", "p": "center|left|right|top|bottom", "a": "动作"}],
      "set": "场景名",
      "mood": "情绪词",
      "kgData": {
        "id": "root_f1",
        "label": "本帧主题",
        "pct": "100%",
        "color": "var(--fg)",
        "children": [
          {
            "id": "d1_f1",
            "label": "影调风格",
            "pct": "35%",
            "color": "var(--red)",
            "children": [
              {
                "id": "r1_f1",
                "label": "参考作品名",
                "pct": "",
                "color": "var(--blue)",
                "children": [
                  {"id": "t1_f1", "label": "具体参数", "pct": "", "color": "var(--green)"}
                ]
              }
            ]
          }
        ]
      }
    }
  ],
  "prompts": [
    {"id": 1, "prompt": "English image generation prompt for frame 1, pencil sketch storyboard style"}
  ]
}
要求：
- frames 数量等于请求的 frameCount
- 每帧 kgData 4-6 层：L0 根节点，L1 4-6 个维度（含 pct 百分比，合计约100%），L2 参考作品/技法，L3 具体参数
- L1 维度常见：影调风格、人物动作、背景故事、构图方式、光影设计、镜头角度
- 镜头序列有节奏变化，避免连续同景别超过3帧
- prompts 为英文，适合 pencil sketch storyboard 生图"""


def _llm_config(body: dict | None = None) -> tuple[str, str, str]:
    body = body or {}
    api_key = (
        body.get("api_key")
        or os.environ.get("OPENAI_API_KEY")
        or os.environ.get("LLM_API_KEY")
        or ""
    )
    base_url = (
        body.get("base_url")
        or os.environ.get("OPENAI_BASE_URL")
        or os.environ.get("LLM_BASE_URL")
        or DEFAULT_BASE
    ).rstrip("/")
    model = (
        body.get("model")
        or os.environ.get("OPENAI_MODEL")
        or os.environ.get("LLM_MODEL")
        or DEFAULT_MODEL
    )
    return api_key, base_url, model


def _load_expert_persona(expert_id: str, max_chars: int = 6000) -> str:
    path = EXPERT_AGENT_FILES.get(expert_id)
    if not path or not path.is_file():
        return ""
    text = path.read_text(encoding="utf-8")
    if text.startswith("---"):
        end = text.find("---", 3)
        if end > 0:
            text = text[end + 3 :].lstrip()
    return text[:max_chars]


def _expert_parse_system(expert_id: str | None) -> str:
    if not expert_id:
        return PARSE_SYSTEM
    persona = _load_expert_persona(expert_id)
    name = EXPERT_DISPLAY_NAMES.get(expert_id, expert_id)
    if not persona:
        return PARSE_SYSTEM
    return (
        f"你是 StoryLens 分镜解析助手，当前以「{name}」专家 Agent 视角协同解析。\n"
        f"请用该专家的专业框架理解场景，但输出仍必须是下方规定的严格 JSON 结构（不要 markdown 代码块）。\n\n"
        f"【{name} 专家 Agent 人格与方法论（节选）】\n{persona}\n\n"
        f"【JSON 输出规范】\n{PARSE_SYSTEM}"
    )


def _expert_refine_system(expert_id: str | None) -> str:
    if not expert_id:
        return REFINE_SYSTEM
    persona = _load_expert_persona(expert_id)
    name = EXPERT_DISPLAY_NAMES.get(expert_id, expert_id)
    if not persona:
        return REFINE_SYSTEM
    return (
        f"你是 StoryLens 细化提问助手，当前以「{name}」专家 Agent 视角生成第二轮引导问题。\n"
        f"问题应体现该专家的专业关注点，但输出仍必须是下方规定的严格 JSON 结构（不要 markdown 代码块）。\n\n"
        f"【{name} 专家 Agent 人格与方法论（节选）】\n{persona}\n\n"
        f"【JSON 输出规范】\n{REFINE_SYSTEM}"
    )


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group(0))
        raise


def _chat(api_key: str, base_url: str, model: str, system: str, user: str) -> str:
    if not api_key:
        raise ValueError("Missing API key. Set OPENAI_API_KEY or pass api_key in request body.")

    url = f"{base_url}/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.7,
        "response_format": {"type": "json_object"},
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120, context=_SSL_CTX) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    return result["choices"][0]["message"]["content"]


def _cors_headers(handler: BaseHTTPRequestHandler) -> None:
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")


class LLMProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("%s - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        _cors_headers(self)
        self.end_headers()

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8"))

    def _send_json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        _cors_headers(self)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path.rstrip("/") == "/health":
            api_key, base_url, model = _llm_config()
            self._send_json(
                200,
                {
                    "status": "ok",
                    "service": "storylens-llm-proxy",
                    "llm_configured": bool(api_key),
                    "base_url": base_url,
                    "model": model,
                },
            )
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        path = self.path.rstrip("/")
        try:
            body = self._read_json()
            api_key, base_url, model = _llm_config(body)

            if path == "/parse":
                scene_text = (body.get("sceneText") or body.get("text") or "").strip()
                if not scene_text:
                    self._send_json(400, {"error": "sceneText is required"})
                    return
                expert_id = (body.get("expertId") or "").strip() or None
                user_msg = f"场景描述：\n{scene_text}"
                content = _chat(api_key, base_url, model, _expert_parse_system(expert_id), user_msg)
                data = _extract_json(content)
                if expert_id:
                    data["matchedExpert"] = {
                        "id": expert_id,
                        "name": EXPERT_DISPLAY_NAMES.get(expert_id, expert_id),
                    }
                self._send_json(200, {"ok": True, "data": data})
                return

            if path == "/refine-questions":
                scene_text = (body.get("sceneText") or "").strip()
                answers = body.get("answers") or {}
                parse_summary = body.get("parseResult") or {}
                expert_id = (body.get("expertId") or "").strip() or None
                if not scene_text:
                    self._send_json(400, {"error": "sceneText is required"})
                    return
                user_msg = json.dumps(
                    {
                        "sceneText": scene_text,
                        "answers": answers,
                        "parseResult": parse_summary,
                    },
                    ensure_ascii=False,
                )
                content = _chat(api_key, base_url, model, _expert_refine_system(expert_id), user_msg)
                data = _extract_json(content)
                self._send_json(200, {"ok": True, "data": data})
                return

            if path == "/generate-storyboard":
                scene_text = (body.get("sceneText") or "").strip()
                frame_count = int(body.get("frameCount") or 6)
                frame_count = max(1, min(24, frame_count))
                answers = body.get("answers") or {}
                parse_summary = body.get("parseResult") or {}
                if not scene_text:
                    self._send_json(400, {"error": "sceneText is required"})
                    return
                user_msg = json.dumps(
                    {
                        "sceneText": scene_text,
                        "frameCount": frame_count,
                        "answers": answers,
                        "parseResult": parse_summary,
                    },
                    ensure_ascii=False,
                )
                content = _chat(api_key, base_url, model, GENERATE_SYSTEM, user_msg)
                data = _extract_json(content)
                self._send_json(200, {"ok": True, "data": data})
                return

            self._send_json(404, {"error": "Not found"})
        except ValueError as e:
            self._send_json(400, {"error": str(e)})
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            self._send_json(e.code, {"error": f"LLM API error: {err_body[:500]}"})
        except Exception as e:
            self._send_json(500, {"error": str(e)})


def main() -> None:
    parser = argparse.ArgumentParser(description="StoryLens LLM Proxy")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    server = HTTPServer((args.host, args.port), LLMProxyHandler)
    api_key, base_url, model = _llm_config()
    print(f"StoryLens LLM Proxy on http://{args.host}:{args.port}")
    print(f"  LLM: {base_url}  model={model}  key={'set' if api_key else 'MISSING'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
