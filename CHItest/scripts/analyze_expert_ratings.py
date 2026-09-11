#!/usr/bin/env python3
"""Build the paper miniset rating table and participant-level statistics."""
from __future__ import annotations

import csv
import math
from collections import defaultdict
from pathlib import Path

import numpy as np
from scipy import stats


ROOT = Path(__file__).resolve().parents[1]
JOINED = ROOT / "data" / "expert-ratings" / "researcher" / "joined_ratings.csv"
GROUPS = ROOT / "data" / "paper-miniset" / "participants_group.csv"
OUT_DIR = ROOT / "data" / "paper-miniset"
MIRROR_DIR = ROOT.parent / "paper-miniset"
RESULTS_DIR = ROOT / "analysis" / "expert-ratings"

CONTINUOUS = [
    "interpretability",
    "spatial_specificity",
    "temporal_action_specificity",
    "executability",
    "overall_precision",
]
OUTCOME_FIELDS = CONTINUOUS + ["reconstructable"]
BLOCK_ORDER = {"early": 0, "middle": 1, "transfer": 2}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, object]], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def mean_ci(values: list[float]) -> tuple[float, float, float, float]:
    a = np.asarray(values, dtype=float)
    mean = float(np.mean(a))
    sd = float(np.std(a, ddof=1))
    se = sd / math.sqrt(len(a))
    critical = float(stats.t.ppf(0.975, len(a) - 1))
    return mean, sd, mean - critical * se, mean + critical * se


def hedges_g(a: list[float], b: list[float]) -> float:
    x, y = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    pooled = math.sqrt(
        ((len(x) - 1) * np.var(x, ddof=1) + (len(y) - 1) * np.var(y, ddof=1))
        / (len(x) + len(y) - 2)
    )
    if pooled == 0:
        return 0.0
    d = (float(np.mean(x)) - float(np.mean(y))) / pooled
    correction = 1 - 3 / (4 * (len(x) + len(y)) - 9)
    return d * correction


def paired_dz(after: list[float], before: list[float]) -> float:
    changes = np.asarray(after, dtype=float) - np.asarray(before, dtype=float)
    sd = float(np.std(changes, ddof=1))
    return float(np.mean(changes)) / sd if sd else 0.0


def icc_absolute(matrix: np.ndarray) -> tuple[float, float]:
    """Return ICC(A,1) and ICC(A,k), i.e. Shrout-Fleiss ICC(2,1)/(2,k)."""
    n, k = matrix.shape
    grand = float(np.mean(matrix))
    row_means = np.mean(matrix, axis=1)
    col_means = np.mean(matrix, axis=0)
    ms_rows = k * float(np.sum((row_means - grand) ** 2)) / (n - 1)
    ms_cols = n * float(np.sum((col_means - grand) ** 2)) / (k - 1)
    residual = matrix - row_means[:, None] - col_means[None, :] + grand
    ms_error = float(np.sum(residual**2)) / ((n - 1) * (k - 1))
    single = (ms_rows - ms_error) / (
        ms_rows + (k - 1) * ms_error + k * (ms_cols - ms_error) / n
    )
    average = (ms_rows - ms_error) / (ms_rows + (ms_cols - ms_error) / n)
    return single, average


def fleiss_kappa(binary_matrix: np.ndarray) -> float:
    n, k = binary_matrix.shape
    counts = np.column_stack(
        ((binary_matrix == 0).sum(axis=1), (binary_matrix == 1).sum(axis=1))
    )
    observed = np.mean(np.sum(counts * (counts - 1), axis=1) / (k * (k - 1)))
    proportions = counts.sum(axis=0) / (n * k)
    expected = float(np.sum(proportions**2))
    return float((observed - expected) / (1 - expected))


