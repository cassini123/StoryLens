#!/usr/bin/env python3
"""Generate 20 cinematic still SVGs used as CHItest stimuli."""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "CHItest" / "public" / "stimuli"
OUT.mkdir(parents=True, exist_ok=True)


def svg(body: str, w=960, h=540) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cfd6dc"/>
      <stop offset="1" stop-color="#8a939c"/>
    </linearGradient>
    <linearGradient id="warm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8cfc4"/>
      <stop offset="1" stop-color="#9a8f82"/>
    </linearGradient>
  </defs>
  {body}
</svg>
'''


def person(x, y, scale=1, facing=1, fill="#222"):
    s = scale
    head_r = 14 * s
    return f'''
  <g transform="translate({x} {y}) scale({facing},1)">
    <circle cx="0" cy="{ -52 * s }" r="{head_r}" fill="{fill}"/>
    <rect x="{ -16 * s }" y="{ -38 * s }" width="{32 * s}" height="{44 * s}" rx="8" fill="{fill}"/>
    <rect x="{ -14 * s }" y="{6 * s}" width="{10 * s}" height="{36 * s}" fill="{fill}"/>
    <rect x="{4 * s }" y="{6 * s}" width="{10 * s}" height="{36 * s}" fill="{fill}"/>
  </g>'''


FRAMES = {
    "IMG01": f'''
  <rect width="960" height="540" fill="url(#sky)"/>
  <rect x="0" y="310" width="960" height="230" fill="#5b6168"/>
  <rect x="520" y="80" width="220" height="160" fill="#dfe6ec" stroke="#2b2b2b" stroke-width="8"/>
  <rect x="40" y="140" width="70" height="200" fill="#3e444b"/>
  {person(210, 390, 1.25, 1)}
  {person(640, 250, 0.9, -1, "#333")}
  <circle cx="80" cy="430" r="10" fill="#111"/>
''',
    "IMG02": f'''
  <rect width="960" height="540" fill="url(#sky)"/>
  <ellipse cx="480" cy="420" rx="420" ry="70" fill="#6f7a62"/>
  <rect x="300" y="330" width="360" height="36" rx="8" fill="#5a4636"/>
  <rect x="320" y="366" width="16" height="40" fill="#3f3228"/>
  <rect x="624" y="366" width="16" height="40" fill="#3f3228"/>
  {person(280, 330, 1.05, 1)}
  {person(700, 330, 1.05, -1)}
''',
    "IMG03": f'''
  <rect width="960" height="540" fill="#2e3340"/>
  <polygon points="120,540 420,80 540,80 840,540" fill="#6d7380"/>
  <g fill="#4a5160">
    <rect x="200" y="460" width="560" height="18"/>
    <rect x="250" y="380" width="460" height="18"/>
    <rect x="300" y="300" width="360" height="18"/>
    <rect x="350" y="220" width="260" height="18"/>
    <rect x="400" y="140" width="160" height="18"/>
  </g>
  {person(480, 150, 0.85, -1, "#1a1a1a")}
''',
    "IMG04": f'''
  <rect width="960" height="540" fill="url(#warm)"/>
  <rect x="0" y="300" width="960" height="240" fill="#6b5344"/>
  <ellipse cx="480" cy="360" rx="160" ry="50" fill="#3d2c22"/>
  <rect x="360" y="250" width="240" height="90" rx="8" fill="#2b211b"/>
  {person(360, 250, 1.0, 1)}
  {person(600, 250, 1.0, -1, "#3a3a3a")}
  <rect x="560" y="268" width="28" height="18" rx="3" fill="#111"/>
''',
    "IMG05": f'''
  <rect width="960" height="540" fill="#d5d0c8"/>
  <polygon points="80,540 430,80 530,80 880,540" fill="#b7b0a6"/>
  <rect x="430" y="80" width="100" height="160" fill="#8a8379"/>
  {person(260, 430, 1.3, 1)}
  {person(480, 210, 0.7, 1, "#333")}
  <path d="M260 430 L430 250" stroke="#111" stroke-width="3" stroke-dasharray="8 8" fill="none"/>
''',
    "IMG06": f'''
  <rect width="960" height="540" fill="url(#warm)"/>
  <rect x="0" y="0" width="460" height="540" fill="#cbb9a6"/>
  <rect x="500" y="0" width="460" height="540" fill="#9aa7b3"/>
  <rect x="452" y="0" width="56" height="540" fill="#dbe7ef" stroke="#222" stroke-width="6"/>
  {person(250, 390, 1.2, 1)}
  {person(720, 300, 0.95, -1, "#2c2c2c")}
''',
    "IMG07": f'''
  <rect width="960" height="540" fill="#cfc8bd"/>
  <rect x="0" y="360" width="960" height="180" fill="#8b8378"/>
  {person(360, 340, 1.15, 1, "#2a2a2a")}
  <rect x="300" y="40" width="90" height="420" fill="#4d463d"/>
  {person(640, 360, 1.1, -1)}
''',
    "IMG08": f'''
  <rect width="960" height="540" fill="#1f1c1a"/>
  <rect x="180" y="70" width="600" height="140" fill="#3a342e"/>
  <rect x="220" y="90" width="520" height="90" fill="#6e675d"/>
  <g fill="#2a261f">
    <rect x="80" y="280" width="120" height="70"/>
    <rect x="220" y="280" width="120" height="70"/>
    <rect x="620" y="280" width="120" height="70"/>
    <rect x="760" y="280" width="120" height="70"/>
  </g>
  {person(200, 430, 1.05, 1, "#d8d2c8")}
