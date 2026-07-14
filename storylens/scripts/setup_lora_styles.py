#!/usr/bin/env python3
"""Sync four user LoRA reference folders to StoryLens style paths (no frontend changes).

Mapping (style-catalog.md):
  lora1线稿速涂     → style-refs/sketch/
  lora2光照渲染     → style-refs/render/
  lora3美式漫画     → lora/lora美式漫画/  (anime pseudo-LoRA, used by existing PSEUDO_LORA_STYLE_MAP)
  lora4日系街头漫画 → style-refs/street/
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE = ROOT / "训练素材"
ASSETS = Path(__file__).resolve().parent.parent / "assets"
STYLE_REFS = ASSETS / "style-refs"
LORA_DIR = ASSETS / "lora"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"}

MAPPINGS = [
    {
        "src": SOURCE / "lora1线稿速涂",
        "dest": STYLE_REFS / "sketch",
        "style": "sketch",
        "trigger": "storylens sketch, pencil drawing, hand-drawn, rough lines, concept art",
    },
    {
        "src": SOURCE / "lora2光照渲染",
        "dest": STYLE_REFS / "render",
        "style": "render",
        "trigger": "cinematic render, photorealistic, dramatic lighting, depth of field, high quality",
    },
    {
        "src": SOURCE / "lora3美式漫画",
        "dest": LORA_DIR / "lora美式漫画",
        "style": "anime",
        "trigger": "American comic style, bold ink lines, graphic novel aesthetic, high contrast cel shading",
        "meta": True,
    },
    {
        "src": SOURCE / "lora4日系街头漫画",
        "dest": STYLE_REFS / "street",
        "style": "street",
        "trigger": "Japanese street illustration style, fresh color palette, slice of life, clean lineart",
    },
]


def _list_images(folder: Path) -> list[str]:
    if not folder.is_dir():
        return []
    return sorted(
        p.name
        for p in folder.iterdir()
        if p.is_file() and p.suffix in IMAGE_EXTS
    )


def _sync_folder(src: Path, dest: Path) -> list[str]:
    dest.mkdir(parents=True, exist_ok=True)
    for old in dest.iterdir():
        if old.is_file() and old.name != ".gitkeep":
            old.unlink()
    copied: list[str] = []
    for name in _list_images(src):
        shutil.copy2(src / name, dest / name)
        copied.append(name)
    return copied


def main() -> None:
    print("=== StoryLens LoRA Style Setup ===")
    for item in MAPPINGS:
        src = item["src"]
        dest = item["dest"]
        style = item["style"]
        if not src.is_dir():
            print(f"  SKIP {style}: source missing → {src}")
            continue
        images = _sync_folder(src, dest)
        if not images:
            print(f"  SKIP {style}: no images in {src}")
            continue
        print(f"  OK  {style}: {len(images)} images → {dest.relative_to(ASSETS.parent)}")

        if item.get("meta"):
            meta = {
                "name": dest.name,
                "trigger": item["trigger"],
                "steps": 0,
                "time": __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "files": len(images),
                "images": images,
                "type": "pseudo_lora",
                "bindStyle": style,
            }
            (dest / "meta.json").write_text(
                json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"       meta.json updated (bindStyle={style})")

    print("Done. Restart jimeng proxy if running, then reload the page.")


if __name__ == "__main__":
    main()
