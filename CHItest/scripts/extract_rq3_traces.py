#!/usr/bin/env python3
"""Extract strict-valid Scaffold T2 traces for reproducible RQ3 coding."""
from __future__ import annotations

import csv
import io
import json
import zipfile
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PARTICIPANTS = ROOT / "data" / "participants"
VALIDITY = ROOT / "data" / "paper-miniset" / "participants_valid.csv"
OUT = ROOT / "analysis" / "rq3"


def read_disk_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def member(zf: zipfile.ZipFile, suffix: str) -> str | None:
    matches = [name for name in zf.namelist() if name.endswith(suffix)]
    return matches[0] if matches else None


def read_zip_csv(zf: zipfile.ZipFile, suffix: str) -> list[dict[str, str]]:
    name = member(zf, suffix)
    if name is None:
        return []
    with io.TextIOWrapper(zf.open(name), encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def integer(value: str | None) -> int:
    try:
        return int(value or 0)
    except ValueError:
        return 0


def truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes"}


def select_auto_prompt(
    task: dict[str, str],
    prompts: list[dict[str, str]],
    generations: list[dict[str, str]],
) -> tuple[dict[str, str] | None, str]:
    """Select the prompt linked to the final successful generation when possible."""
    task_id = task["task_id"]
    satisfied = integer(task.get("satisfied_round") or task.get("round_of_satisfaction"))
    candidates = [
        row
        for row in prompts
        if row.get("task_id") == task_id and (row.get("auto_prompt") or row.get("p_auto"))
    ]
    successful = [
        row
        for row in generations
        if row.get("task_id") == task_id
        and truthy(row.get("success"))
        and (not satisfied or integer(row.get("round")) <= satisfied)
    ]
    successful.sort(key=lambda row: (integer(row.get("round")), row.get("timestamp_start", "")))
    if successful:
        auto_id = successful[-1].get("auto_prompt_id", "")
        if auto_id:
            linked = next(
                (row for row in candidates if row.get("auto_prompt_id") == auto_id), None
            )
            if linked is not None:
                return linked, "linked_to_last_successful_generation"

    eligible = [
        row
        for row in candidates
        if not satisfied or integer(row.get("round")) <= satisfied
    ]
    eligible.sort(key=lambda row: (integer(row.get("round")), row.get("timestamp", "")))
    if eligible:
        return eligible[-1], "latest_prompt_at_or_before_satisfied_round"
    return None, "missing"


def main() -> None:
    strict_scaffold = [
        row["participant_id"]
        for row in read_disk_csv(VALIDITY)
        if row["group"] == "Scaffold" and row["protocol_export_ready"] == "1"
    ]
    records: list[dict[str, object]] = []

    for participant_id in strict_scaffold:
        packets = sorted(PARTICIPANTS.glob(f"{participant_id}*.zip"))
        if len(packets) != 1:
            raise ValueError(f"Expected one packet for {participant_id}, found {packets}")
        with zipfile.ZipFile(packets[0]) as zf:
            tasks = read_zip_csv(zf, "tasks.csv")
            sketches = read_zip_csv(zf, "sketch_interactions.csv")
            prompts = read_zip_csv(zf, "auto_prompts.csv")
            generations = read_zip_csv(zf, "generations.csv")
            text_versions = read_zip_csv(zf, "text_versions.csv")
            events = read_zip_csv(zf, "event_log.csv") or read_zip_csv(zf, "events.csv")

            t2_tasks = [
                row
                for row in tasks
                if row.get("stage") == "T2" and row.get("block") == "middle"
            ]
            if len(t2_tasks) != 2:
                raise ValueError(f"{participant_id} has {len(t2_tasks)} T2 tasks")

            for task in t2_tasks:
                task_id = task["task_id"]
                task_sketches = [
                    row for row in sketches if row.get("task_id") == task_id
                ]
                task_sketches.sort(key=lambda row: row.get("timestamp", ""))
                task_prompts = [
                    row for row in prompts if row.get("task_id") == task_id
                ]
                task_prompts.sort(
                    key=lambda row: (integer(row.get("round")), row.get("timestamp", ""))
                )
                selected, method = select_auto_prompt(task, prompts, generations)
                final_text = (task.get("final_text") or "").strip()
                final_versions = [
                    row
                    for row in text_versions
                    if row.get("task_id") == task_id and row.get("text_type") == "final"
                ]
                if final_versions and final_versions[-1].get("text", "").strip() != final_text:
                    raise ValueError(f"Final text mismatch for {participant_id}/{task_id}")
                action_counts = Counter(
                    row.get("action_type", "unknown") for row in task_sketches
                )
                task_events = [row for row in events if row.get("task_id") == task_id]
                selected_text = (
                    (selected.get("auto_prompt") or selected.get("p_auto") or "").strip()
                    if selected
                    else ""
                )
                records.append(
                    {
                        "participant_id": participant_id,
                        "task_id": task_id,
                        "image_id": task.get("image_id", ""),
                        "satisfied_round": integer(
                            task.get("satisfied_round")
                            or task.get("round_of_satisfaction")
                        ),
                        "sketch_action_count": len(task_sketches),
                        "sketch_action_counts": dict(sorted(action_counts.items())),
                        "sketch_actions": task_sketches,
                        "auto_prompt_count": len(task_prompts),
                        "auto_prompts": task_prompts,
                        "selected_auto_prompt_id": (
                            selected.get("auto_prompt_id", "") if selected else ""
                        ),
                        "selected_auto_prompt_method": method,
                        "selected_auto_prompt": selected_text,
                        "selected_user_prompt_after": (
                            selected.get("user_prompt_after", "").strip()
                            if selected
                            else ""
                        ),
                        "selected_copy_ratio": (
                            selected.get("copy_ratio", "") if selected else ""
                        ),
                        "final_text": final_text,
                        "final_text_source": "tasks.csv:final_text",
                        "interpret_event_count": sum(
                            "interpret" in row.get("event_type", "")
                            for row in task_events
                        ),
                    }
                )

    if len(records) != 20:
        raise ValueError(f"Expected 20 strict-valid T2 traces, found {len(records)}")
    if any(not row["selected_auto_prompt"] or not row["final_text"] for row in records):
        raise ValueError("Every trace must contain selected Auto Prompt and final text")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "strict_t2_traces.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    fields = [
        "participant_id",
        "task_id",
        "image_id",
        "satisfied_round",
        "sketch_action_count",
        "sketch_action_counts",
        "auto_prompt_count",
        "selected_auto_prompt_id",
        "selected_auto_prompt_method",
        "selected_auto_prompt",
        "selected_user_prompt_after",
        "selected_copy_ratio",
        "final_text",
        "final_text_source",
        "interpret_event_count",
    ]
    with (OUT / "strict_t2_traces.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for record in records:
            writer.writerow(
                {
                    field: (
                        json.dumps(record[field], ensure_ascii=False, sort_keys=True)
                        if isinstance(record[field], dict)
                        else record[field]
                    )
                    for field in fields
                }
            )
    print(f"participants={len(strict_scaffold)} traces={len(records)}")


if __name__ == "__main__":
    main()
