#!/usr/bin/env python3
"""Compute P_i and P_norm from joined expert dimension scores.

Experts must not run this. It requires researcher joined CSVs that include stage.
"""
from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

JOINED = Path(__file__).resolve().parents[1] / "data" / "expert-ratings" / "researcher" / "joined_dimension_scores.csv"


def main() -> None:
    if not JOINED.exists() or JOINED.stat().st_size == 0:
        raise SystemExit("Run join_expert_ratings.py first.")
    with JOINED.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    grouped: dict[tuple[str, str, str], list[int]] = defaultdict(list)
    meta: dict[tuple[str, str, str], dict[str, str]] = {}
    for row in rows:
        key = (row["expert_id"], row["participant_id"], row["task_id"])
        grouped[key].append(int(row["score"]))
        meta[key] = row
    out_rows = []
    for key, scores in grouped.items():
        p_i = sum(scores)
        n = len(scores)
        p_norm = p_i / (3 * n) if n else ""
        info = meta[key]
        out_rows.append(
            {
                "expert_id": key[0],
                "participant_id": key[1],
                "task_id": key[2],
                "stage": info["stage"],
                "block": info["block"],
                "image_id": info["image_id"],
                "n_dims": n,
                "P_i": p_i,
                "P_norm": f"{p_norm:.6f}" if n else "",
            }
        )
    out = JOINED.with_name("joined_precision.csv")
    with out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(out_rows[0].keys()))
        writer.writeheader()
        writer.writerows(out_rows)
    print(f"wrote {out} rows={len(out_rows)}")


if __name__ == "__main__":
    main()
