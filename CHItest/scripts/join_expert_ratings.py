#!/usr/bin/env python3
"""Join blinded expert CSVs to researcher task_id/stage after rating is complete.

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


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists() or path.stat().st_size == 0:
        return []
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    dim_rows: list[dict[str, str]] = []
    global_rows: list[dict[str, str]] = []
    comments: list[dict[str, str]] = []
    for expert_id, slug, folder in EXPERTS:
        for row in read_csv(folder / "primary_rating.csv"):
            key = KEY_BY_ITEM[row["item_id"]]
            dim_rows.append(
                {
                    "expert_id": expert_id,
                    "expert_slug": slug,
                    "item_id": row["item_id"],
                    "participant_id": key["participant_id"],
                    "task_id": key["task_id"],
                    "stage": key["stage"],
                    "block": key["block"],
                    "image_id": key["image_id"],
                    "dimension": row["dimension"],
                    "score": row["score"],
                }
            )
        for row in read_csv(folder / "global_rating.csv"):
            key = KEY_BY_ITEM[row["item_id"]]
            global_rows.append(
                {
                    "expert_id": expert_id,
                    "expert_slug": slug,
                    "item_id": row["item_id"],
                    "participant_id": key["participant_id"],
                    "task_id": key["task_id"],
                    "stage": key["stage"],
                    "block": key["block"],
                    "image_id": key["image_id"],
                    "interpretability": row["interpretability"],
                    "specificity": row["specificity"],
                    "executability": row["executability"],
                }
            )
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
    def write(name: str, rows: list[dict[str, str]]) -> None:
        if not rows:
            (out / name).write_text("", encoding="utf-8")
            return
        with (out / name).open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    write("joined_dimension_scores.csv", dim_rows)
    write("joined_global_ratings.csv", global_rows)
    write("joined_comments.csv", comments)
    print(f"dimensions={len(dim_rows)} globals={len(global_rows)} comments={len(comments)}")


if __name__ == "__main__":
    main()
