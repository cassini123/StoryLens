#!/usr/bin/env python3
"""Rebuild the paper miniset from tracked participant packets (append-only).

Reads every CHItest/data/participants/P*.zip on the current branch and
extends (never rewrites) these mirrors:
  CHItest/data/paper-miniset/{participants_group,participants_valid,final_texts}.csv
  paper-miniset/{participants_group,participants_valid,final_texts}.csv

Validity rule mirrors the existing n=20 extract: every packet with final
text for its T1/T2/T3 tasks is marked valid=yes; the original
protocol export_ready flag and issue are preserved in their own columns
and are NOT used to drop people.

For miniset participants missing from the blind keyfile, the script also
builds the next blind batch:
  CHItest/data/expert-ratings/blinded/items-batch<N>.json(.ndjson)
and appends matching researcher/item_keyfile.json entries (same order).
Item ids continue the I001.. sequence. Batch order is shuffled with a
fixed seed so experts cannot infer participant grouping. Re-running is
a no-op when nothing is missing.
"""
from __future__ import annotations

import csv
import json
import random
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARTICIPANTS = ROOT / "CHItest" / "data" / "participants"
MINISETS = [ROOT / "CHItest" / "data" / "paper-miniset", ROOT / "paper-miniset"]
BLINDED = ROOT / "CHItest" / "data" / "expert-ratings" / "blinded"
RESEARCHER = ROOT / "CHItest" / "data" / "expert-ratings" / "researcher"
STIMULI = ROOT / "CHItest" / "data" / "tasks" / "stimuli.json"
TARGET_MODS = ROOT / "CHItest" / "data" / "tasks" / "target_modifications.json"

GROUP_LABEL = {"scaffold": "Scaffold", "control": "Control"}
IMG_FOLDER = {"A": "camera", "C": "character_space", "E": "environment", "D": "composition"}
SHUFFLE_SEED = 2046

TIMING_WHY = (
    "All 7 tasks ended and have final_text. export_ready failed only on "
    "logging timestamps not closed. Efficacy uses final text not timing completeness."
)