''',
    "IMG09": f'''
  <rect width="960" height="540" fill="url(#sky)"/>
  <rect x="0" y="300" width="960" height="240" fill="#6a7076"/>
  <rect x="0" y="80" width="260" height="240" fill="#4a5158"/>
  {person(180, 420, 1.45, 1, "#1b1b1b")}
  {person(470, 330, 1.05, -1)}
  {person(720, 280, 0.8, 1, "#333")}
''',
    "IMG10": f'''
  <rect width="960" height="540" fill="#b9c4b0"/>
  <rect x="0" y="360" width="960" height="180" fill="#7d8a72"/>
  <rect x="80" y="220" width="800" height="24" fill="#5c6754"/>
  {person(160, 430, 1.35, 1, "#222")}
  {person(760, 250, 0.75, -1, "#333")}
''',
    "IMG11": f'''
  <rect width="960" height="540" fill="url(#warm)"/>
  <rect x="80" y="70" width="70" height="320" fill="#5a4030"/>
  <rect x="170" y="70" width="70" height="320" fill="#5a4030"/>
  <rect x="700" y="120" width="80" height="250" fill="#3d332c"/>
  {person(320, 380, 1.15, 1)}
  {person(780, 330, 1.0, -1, "#2b2b2b")}
''',
    "IMG12": f'''
  <rect width="960" height="540" fill="#d7d2c8"/>
  <rect x="180" y="60" width="600" height="280" fill="#ece7dc" stroke="#333" stroke-width="4"/>
  <rect x="260" y="110" width="180" height="180" fill="#b9a48a"/>
  <rect x="520" y="110" width="180" height="180" fill="#8e9aa3"/>
  {person(480, 400, 1.2, 1)}
''',
    "IMG13": f'''
  <rect width="960" height="540" fill="#1c2228"/>
  <rect x="0" y="360" width="960" height="180" fill="#3a424a"/>
  <rect x="480" y="80" width="420" height="160" rx="12" fill="#c9d3dc"/>
  <g fill="#9aa6b0">
    <rect x="510" y="110" width="80" height="50"/>
    <rect x="610" y="110" width="80" height="50"/>
    <rect x="710" y="110" width="80" height="50"/>
    <rect x="810" y="110" width="60" height="50"/>
  </g>
  {person(220, 390, 1.15, 1, "#d0d0d0")}
  {person(360, 400, 1.05, 1, "#888")}
''',
    "IMG14": f'''
  <rect width="960" height="540" fill="#efe8dc"/>
  <rect x="200" y="60" width="70" height="110" fill="#c4a574"/>
  <rect x="360" y="60" width="70" height="110" fill="#8fa3b0"/>
  <rect x="520" y="60" width="70" height="110" fill="#c4a574"/>
  <rect x="680" y="60" width="70" height="110" fill="#8fa3b0"/>
  {person(280, 400, 1.25, 1)}
  {person(760, 240, 0.75, -1, "#333")}
  <path d="M280 400 L700 260" stroke="#111" stroke-width="3" stroke-dasharray="8 8" fill="none"/>
''',
    "IMG15": f'''
  <rect width="960" height="540" fill="url(#sky)"/>
  <rect x="0" y="360" width="960" height="180" fill="#7a756c"/>
  {person(220, 430, 1.7, 1, "#1a1a1a")}
  {person(560, 280, 0.7, 1, "#555")}
  {person(700, 280, 0.7, -1, "#444")}
''',
    "IMG16": f'''
  <rect width="960" height="540" fill="#d9d2c6"/>
  <rect x="0" y="0" width="420" height="540" fill="#3f3832"/>
  <rect x="420" y="40" width="28" height="500" fill="#2a2420"/>
  {person(560, 360, 1.1, -1, "#222")}
  <rect x="420" y="40" width="160" height="500" fill="#3f3832" opacity="0.55"/>
''',
    "IMG17": f'''
  <rect width="960" height="300" fill="url(#sky)"/>
  <rect x="0" y="300" width="960" height="240" fill="#4e6a78"/>
  <path d="M0 300 Q480 250 960 300" fill="#8b9aa3"/>
  <rect x="40" y="300" width="880" height="18" fill="#3d3d3d"/>
  {person(240, 300, 1.1, 1)}
  {person(760, 250, 0.8, -1, "#333")}
''',
    "IMG18": f'''
  <rect width="960" height="540" fill="#2c241e"/>
  <ellipse cx="480" cy="360" rx="220" ry="70" fill="#1a1512"/>
  <rect x="300" y="250" width="360" height="90" rx="10" fill="#4a372c"/>
  {person(480, 470, 1.5, 1, "#111")}
  {person(340, 250, 1.0, 1, "#d6cfc4")}
  {person(620, 250, 1.0, -1, "#cfc6b8")}
''',
    "IMG19": f'''
  <rect width="960" height="540" fill="#c8c2b8"/>
  <polygon points="480,40 120,540 840,540" fill="#9b958a"/>
  <g stroke="#6a645c" stroke-width="8" fill="none">
    <line x1="480" y1="40" x2="120" y2="540"/>
    <line x1="480" y1="40" x2="840" y2="540"/>
  </g>
  {person(480, 280, 0.7, 1, "#222")}
''',
    "IMG20": f'''
  <rect width="960" height="540" fill="url(#sky)"/>
  <rect x="0" y="360" width="960" height="180" fill="#6d7a66"/>
  <rect x="280" y="330" width="400" height="34" rx="8" fill="#594736"/>
  {person(360, 330, 1.05, 1)}
  {person(600, 330, 1.05, -1, "#333")}
''',
}


def main():
    for image_id, body in FRAMES.items():
        path = OUT / f"{image_id}.svg"
        path.write_text(svg(body), encoding="utf-8")
        print(path)


if __name__ == "__main__":
    main()