def main() -> None:
    rows = read_csv(JOINED)
    groups = {row["participant_id"]: row["group"] for row in read_csv(GROUPS)}
    if len(rows) != 600:
        raise ValueError(f"Expected 600 joined ratings, found {len(rows)}")

    paper_rows: list[dict[str, object]] = []
    for row in rows:
        paper_rows.append(
            {
                "participant_id": row["participant_id"],
                "group": groups[row["participant_id"]],
                "task_id": row["task_id"],
                "stage": row["stage"],
                "block": row["block"],
                "image_id": row["image_id"],
                "expert_id": row["expert_id"],
                **{field: row[field] for field in OUTCOME_FIELDS},
            }
        )
    paper_fields = [
        "participant_id",
        "group",
        "task_id",
        "stage",
        "block",
        "image_id",
        "expert_id",
        *OUTCOME_FIELDS,
    ]
    write_csv(OUT_DIR / "expert_ratings.csv", paper_rows, paper_fields)
    write_csv(MIRROR_DIR / "expert_ratings.csv", paper_rows, paper_fields)

    # Average raters within a participant-task, then the two tasks within a block.
    task_values: dict[tuple[str, str, str], list[float]] = defaultdict(list)
    task_meta: dict[tuple[str, str], tuple[str, str]] = {}
    for row in rows:
        task_key = (row["participant_id"], row["task_id"])
        task_meta[task_key] = (groups[row["participant_id"]], row["block"])
        for outcome in OUTCOME_FIELDS:
            task_values[(row["participant_id"], row["task_id"], outcome)].append(
                float(row[outcome])
            )

    block_values: dict[tuple[str, str, str], list[float]] = defaultdict(list)
    for (participant, task, outcome), values in task_values.items():
        group, block = task_meta[(participant, task)]
        block_values[(participant, block, outcome)].append(float(np.mean(values)))

    participant_rows: list[dict[str, object]] = []
    participant_lookup: dict[tuple[str, str, str], float] = {}
    for (participant, block, outcome), values in block_values.items():
        if len(values) != 2:
            raise ValueError(f"{participant}/{block}/{outcome} has {len(values)} tasks")
        value = float(np.mean(values))
        participant_lookup[(participant, block, outcome)] = value
        participant_rows.append(
            {
                "participant_id": participant,
                "group": groups[participant],
                "block": block,
                "outcome": outcome,
                "value": f"{value:.6f}",
            }
        )
    participant_rows.sort(
        key=lambda r: (
            str(r["participant_id"]),
            BLOCK_ORDER[str(r["block"])],
            OUTCOME_FIELDS.index(str(r["outcome"])),
        )
    )
    write_csv(
        RESULTS_DIR / "participant_block_scores.csv",
        participant_rows,
        ["participant_id", "group", "block", "outcome", "value"],
    )

    summary_rows: list[dict[str, object]] = []
    for outcome in OUTCOME_FIELDS:
        for group in ("Scaffold", "Control"):
            participants = sorted(p for p, g in groups.items() if g == group)
            for block in ("early", "middle", "transfer"):
                values = [participant_lookup[(p, block, outcome)] for p in participants]
                mean, sd, low, high = mean_ci(values)
                summary_rows.append(
                    {
                        "outcome": outcome,
                        "group": group,
                        "block": block,
                        "n": len(values),
                        "mean": f"{mean:.3f}",
                        "sd": f"{sd:.3f}",
                        "ci95_low": f"{low:.3f}",
                        "ci95_high": f"{high:.3f}",
                    }
                )
    write_csv(
        RESULTS_DIR / "group_block_summary.csv",
        summary_rows,
        ["outcome", "group", "block", "n", "mean", "sd", "ci95_low", "ci95_high"],
    )

    inference_rows: list[dict[str, object]] = []
    for outcome in OUTCOME_FIELDS:
        by_group = {
            group: sorted(p for p, g in groups.items() if g == group)
            for group in ("Scaffold", "Control")
        }
        changes: dict[str, list[float]] = {}
        for group, participants in by_group.items():
            early = [participant_lookup[(p, "early", outcome)] for p in participants]
            middle = [participant_lookup[(p, "middle", outcome)] for p in participants]
            change = [m - e for m, e in zip(middle, early)]
            changes[group] = change
            estimate, sd, low, high = mean_ci(change)
            test = stats.ttest_rel(middle, early)
            inference_rows.append(
                {
                    "outcome": outcome,
                    "contrast": f"{group}: middle - early",
                    "estimate": f"{estimate:.3f}",
                    "ci95_low": f"{low:.3f}",
                    "ci95_high": f"{high:.3f}",
                    "test": "paired_t",
                    "statistic": f"{float(test.statistic):.3f}",
                    "df": len(change) - 1,
                    "p_value": f"{float(test.pvalue):.6f}",
                    "effect_size": f"dz={paired_dz(middle, early):.3f}",
                }
            )

        scaffold_change = changes["Scaffold"]
        control_change = changes["Control"]
        test = stats.ttest_ind(scaffold_change, control_change, equal_var=False)
        estimate = float(np.mean(scaffold_change) - np.mean(control_change))
        se = math.sqrt(
            np.var(scaffold_change, ddof=1) / len(scaffold_change)
            + np.var(control_change, ddof=1) / len(control_change)
        )
        df = float(
            (np.var(scaffold_change, ddof=1) / len(scaffold_change)
             + np.var(control_change, ddof=1) / len(control_change))
            ** 2
            / (
                (np.var(scaffold_change, ddof=1) / len(scaffold_change)) ** 2
                / (len(scaffold_change) - 1)
                + (np.var(control_change, ddof=1) / len(control_change)) ** 2
                / (len(control_change) - 1)
            )
        )
        critical = float(stats.t.ppf(0.975, df))
        inference_rows.append(
            {
                "outcome": outcome,
                "contrast": "difference-in-differences",
                "estimate": f"{estimate:.3f}",
                "ci95_low": f"{estimate - critical * se:.3f}",
                "ci95_high": f"{estimate + critical * se:.3f}",
                "test": "welch_t",
                "statistic": f"{float(test.statistic):.3f}",
                "df": f"{df:.2f}",
                "p_value": f"{float(test.pvalue):.6f}",
                "effect_size": f"g={hedges_g(scaffold_change, control_change):.3f}",
            }
        )

        scaffold_transfer = [
            participant_lookup[(p, "transfer", outcome)] for p in by_group["Scaffold"]
        ]
        control_transfer = [
            participant_lookup[(p, "transfer", outcome)] for p in by_group["Control"]
        ]
        test = stats.ttest_ind(scaffold_transfer, control_transfer, equal_var=False)
        estimate = float(np.mean(scaffold_transfer) - np.mean(control_transfer))
        se = math.sqrt(
            np.var(scaffold_transfer, ddof=1) / len(scaffold_transfer)
            + np.var(control_transfer, ddof=1) / len(control_transfer)
        )
        df = float(
            (np.var(scaffold_transfer, ddof=1) / len(scaffold_transfer)
             + np.var(control_transfer, ddof=1) / len(control_transfer))
            ** 2
            / (
                (np.var(scaffold_transfer, ddof=1) / len(scaffold_transfer)) ** 2
                / (len(scaffold_transfer) - 1)
                + (np.var(control_transfer, ddof=1) / len(control_transfer)) ** 2
                / (len(control_transfer) - 1)
            )
        )
        critical = float(stats.t.ppf(0.975, df))
        inference_rows.append(
            {
                "outcome": outcome,
                "contrast": "transfer: Scaffold - Control",
                "estimate": f"{estimate:.3f}",
                "ci95_low": f"{estimate - critical * se:.3f}",
                "ci95_high": f"{estimate + critical * se:.3f}",
                "test": "welch_t",
                "statistic": f"{float(test.statistic):.3f}",
                "df": f"{df:.2f}",
                "p_value": f"{float(test.pvalue):.6f}",
                "effect_size": f"g={hedges_g(scaffold_transfer, control_transfer):.3f}",
            }
        )
    write_csv(
        RESULTS_DIR / "participant_level_inference.csv",
        inference_rows,
        [
            "outcome",
            "contrast",
            "estimate",
            "ci95_low",
            "ci95_high",
            "test",
            "statistic",
            "df",
            "p_value",
            "effect_size",
        ],
    )

    # Reliability uses 150 participant-task targets rated by all four experts.
    target_order = sorted({(r["participant_id"], r["task_id"]) for r in rows})
    expert_order = ["expert_01", "expert_02", "expert_03", "expert_04"]
    rating_lookup = {
        (r["participant_id"], r["task_id"], r["expert_id"]): r for r in rows
    }
    reliability_rows: list[dict[str, object]] = []
    for outcome in CONTINUOUS:
        matrix = np.asarray(
            [
                [float(rating_lookup[(p, t, expert)][outcome]) for expert in expert_order]
                for p, t in target_order
            ]
        )
        single, average = icc_absolute(matrix)
        reliability_rows.append(
            {
                "outcome": outcome,
                "metric": "ICC(2,1)",
                "value": f"{single:.4f}",
                "targets": len(target_order),
                "raters": len(expert_order),
            }
        )
        reliability_rows.append(
            {
                "outcome": outcome,
                "metric": "ICC(2,4)",
                "value": f"{average:.4f}",
                "targets": len(target_order),
                "raters": len(expert_order),
            }
        )
    binary = np.asarray(
        [
            [
                int(rating_lookup[(p, t, expert)]["reconstructable"])
                for expert in expert_order
            ]
            for p, t in target_order
        ]
    )
    reliability_rows.append(
        {
            "outcome": "reconstructable",
            "metric": "Fleiss_kappa",
            "value": f"{fleiss_kappa(binary):.4f}",
            "targets": len(target_order),
            "raters": len(expert_order),
        }
    )
    write_csv(
        RESULTS_DIR / "interrater_reliability.csv",
        reliability_rows,
        ["outcome", "metric", "value", "targets", "raters"],
    )

    figure_rows = [
        row
        for row in summary_rows
        if row["outcome"] == "overall_precision"
    ]
    write_csv(
        RESULTS_DIR / "figure6_overall_precision.csv",
        figure_rows,
        ["outcome", "group", "block", "n", "mean", "sd", "ci95_low", "ci95_high"],
    )
    print(
        f"ratings={len(paper_rows)} participants={len(groups)} "
        f"participant_block_values={len(participant_rows)}"
    )


if __name__ == "__main__":
    main()
