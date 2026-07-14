#!/usr/bin/env python3
"""Render HCI interaction flow Mermaid diagram to PNG."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
MMD = Path(__file__).resolve().parent / "hci-interaction-flow.mmd"
OUT = ROOT / "hci-interaction-flow-agent-html.png"
OUT_HD = ROOT / "hci-interaction-flow-agent-html-hd.png"

SCALE = 3
VIEWPORT_W = 2400
VIEWPORT_H = 1600
TITLE_PX = 44
PAD_PX = 48
WRAP_PAD = 36

DIAGRAM = MMD.read_text(encoding="utf-8")

HTML = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<style>
  body {{
    margin: 0;
    padding: {PAD_PX}px;
    font-family: 'Inter', sans-serif;
    background: #fff;
  }}
  h1 {{
    font-size: {TITLE_PX}px;
    font-weight: 900;
    margin: 0 0 24px;
    letter-spacing: -0.02em;
  }}
  .wrap {{
    border: 3px solid #000;
    background: #fafafa;
    padding: {WRAP_PAD}px;
    display: inline-block;
  }}
  .mermaid svg {{
    max-width: none !important;
  }}
</style>
</head>
<body>
  <h1>HCI 交互流 · Agent ≡ HTML</h1>
  <div class="wrap">
    <pre class="mermaid">{DIAGRAM}</pre>
  </div>
  <script>
    mermaid.initialize({{ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' }});
  </script>
</body>
</html>
"""


def render(out_path: Path, scale: int) -> None:
    chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome, headless=True)
        context = browser.new_context(
            viewport={"width": VIEWPORT_W, "height": VIEWPORT_H},
            device_scale_factor=scale,
        )
        page = context.new_page()
        page.set_content(HTML, wait_until="networkidle")
        page.wait_for_selector("svg", timeout=60000)
        page.wait_for_timeout(800)
        box = page.locator("body").bounding_box()
        assert box
        page.screenshot(path=str(out_path), clip=box, type="png")
        context.close()
        browser.close()
    w, h = int(box["width"] * scale), int(box["height"] * scale)
    print(f"Saved: {out_path} ({scale}x, {w}×{h}px)")


def main() -> None:
    render(OUT_HD, SCALE)
    render(OUT, SCALE)


if __name__ == "__main__":
    main()
