#!/usr/bin/env python3
"""Easy Draft 简笔画分镜生成器 — 参考 refeasydraw.png 风格。

体现：
  1. 环境基本内容（街道/室内/自然等抽象线条）
  2. 人物相对位置、大小（随景别缩放）、画面构图位置
  3. 底部简单文字叙述

用法:
  python easy_draft_draw.py                    # 生成示例 demo-easy-draft.png
  python easy_draft_draw.py --frames frames.json --out board.png
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
from typing import Any

from PIL import Image, ImageDraw, ImageFont

W, H = 640, 400
PAPER = "#F7F4EE"
INK = (0, 0, 0)
INK_LIGHT = (0, 0, 0, 55)
INK_MED = (0, 0, 0, 120)

SHOT_SCALE = {
    "远景": 0.26,
    "全景": 0.40,
    "中景": 0.56,
    "近景": 0.72,
    "特写": 0.92,
}

POS_MAP = {
    "center": (0.50, 0.70),
    "left": (0.24, 0.70),
    "right": (0.76, 0.70),
    "top": (0.50, 0.42),
    "bottom": (0.50, 0.82),
    "far-left": (0.14, 0.72),
    "far-right": (0.86, 0.72),
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    paths = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default()


def env_type(scene: str) -> str:
    s = scene.lower()
    if re.search(r"街|路|十字|巷|广场", s):
        return "street"
    if re.search(r"室|房|屋|家|厅|店|办公|教室", s):
        return "indoor"
    if re.search(r"森林|山|海|河|湖|公园|自然|郊", s):
        return "nature"
    if re.search(r"黄昏|夕阳|傍晚|日落", s):
        return "sunset"
    if re.search(r"夜|深夜|月光|星空", s):
        return "night"
    return "generic"


def pose(action: str) -> str:
    a = action or "站立"
    if re.search(r"跑|追|奔", a):
        return "run"
    if re.search(r"回|望|看|转", a):
        return "lookback"
    if re.search(r"低|俯|蹲|弯", a):
        return "bend"
    if re.search(r"握|拿|拾|捡|伸", a):
        return "reach"
    if re.search(r"坐", a):
        return "sit"
    if re.search(r"挥|举|抬", a):
        return "wave"
    return "stand"


def wrap_text(text: str, max_len: int = 22) -> list[str]:
    t = re.sub(r"\s+", "", text or "")
    if len(t) <= max_len:
        return [t] if t else [""]
    return [t[i : i + max_len] for i in range(0, min(len(t), max_len * 2), max_len)]


def draw_env(d: ImageDraw.ImageDraw, scene: str, mood: str) -> None:
    gy = int(H * 0.68)
    d.line([(int(W * 0.04), gy), (int(W * 0.96), gy)], fill=INK_MED, width=2)
    for x in range(int(W * 0.04), int(W * 0.96), 10):
        d.line([(x, gy + 2), (x + 5, gy + 2)], fill=INK_LIGHT, width=1)

    et = env_type(scene)
    if et == "street":
        d.rectangle([int(W * 0.06), int(H * 0.42), int(W * 0.20), gy], outline=INK_LIGHT, width=1)
        d.rectangle([int(W * 0.67), int(H * 0.40), int(W * 0.83), gy], outline=INK_LIGHT, width=1)
        cx = W // 2
        for y in range(gy, int(H * 0.88), 14):
            d.line([(cx, y), (cx, y + 7)], fill=INK_LIGHT, width=1)
    elif et == "indoor":
        d.line([(int(W * 0.04), gy), (int(W * 0.04), int(H * 0.22))], fill=INK_MED, width=2)
        d.line([(int(W * 0.04), int(H * 0.22)), (int(W * 0.96), int(H * 0.22))], fill=INK_MED, width=2)
        d.rectangle([int(W * 0.72), int(H * 0.30), int(W * 0.88), int(H * 0.42)], outline=INK_LIGHT, width=1)
        d.rectangle([int(W * 0.58), int(H * 0.58), int(W * 0.80), int(H * 0.68)], outline=INK_LIGHT, width=1)
    elif et == "nature":
        d.arc([int(W * 0.04), int(H * 0.50), int(W * 0.96), int(H * 0.72)], 180, 0, fill=INK_LIGHT, width=1)
        d.line([(int(W * 0.18), gy), (int(W * 0.18), int(H * 0.48))], fill=INK_MED, width=1)
        d.ellipse([int(W * 0.14), int(H * 0.40), int(W * 0.22), int(H * 0.48)], outline=INK_MED, width=1)
        d.line([(int(W * 0.82), gy), (int(W * 0.82), int(H * 0.50))], fill=INK_MED, width=1)
        d.ellipse([int(W * 0.78), int(H * 0.42), int(W * 0.86), int(H * 0.50)], outline=INK_MED, width=1)
    else:
        d.arc([int(W * 0.08), int(H * 0.55), int(W * 0.92), int(H * 0.72)], 180, 0, fill=INK_LIGHT, width=1)
        d.ellipse([int(W * 0.74), int(H * 0.22), int(W * 0.88), int(H * 0.32)], outline=INK_LIGHT, width=1)

    if et == "sunset" or re.search(r"黄昏|夕阳", scene or ""):
        sx, sy = int(W * 0.82), int(H * 0.26)
        d.ellipse([sx - 18, sy - 18, sx + 18, sy + 18], outline=(180, 90, 40, 90), width=1)


def draw_limb(d: ImageDraw.ImageDraw, x1: float, y1: float, x2: float, y2: float, ox: float, oy: float, sc: float) -> None:
    d.line([(ox + x1 * sc, oy + y1 * sc), (ox + x2 * sc, oy + y2 * sc)], fill=INK_MED, width=max(1, int(1.4 * sc)))


def draw_stick(d: ImageDraw.ImageDraw, ox: float, oy: float, sc: float, action: str, name: str) -> None:
    p = pose(action)
    head_r = 3.2 * sc
    d.ellipse([ox - head_r, oy - 14 * sc - head_r, ox + head_r, oy - 14 * sc + head_r], outline=INK_MED, width=max(1, int(1.4 * sc)))

    if p == "bend":
        d.line([(ox, oy - 10.8 * sc), (ox + 2 * sc, oy - 4 * sc)], fill=INK_MED, width=max(1, int(1.4 * sc)))
        draw_limb(d, 2, -8, 5, -3, ox, oy, sc)
        draw_limb(d, 2, -7, -2, -4, ox, oy, sc)
        draw_limb(d, 2, -4, -1, 0, ox, oy, sc)
        draw_limb(d, 2, -4, 4, 0, ox, oy, sc)
    elif p == "run":
        d.line([(ox, oy - 10.8 * sc), (ox, oy - 2 * sc)], fill=INK_MED, width=max(1, int(1.4 * sc)))
        draw_limb(d, -4, -8, -8, -3, ox, oy, sc)
        draw_limb(d, 4, -9, 9, -4, ox, oy, sc)
        draw_limb(d, -2, -2, -5, 2, ox, oy, sc)
        draw_limb(d, 2, -2, 6, 1, ox, oy, sc)
    elif p == "lookback":
        d.line([(ox, oy - 10.8 * sc), (ox, oy - 2 * sc)], fill=INK_MED, width=max(1, int(1.4 * sc)))
        draw_limb(d, -4, -8, -7, -5, ox, oy, sc)
        draw_limb(d, 4, -8, 6, -11, ox, oy, sc)
        draw_limb(d, -2, -2, -3.5, 0, ox, oy, sc)
        draw_limb(d, 2, -2, 3.5, 0, ox, oy, sc)
    elif p == "reach":
        d.line([(ox, oy - 10.8 * sc), (ox, oy - 2 * sc)], fill=INK_MED, width=max(1, int(1.4 * sc)))
        draw_limb(d, -4, -8, -3, -5, ox, oy, sc)
        draw_limb(d, 4, -8, 8, -5, ox, oy, sc)
        draw_limb(d, -2, -2, -3, 0, ox, oy, sc)
        draw_limb(d, 2, -2, 3, 0, ox, oy, sc)
        d.rectangle([ox + 6 * sc, oy - 6 * sc, ox + 10 * sc, oy - 3 * sc], outline=INK_LIGHT, width=1)
    else:
        d.line([(ox, oy - 10.8 * sc), (ox, oy - 2 * sc)], fill=INK_MED, width=max(1, int(1.4 * sc)))
        draw_limb(d, -4, -8, -7, -4, ox, oy, sc)
        draw_limb(d, 4, -8, 7, -4, ox, oy, sc)
        draw_limb(d, -2, -2, -3.5, 0, ox, oy, sc)
        draw_limb(d, 2, -2, 3.5, 0, ox, oy, sc)

    f_sm = font(max(9, int(10 * sc)))
    tw = d.textlength(name, font=f_sm) if name else 0
    d.text((ox - tw / 2, oy - 22 * sc), name or "", fill=(0, 0, 0, 170), font=f_sm)
    f_xs = font(max(8, int(8 * sc)))
    aw = d.textlength(action, font=f_xs) if action else 0
    d.text((ox - aw / 2, oy + 2 * sc), action or "", fill=(0, 0, 0, 100), font=f_xs)


def resolve_pos(char: dict, index: int, total: int) -> tuple[float, float]:
    p = char.get("p", "center")
    if p in POS_MAP:
        return POS_MAP[p]
    slots = [POS_MAP["left"], POS_MAP["right"]] if total == 2 else [
        POS_MAP["far-left"], POS_MAP["left"], POS_MAP["center"], POS_MAP["right"], POS_MAP["far-right"]
    ]
    return slots[index % len(slots)]


def draw_frame(img: Image.Image, frame: dict[str, Any], offset: tuple[int, int] = (0, 0)) -> None:
    fw, fh = W, H
    ox, oy = offset
    crop = img.crop((ox, oy, ox + fw, oy + fh))
    d = ImageDraw.Draw(crop, "RGBA")
    d.rectangle([0, 0, fw, fh], fill=PAPER)

    # 三分线
    for i in (1, 2):
        x = int(fw * i / 3)
        y = int(fh * i / 3)
        d.line([(x, 0), (x, int(fh * 0.88))], fill=(0, 0, 0, 25), width=1)
        d.line([(0, y), (fw, y)], fill=(0, 0, 0, 25), width=1)

    draw_env(d, frame.get("set", ""), frame.get("mood", ""))

    chars = frame.get("chars") or [{"n": "角色", "p": "center", "a": "出现"}]
    shot = frame.get("shot", "中景")
    base_sc = SHOT_SCALE.get(shot, 0.56) * (fh / 100)

    for i, c in enumerate(chars):
        px, py = resolve_pos(c, i, len(chars))
        x, y = px * fw, py * fh
        sc = base_sc
        if len(chars) > 1 and c.get("p") in ("left", "far-left", "right", "far-right"):
            sc *= 0.92
        draw_stick(d, x, y, sc, c.get("a", "站立"), c.get("n", ""))

    f_set = font(14)
    set_text = frame.get("set", "场景")
    d.text((fw // 2 - d.textlength(set_text, font=f_set) / 2, int(fh * 0.02)), set_text, fill=(0, 0, 0, 90), font=f_set)

    # 帧号
    d.rectangle([8, 8, 36, 28], fill=(0, 0, 0))
    f_id = font(14)
    fid = str(frame.get("id", 1))
    d.text((22 - d.textlength(fid, font=f_id) / 2, 10), fid, fill=(255, 255, 255), font=f_id)

    # 景别
    shot_text = shot
    f_shot = font(13)
    sw = int(d.textlength(shot_text, font=f_shot)) + 16
    shot_color = (255, 51, 51) if shot == "特写" else (0, 0, 0)
    d.rectangle([fw - sw - 8, 8, fw - 8, 28], fill=shot_color)
    d.text((fw - sw / 2 - 8 - d.textlength(shot_text, font=f_shot) / 2, 10), shot_text, fill=(255, 255, 255), font=f_shot)

    # 情绪
    mood = frame.get("mood", "")
    if mood:
        f_mood = font(11)
        d.text((fw - 10 - d.textlength(mood, font=f_mood), int(fh * 0.08)), mood, fill=(0, 0, 0, 80), font=f_mood)

    # 叙述
    d.rectangle([0, int(fh * 0.88), fw, fh], fill=(0, 0, 0, 10))
    d.line([(8, int(fh * 0.88)), (fw - 8, int(fh * 0.88))], fill=(0, 0, 0, 50), width=1)
    f_narr = font(13)
    for i, line in enumerate(wrap_text(frame.get("desc", ""), 22)):
        d.text((fw // 2 - d.textlength(line, font=f_narr) / 2, int(fh * 0.90) + i * 18), line, fill=(0, 0, 0, 200), font=f_narr)

    img.paste(crop, (ox, oy))


def draw_board(frames: list[dict], cols: int = 3, pad: int = 12) -> Image.Image:
    n = len(frames)
    rows = math.ceil(n / cols)
    bw = cols * W + (cols + 1) * pad
    bh = rows * H + (rows + 1) * pad + 40
    img = Image.new("RGB", (bw, bh), "#FFFFFF")
    d = ImageDraw.Draw(img)
    f_title = font(20)
    d.text((pad, 8), "StoryLens Easy Draft · 分镜草图", fill=(0, 0, 0), font=f_title)

    for i, frame in enumerate(frames):
        c, r = i % cols, i // cols
        x = pad + c * (W + pad)
        y = 40 + pad + r * (H + pad)
        draw_frame(img, frame, (x, y))
        d.rectangle([x, y, x + W, y + H], outline=(0, 0, 0), width=2)
    return img


SAMPLE_FRAMES = [
    {
        "id": 1,
        "desc": "黄昏老街路口，女孩独自站在斑马线旁回望",
        "shot": "全景",
        "set": "街道·黄昏",
        "mood": "感伤",
        "chars": [{"n": "女孩", "p": "center", "a": "回望"}],
    },
    {
        "id": 2,
        "desc": "男孩从远处跑来，两人在路口相遇",
        "shot": "中景",
        "set": "街道",
        "mood": "紧张",
        "chars": [
            {"n": "女孩", "p": "left", "a": "站立"},
            {"n": "男孩", "p": "right", "a": "奔跑"},
        ],
    },
    {
        "id": 3,
        "desc": "特写：女孩低头拾起地上的信件",
        "shot": "特写",
        "set": "街道",
        "mood": "遗憾",
        "chars": [{"n": "女孩", "p": "center", "a": "拾取"}],
    },
    {
        "id": 4,
        "desc": "室内窗边，老人静坐望向窗外",
        "shot": "中景",
        "set": "室内",
        "mood": "怀念",
        "chars": [{"n": "老人", "p": "right", "a": "坐"}],
    },
    {
        "id": 5,
        "desc": "远景：两人背影渐行渐远",
        "shot": "远景",
        "set": "自然环境",
        "mood": "释然",
        "chars": [
            {"n": "女孩", "p": "left", "a": "行走"},
            {"n": "男孩", "p": "right", "a": "行走"},
        ],
    },
    {
        "id": 6,
        "desc": "近景：男孩挥手告别",
        "shot": "近景",
        "set": "街道·夕阳",
        "mood": "不舍",
        "chars": [{"n": "男孩", "p": "center", "a": "挥手"}],
    },
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Easy Draft 简笔画分镜生成")
    parser.add_argument("--frames", help="frames JSON 文件路径")
    parser.add_argument("--out", default="", help="输出 PNG 路径")
    parser.add_argument("--cols", type=int, default=3)
    args = parser.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if args.frames:
        with open(args.frames, encoding="utf-8") as f:
            data = json.load(f)
        frames = data.get("frames", data)
    else:
        frames = SAMPLE_FRAMES

    img = draw_board(frames, cols=args.cols)
    out = args.out or os.path.join(root, "demo-easy-draft.png")
    img.save(out, "PNG", optimize=True)
    print(f"Saved: {out} ({img.size[0]}x{img.size[1]}, {len(frames)} frames)")


if __name__ == "__main__":
    main()