def read_csv_rows(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def append_rows(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    with path.open("a", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})


def packet_id(zip_path: Path) -> str:
    return zip_path.name.replace(" ", "").removesuffix(".zip").split("-")[0]


def parse_packet(zip_path: Path) -> dict:
    z = zipfile.ZipFile(zip_path)
    names = z.namelist()

    def pick(suffix: str) -> str:
        matches = [n for n in names if n.endswith(suffix)]
        if not matches:
            raise KeyError(f"{zip_path.name} has no {suffix}")
        return matches[0]

    prow = list(csv.DictReader(__import__("io").TextIOWrapper(
        z.open(pick("participants.csv")), encoding="utf-8-sig")))[0]
    tasks = list(csv.DictReader(__import__("io").TextIOWrapper(
        z.open(pick("tasks.csv")), encoding="utf-8-sig")))
    val = {}
    try:
        vraw = json.loads(z.read(pick("validation.json")).decode("utf-8"))
        val = vraw[0] if isinstance(vraw, list) else vraw
    except KeyError:
        pass
    raw_group = (prow.get("experimental_group") or prow.get("group") or "").strip().lower()
    issues = val.get("validation_issues", val.get("issues", [])) or []
    return {
        "packet": packet_id(zip_path),
        "group": GROUP_LABEL.get(raw_group, raw_group),
        "export_ready": str(prow.get("export_ready", val.get("export_ready", ""))),
        "completion": prow.get("completion_status") or val.get("completion_status") or "",
        "has_validation": any(n.endswith("validation.json") for n in names),
        "issues": issues,
        "tasks": tasks,
    }


def validity_row(p: dict) -> dict:
    mods = [t for t in p["tasks"] if t.get("stage") in ("T1", "T2", "T3")]
    ended = [t for t in mods if t.get("ended_at")]
    finals = [t for t in mods if (t.get("final_text") or "").strip()]
    ready = str(p["export_ready"]).lower() in ("1", "true")
    codes = [i.get("code") for i in p["issues"] if isinstance(i, dict)]
    if ready and len(ended) == 6 and len(finals) == 6:
        return {"participant_id": p["packet"], "group": p["group"], "valid": "yes",
                "protocol_export_ready": 1, "protocol_issue": "",
                "why_included": "export_ready and all 7 tasks ended"}
    if not ready and len(ended) == 6 and len(finals) == 6 and codes == ["timing_complete"]:
        return {"participant_id": p["packet"], "group": p["group"], "valid": "yes",
                "protocol_export_ready": 0,
                "protocol_issue": "timing_complete: required timing events are not closed",
                "why_included": TIMING_WHY}
    if not ready and len(finals) == 6:
        unfinished = [t.get("task_id") for t in mods if not t.get("ended_at")]
        return {"participant_id": p["packet"], "group": p["group"], "valid": "yes",
                "protocol_export_ready": 0,
                "protocol_issue": "task_unfinished: " + ", ".join(unfinished) + " not finished",
                "why_included": "Session marked complete. Unfinished tasks still have final_text (included)."}
    raise SystemExit(f"Unhandled validity case for {p['packet']}: "
                     f"export_ready={p['export_ready']} ended={len(ended)}/6 finals={len(finals)}/6")


def main() -> None:
    zips = sorted(PARTICIPANTS.glob("P*.zip"), key=lambda z: packet_id(z))
    parsed = [parse_packet(z) for z in zips]
    by_id = {p["packet"]: p for p in parsed}

    for ms in MINISETS:
        existing_group = {r["participant_id"] for r in read_csv_rows(ms / "participants_group.csv")}
        existing_valid = {r["participant_id"] for r in read_csv_rows(ms / "participants_valid.csv")}
        existing_text = {(r["participant_id"], r["task_id"]) for r in read_csv_rows(ms / "final_texts.csv")}
        new_group, new_valid, new_text = [], [], []
        for p in parsed:
            pid = p["packet"]
            if pid not in existing_group:
                new_group.append({"participant_id": pid, "group": p["group"]})
            if pid not in existing_valid:
                new_valid.append(validity_row(p))
            for t in p["tasks"]:
                if t.get("stage") not in ("T1", "T2", "T3"):
                    continue
                if (pid, t.get("task_id")) not in existing_text:
                    new_text.append({
                        "participant_id": pid, "group": p["group"], "task_id": t.get("task_id"),
                        "stage": t.get("stage"), "block": t.get("block"), "image_id": t.get("image_id"),
                        "round": t.get("number_of_rounds") or t.get("round_count") or "",
                        "task_ended": 1 if t.get("ended_at") else 0,
                        "final_text": (t.get("final_text") or "").strip(),
                    })
        if new_group:
            append_rows(ms / "participants_group.csv", sorted(new_group, key=lambda r: r["participant_id"]),
                        ["participant_id", "group"])
        if new_valid:
            append_rows(ms / "participants_valid.csv", sorted(new_valid, key=lambda r: r["participant_id"]),
                        ["participant_id", "group", "valid", "protocol_export_ready", "protocol_issue", "why_included"])
        if new_text:
            append_rows(ms / "final_texts.csv", sorted(new_text, key=lambda r: (r["participant_id"], r["task_id"])),
                        ["participant_id", "group", "task_id", "stage", "block", "image_id", "round", "task_ended", "final_text"])
        print(f"{ms.relative_to(ROOT)}: +{len(new_group)} group, +{len(new_valid)} valid, +{len(new_text)} texts")

    # ---- blind batch for participants missing from the keyfile ----
    keyfile_path = RESEARCHER / "item_keyfile.json"
    keyfile = json.loads(keyfile_path.read_text(encoding="utf-8"))
    keyed = {r["participant_id"] for r in keyfile}
    missing = [p for p in parsed if p["packet"] not in keyed]
    if not missing:
        print("blind: every miniset participant already in keyfile; nothing to do")
        return
    batch_no = 2
    while (BLINDED / f"items-batch{batch_no}.json").exists():
        batch_no += 1
    stimuli = {im["image_id"]: im for im in json.loads(STIMULI.read_text(encoding="utf-8"))["images"]}
    mods = json.loads(TARGET_MODS.read_text(encoding="utf-8"))
    nxt = max(int(r["item_id"][1:]) for r in keyfile) + 1
    units = []
    for p in missing:
        for t in p["tasks"]:
            if t.get("stage") not in ("T1", "T2", "T3"):
                continue
            img = t.get("image_id")
            units.append({
                "participant_id": p["packet"], "image_id": img,
                "image_title": stimuli[img]["title"],
                "image_path": f"CHItest/data/tasks/images/{IMG_FOLDER[img[0]]}/{img}.svg",
                "current_visual_state": mods[img]["current_visual_state"],
                "final_expression": (t.get("final_text") or "").strip(),
                "task_id": t.get("task_id"), "stage": t.get("stage"), "block": t.get("block"),
                "logged_participant_id": t.get("participant_id"),
            })
    assert all(u["final_expression"] for u in units), "empty final_text in blind batch"
    for u in units:
        assert (ROOT / u["image_path"]).exists(), f"missing stimulus {u['image_path']}"
    rng = random.Random(SHUFFLE_SEED)
    order = list(range(len(units)))
    rng.shuffle(order)
    items, keys = [], []
    for k, idx in enumerate(order):
        u = units[idx]
        iid = f"I{nxt + k:03d}"
        items.append({"item_id": iid, **{kk: u[kk] for kk in (
            "participant_id", "image_id", "image_title",
            "image_path", "current_visual_state", "final_expression")}})
        keys.append({"item_id": iid, "participant_id": u["participant_id"],
                     "logged_participant_id": u["logged_participant_id"],
                     "task_id": u["task_id"], "stage": u["stage"],
                     "block": u["block"], "image_id": u["image_id"]})
    batch_json = BLINDED / f"items-batch{batch_no}.json"
    batch_json.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    (BLINDED / f"items-batch{batch_no}.ndjson").write_text(
        "\n".join(json.dumps(i, ensure_ascii=False) for i in items), encoding="utf-8")
    keyfile.extend(keys)
    keyfile_path.write_text(json.dumps(keyfile, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"blind: wrote {batch_json.name} with {len(items)} items "
          f"({', '.join(sorted(set(u['participant_id'] for u in units)))})")


if __name__ == "__main__":
    sys.exit(main())
