#!/usr/bin/env python3
"""Generate StoryLens architecture summary PNG for submission."""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 2400, 3200
img = Image.new("RGB", (W, H), "#FFFFFF")
d = ImageDraw.Draw(img)

# Try system fonts
def font(size, bold=False):
    paths = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

f_title = font(52)
f_h1 = font(36)
f_h2 = font(28)
f_body = font(22)
f_sm = font(18)

BLACK = "#000000"
RED = "#FF3333"
YELLOW = "#FFE600"
CYAN = "#00E5FF"
GREEN = "#00C853"
BLUE = "#2979FF"
ORANGE = "#FF9100"
PINK = "#FF4081"
GRAY = "#666666"
LGRAY = "#F5F5F5"
WHITE = "#FFFFFF"

def box(x, y, w, h, fill, text="", tc=BLACK, tf=f_body, border=3):
    d.rectangle([x, y, x+w, y+h], fill=fill, outline=BLACK, width=border)
    if text:
        lines = text.split("\n")
        lh = tf.size + 6
        ty = y + (h - len(lines)*lh)//2
        for line in lines:
            bbox = d.textbbox((0,0), line, font=tf)
            tw = bbox[2]-bbox[0]
            d.text((x+(w-tw)//2, ty), line, fill=tc, font=tf)
            ty += lh

def shadow_box(x, y, w, h, fill, text="", tf=f_body):
    d.rectangle([x+6, y+6, x+w+6, y+h+6], fill=BLACK)
    box(x, y, w, h, fill, text, tf=tf)

def arrow(x1, y1, x2, y2, color=BLACK, width=3):
    d.line([x1, y1, x2, y2], fill=color, width=width)
    import math
    ang = math.atan2(y2-y1, x2-x1)
    al = 14
    d.polygon([
        (x2, y2),
        (x2 - al*math.cos(ang-0.4), y2 - al*math.sin(ang-0.4)),
        (x2 - al*math.cos(ang+0.4), y2 - al*math.sin(ang+0.4)),
    ], fill=color)

# Header
d.rectangle([0, 0, W, 120], fill=YELLOW, outline=BLACK, width=4)
d.text((40, 32), "StoryLens 技术架构 · HCI 关系总览", fill=BLACK, font=f_title)
d.text((40, 88), "主 Skill × 分镜交集域 × TT 专家 · 腾讯初赛提交", fill=GRAY, font=f_sm)

y = 150

# Section 1: Three layers
d.text((40, y), "一、三层架构", fill=BLACK, font=f_h1)
y += 50
shadow_box(40, y, 700, 100, CYAN, "storylens/SKILL.md\n主 Skill 路由 · 工作流规范", f_sm)
shadow_box(780, y, 700, 100, GREEN, "skills/storyboard-production/\n分镜交集域 · H×V 框定", f_sm)
shadow_box(1520, y, 640, 100, YELLOW, "专家skill/ × 4\nTT 专家纵深 · 可选增强", f_sm)
arrow(740, y+50, 780, y+50)
arrow(1480, y+50, 1520, y+50)
y += 130

# Section 2: Intersection diagram
d.text((40, y), "二、横向 × 纵向 交集域（大前提）", fill=BLACK, font=f_h1)
y += 55

# Vertical axis label
d.text((60, y+180), "纵\n向\nV", fill=GRAY, font=f_sm)
# Horizontal axis
d.line([120, y+400, 2280, y+400], fill=BLACK, width=4)
d.text((1150, y+410), "横向 H · 主能力模式 →", fill=GRAY, font=f_sm)

experts = [
    ("🌻 辛向阳", "交互/行为/IDR", YELLOW, 120),
    ("👓 娄永琪", "产品创新/Pitch", BLUE, 520),
    ("🍐 李何槿", "可持续/循环", GREEN, 920),
    ("6 柳喆俊", "严肃游戏/VR", ORANGE, 1320),
]
for name, sub, col, ex in experts:
    shadow_box(ex, y, 280, 70, col, name, f_sm)
    d.text((ex+10, y+75), sub, fill=GRAY, font=font(16))

modes = [
    ("🎮 游戏设计", 200),
    ("🎬 影视分镜", 700),
    ("📐 产品概念", 1200),
    ("🎨 创作灵感", 1700),
]
for name, mx in modes:
    shadow_box(mx, y+350, 280, 60, LGRAY, name, f_sm)

# Intersection diamond
cx, cy = 1200, y+220
d.polygon([(cx, cy-80), (cx+200, cy), (cx, cy+80), (cx-200, cy)], fill=PINK, outline=BLACK, width=4)
d.text((cx-170, cy-15), "★ 分镜制作交集域 ★\nH ∩ V = 有效输出", fill=BLACK, font=f_sm)

y += 480

# Section 3: HCI
d.text((40, y), "三、HCI 人机交互设计（核心）", fill=BLACK, font=f_h1)
y += 50
hci_items = [
    ("渐进披露", "两轮引导提问\n固定三维→LLM细化", CYAN),
    ("结构化选择", "A/B/C/D 卡片\n降低认知负荷", YELLOW),
    ("操作门控", "LoRA 确认后才生图\n防误触", RED),
    ("可选增强", "TT 专家非强制\n新手低门槛", GREEN),
    ("跨界面一致", "Agent ≡ HTML\n相同步骤", BLUE),
    ("即时反馈", "KG 三视图\nSVG+D3+树", ORANGE),
    ("错误容忍", "生图四重回退\n降级不失败", PINK),
    ("用户控制", "历史v2·专家可取消\n可撤销可改", LGRAY),
]
for i, (title, desc, col) in enumerate(hci_items):
    col_i = i % 4
    row = i // 4
    bx = 40 + col_i * 590
    by = y + row * 130
    shadow_box(bx, by, 560, 110, col, f"{title}\n{desc}", f_sm)
y += 290

# Section 4: Workflow
d.text((40, y), "四、5 阶段工作流（不可跳步）", fill=BLACK, font=f_h1)
y += 50
steps = [
    ("01 INPUT", "文字→Enter解析\n两轮提问", CYAN),
    ("02 帧数", "1-24帧确认", YELLOW),
    ("03 LoRA", "生图前门控", RED),
    ("04 DRAFT", "分镜+KG", GREEN),
    ("05 RENDER", "PNG/JSON导出", ORANGE),
]
for i, (t, s, c) in enumerate(steps):
    bx = 40 + i * 470
    shadow_box(bx, y, 430, 90, c, f"{t}\n{s}", f_sm)
    if i < 4:
        arrow(bx+430, y+45, bx+470, y+45)
y += 120

# Section 5: Typical combo
d.text((40, y), "五、典型协同：产品概念 + 娄永琪", fill=BLACK, font=f_h1)
y += 50
shadow_box(40, y, 1100, 100, GREEN, "H · 产品概念模式：OPC / Pitch / CMF / 用户场景", f_sm)
d.text((1160, y+35), "+", fill=BLACK, font=f_h1)
shadow_box(1220, y, 940, 100, BLUE, "V · 娄永琪：设计驱动创新 · 5段式方案评审", f_sm)
y += 130
shadow_box(40, y, 2120, 80, PINK, "→ 输出：产品概念展示型分镜 + 每帧 KG（痛点→方案→价值 叙事链）", f_sm)

# Footer
y += 110
d.rectangle([0, H-60, W, H], fill=BLACK)
d.text((40, H-48), "StoryLens · TT设计×腾讯初赛 · tech.html 完整版", fill=WHITE, font=f_sm)
d.text((W-500, H-48), "tech-summary.png", fill=CYAN, font=f_sm)

out = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "tech-summary.png")
img.save(out, "PNG", optimize=True)
print(f"Saved: {out} ({W}x{H})")
