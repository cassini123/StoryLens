#!/usr/bin/env python3
"""Join blinded expert ratings.csv to researcher task_id/stage after rating is complete.

Experts never see stage. This script is for analysis only.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "data" / "expert-ratings"
KEY = json.loads((ROOT / "researcher" / "item_keyfile.json").read_text(encoding="utf-8"))
KEY_BY_ITEM = {row["item_id"]: row for row in KEY}

EXPERTS = [
    ("expert_01", "xinxiangyang", ROOT / "expert_01_xinxiangyang"),
    ("expert_02", "louyongqi", ROOT / "expert_02_louyongqi"),
    ("expert_03", "lihejin", ROOT / "expert_03_lihejin"),
    ("expert_04", "liuzhejun", ROOT / "expert_04_liuzhejun"),
]

SCORE_FIELDS = [
    "interpretability",
    "spatial_specificity",
    "temporal_action_specificity",
    "executability",
    "overall_precision",
    "reconstructable",
]


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists() or path.stat().st_size == 0:
        return []
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    ratings: list[dict[str, str]] = []
    comments: list[dict[str, str]] = []
    for expert_id, slug, folder in EXPERTS:
        for row in read_csv(folder / "ratings.csv"):
            key = KEY_BY_ITEM[row["item_id"]]
            rec: dict[str, str] = {
                "expert_id": expert_id,
                "expert_slug": slug,
                "item_id": row["item_id"],
                "participant_id": key["participant_id"],
                "task_id": key["task_id"],
                "stage": key["stage"],
                "block": key["block"],
                "image_id": key["image_id"],
            }
            for field in SCORE_FIELDS:
                rec[field] = row[field]
            ratings.append(rec)
        for row in read_csv(folder / "comments.csv"):
            key = KEY_BY_ITEM.get(row["item_id"])
            if not key:
                continue
            comments.append(
                {
                    "expert_id": expert_id,
                    "expert_slug": slug,
                    "item_id": row["item_id"],
                    "participant_id": key["participant_id"],
                    "task_id": key["task_id"],
                    "stage": key["stage"],
                    "comment": row.get("comment", ""),
                }
            )

    out = ROOT / "researcher"
    write_csv(out / "joined_ratings.csv", ratings)
    write_csv(out / "joined_comments.csv", comments)
    print(f"ratings={len(ratings)} comments={len(comments)}")


if __name__ == "__main__":
    main()
