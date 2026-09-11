#!/usr/bin/env python3
"""Summarize adjudicated strict-valid RQ3 re-expression codes."""
from __future__ import annotations

import csv
import json
import statistics
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RQ3 = ROOT / "analysis" / "rq3"
RATINGS = ROOT / "data" / "paper-miniset" / "expert_ratings.csv"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, object]], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    traces = {
        (row["participant_id"], row["task_id"]): row
        for row in json.loads((RQ3 / "strict_t2_traces.json").read_text(encoding="utf-8"))
    }
    codes = read_csv(RQ3 / "adjudicated_codes.csv")
    rating_values: dict[tuple[str, str], list[float]] = defaultdict(list)
    for row in read_csv(RATINGS):
        rating_values[(row["participant_id"], row["task_id"])].append(
            float(row["overall_precision"])
        )

    enriched: list[dict[str, object]] = []
    for code in codes:
        key = (code["participant_id"], code["task_id"])
        trace = traces[key]
        scores = rating_values[key]
        if len(scores) != 4:
            raise ValueError(f"{key} has {len(scores)} rating records")
        auto_text = str(trace["selected_auto_prompt"])
        final_text = str(trace["final_text"])
        enriched.append(
            {
                **code,
                "sketch_action_count": trace["sketch_action_count"],
                "auto_prompt_count": trace["auto_prompt_count"],
                "auto_length": len(auto_text),
                "final_length": len(final_text),
                "auto_final_similarity": f"{SequenceMatcher(None, auto_text, final_text).ratio():.4f}",
                "overall_precision": f"{statistics.mean(scores):.4f}",
            }
        )
    fields = list(enriched[0].keys())
    write_csv(RQ3 / "coded_traces_with_scores.csv", enriched, fields)

    summary: list[dict[str, object]] = []
    primary_counts = Counter(row["primary_pattern"] for row in enriched)
    for pattern in [
        "direct_adoption",
        "selective_revision",
        "substantive_rewriting",
        "corrective_rewriting",
        "unclassifiable",
    ]:
        subset = [row for row in enriched if row["primary_pattern"] == pattern]
        values = [float(row["overall_precision"]) for row in subset]
        participants = {row["participant_id"] for row in subset}
        summary.append(
            {
                "code_type": "primary_pattern",
                "code": pattern,
                "task_count": primary_counts[pattern],
                "task_percent": f"{100 * primary_counts[pattern] / len(enriched):.1f}",
                "participant_count": len(participants),
                "overall_precision_mean": (
                    f"{statistics.mean(values):.3f}" if values else ""
                ),
                "overall_precision_sd": (
                    f"{statistics.stdev(values):.3f}" if len(values) > 1 else ""
                ),
                "overall_precision_median": (
                    f"{statistics.median(values):.3f}" if values else ""
                ),
            }
        )
    for field in [
        "adds_detail",
        "removes_detail",
        "changes_relation_or_action",
        "camera_language_retained",
        "minimal_sketch_trace",
    ]:
        subset = [row for row in enriched if row[field] == "1"]
        values = [float(row["overall_precision"]) for row in subset]
        participants = {row["participant_id"] for row in subset}
        summary.append(
            {
                "code_type": "secondary_code",
                "code": field,
                "task_count": len(subset),
                "task_percent": f"{100 * len(subset) / len(enriched):.1f}",
                "participant_count": len(participants),
                "overall_precision_mean": (
                    f"{statistics.mean(values):.3f}" if values else ""
                ),
                "overall_precision_sd": (
                    f"{statistics.stdev(values):.3f}" if len(values) > 1 else ""
                ),
                "overall_precision_median": (
                    f"{statistics.median(values):.3f}" if values else ""
                ),
            }
        )
    write_csv(
        RQ3 / "pattern_summary.csv",
        summary,
        [
            "code_type",
            "code",
            "task_count",
            "task_percent",
            "participant_count",
            "overall_precision_mean",
            "overall_precision_sd",
            "overall_precision_median",
        ],
    )
    print(f"coded_units={len(enriched)} summary_rows={len(summary)}")


if __name__ == "__main__":
    main()
