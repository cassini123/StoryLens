#!/usr/bin/env python3
"""Paper-protocol analysis for CHItest participant packets.

Reads unpacked export folders (or a directory of zips). Writes aggregate tables
only — never copies raw prompts into the output markdown.

  CHITEST_PACKET_DIR=/path/to/unpacked python3 CHItest/scripts/analyze_packets.py
"""
from __future__ import annotations

import csv
import json
import math
import os
import statistics
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

BLOCKS = ["baseline", "early", "middle", "transfer"]
WALL_OUTLIER_S = 1800

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
DEFAULTS = [
    Path(os.environ["CHITEST_PACKET_DIR"]) if os.environ.get("CHITEST_PACKET_DIR") else None,
    Path("/tmp/chitest-n11/unpacked"),
    REPO / "data" / "participants",
]


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def read_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def num(v, default=None):
    if v is None or str(v).strip() == "":
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def truthy(v) -> bool:
    return str(v).strip().lower() in {"1", "true", "yes"}


def mean(xs):
    xs = [x for x in xs if x is not None]
    return statistics.mean(xs) if xs else None


def median(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if xs else None


def sd(xs):
    xs = [x for x in xs if x is not None]
    if len(xs) > 1:
        return statistics.stdev(xs)
    return 0.0 if len(xs) == 1 else None


def fmt(v, digits=2):
    if v is None:
        return "—"
    if isinstance(v, float):
        return f"{v:.{digits}f}"
    return str(v)


class _LCG:
    def __init__(self, seed):
        self.s = seed & 0xFFFFFFFF

    def randint(self, a, b):
        self.s = (1664525 * self.s + 1013904223) & 0xFFFFFFFF
        return a + (self.s % (b - a + 1))


def hedges_g(a, b):
    a = [x for x in a if x is not None]
    b = [x for x in b if x is not None]
    if len(a) < 2 or len(b) < 2:
        return None
    na, nb = len(a), len(b)
    va, vb = statistics.stdev(a) ** 2, statistics.stdev(b) ** 2
    pooled = math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2)) if na + nb > 2 else None
    if not pooled:
        return 0.0
    g = (mean(a) - mean(b)) / pooled
    j = 1 - 3 / (4 * (na + nb) - 9) if (na + nb) > 2 else 1
    return g * j


def mannwhitney_u(a, b):
    a = [x for x in a if x is not None]
    b = [x for x in b if x is not None]
    if not a or not b:
        return None
    n1, n2 = len(a), len(b)
    ranks = [(x, 0) for x in a] + [(x, 1) for x in b]
    ranks.sort(key=lambda t: t[0])
    rank_vals = [0.0] * len(ranks)
    i = 0
    while i < len(ranks):
        j = i
        while j < len(ranks) and ranks[j][0] == ranks[i][0]:
            j += 1
        avg = (i + 1 + j) / 2
        for k in range(i, j):
            rank_vals[k] = avg
        i = j
    r1 = sum(rank_vals[k] for k, t in enumerate(ranks) if t[1] == 0)
    u1 = r1 - n1 * (n1 + 1) / 2
    u = min(u1, n1 * n2 - u1)
    mu = n1 * n2 / 2
    sigma = math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12)
    p = None
    if sigma:
        z = abs(u1 - mu) / sigma
        p = 2 * (1 - 0.5 * (1 + math.erf(z / math.sqrt(2))))
    return {"U": u, "n1": n1, "n2": n2, "p_approx": p}


def bootstrap_diff(a, b, n=2000, seed=11):
    a = [x for x in a if x is not None]
    b = [x for x in b if x is not None]
    if not a or not b:
        return None
    rng = _LCG(seed)
    diffs = []
    for _ in range(n):
        sa = [a[rng.randint(0, len(a) - 1)] for _ in range(len(a))]
        sb = [b[rng.randint(0, len(b) - 1)] for _ in range(len(b))]
        diffs.append(mean(sa) - mean(sb))
    diffs.sort()
    return {"mean": mean(diffs), "lo": diffs[int(0.025 * n)], "hi": diffs[int(0.975 * n)]}


def resolve_root() -> Path:
    for cand in DEFAULTS:
        if cand and cand.exists():
            return cand
    raise SystemExit("Set CHITEST_PACKET_DIR to unpacked packets or a folder of zips.")


def unpack_if_needed(root: Path, work: Path) -> Path:
    dirs = [p for p in root.iterdir() if p.is_dir() and (p / "participants.csv").exists()]
    if dirs:
        return root
    zips = list(root.glob("*.zip"))
    if not zips:
        raise SystemExit(f"No packets in {root}")
    work.mkdir(parents=True, exist_ok=True)
    for z in zips:
        name = z.stem.replace(" ", "")
        dest = work / name
        dest.mkdir(exist_ok=True)
        with zipfile.ZipFile(z) as zf:
            zf.extractall(dest)
    return work


def load_packet(folder: Path) -> dict:
    participants = read_csv(folder / "participants.csv")
    tasks = read_csv(folder / "tasks.csv")
    gens = read_csv(folder / "generations.csv")
    autos = read_csv(folder / "auto_prompts.csv")
    sketches = read_csv(folder / "sketch_interactions.csv")
    events = read_csv(folder / "event_log.csv") or read_csv(folder / "events.csv")
    validation = read_json(folder / "validation.json")
    recovery = read_json(folder / "session_recovery.json")
    p0 = participants[0] if participants else {}
    val = validation[0] if isinstance(validation, list) and validation else validation or {}
    rec = recovery[0] if isinstance(recovery, list) and recovery else recovery or {}
    return {
        "folder": folder.name,
        "packet": folder.name.replace("-packet", "").replace(" ", ""),
        "participant": p0,
        "tasks": tasks,
        "gens": gens,
        "autos": autos,
        "sketches": sketches,
        "events": events,
        "validation": val,
        "recovery": rec,
        "files": sorted(x.name for x in folder.iterdir()),
    }


def person_block(r, key, block):
    vals = [x for x in (r[key].get(block) or []) if x is not None]
    return mean(vals) if vals else None


def contrast(sample, key):
    sc = [r for r in sample if r["group"] == 1]
    ct = [r for r in sample if r["group"] == 0]

    def deltas(group):
        out = []
        for r in group:
            e = person_block(r, key, "early")
            m = person_block(r, key, "middle")
            if e is not None and m is not None:
                out.append(m - e)
        return out

    ds, dc = deltas(sc), deltas(ct)
    ts = [x for x in (person_block(r, key, "transfer") for r in sc) if x is not None]
    tc = [x for x in (person_block(r, key, "transfer") for r in ct) if x is not None]
    primary = (mean(ds) - mean(dc)) if ds and dc else None
    transfer = (mean(ts) - mean(tc)) if ts and tc else None
    return {
        "scaffold_n": len(sc),
        "control_n": len(ct),
        "scaffold_delta": mean(ds),
        "control_delta": mean(dc),
        "primary": primary,
        "scaffold_T3": mean(ts),
        "control_T3": mean(tc),
        "transfer": transfer,
        "ds": ds,
        "dc": dc,
        "g_delta": hedges_g(ds, dc),
        "g_t3": hedges_g(ts, tc),
        "mw_delta": mannwhitney_u(ds, dc),
        "mw_t3": mannwhitney_u(ts, tc),
        "boot_primary": bootstrap_diff(ds, dc),
        "boot_transfer": bootstrap_diff(ts, tc),
        "block_means": {
            gname: {
                b: {
                    "n": sum(1 for r in grp if person_block(r, key, b) is not None),
                    "mean": mean([person_block(r, key, b) for r in grp]),
                    "median": median([person_block(r, key, b) for r in grp]),
                    "sd": sd([person_block(r, key, b) for r in grp]),
                }
                for b in BLOCKS
            }
            for gname, grp in (("scaffold", sc), ("control", ct))
        },
    }


def build_rows(packets):
    rows = []
    for pkt in packets:
        p = pkt["participant"]
        group = str(p.get("group") or "")
        eg = p.get("experimental_group") or ""
        if group in {"1"} or eg == "scaffold":
            group_code, group_name = 1, "scaffold"
        elif group in {"0"} or eg == "control":
            group_code, group_name = 0, "control"
        else:
            group_code, group_name = None, group or "?"
        seq_ver = p.get("task_sequence_version") or ""
        completed = p.get("completion_status") or pkt["validation"].get("completion_status") or ""
        export_ready = truthy(p.get("export_ready"))
        if pkt["validation"] and "export_ready" in pkt["validation"]:
            export_ready = bool(pkt["validation"].get("export_ready"))
        flags = pkt["validation"].get("flags") or {}
        issues = pkt["validation"].get("issues") or pkt["validation"].get("validation_issues") or []
        tasks = pkt["tasks"]
        ended = [t for t in tasks if t.get("ended_at")]
        gens = pkt["gens"]
        for g in gens:
            g["_ok"] = truthy(g.get("success"))
            g["_sketch"] = truthy(g.get("sketch_sent"))
            err = (g.get("error") or "").lower()
            g["_concurrent"] = "concurrent" in err or "api concurrent limit" in err
        by_task = defaultdict(list)
        for g in gens:
            by_task[g.get("task_id")].append(g)
        sketch_sent_any = any(g["_sketch"] for g in gens)
        empty_sketch_id = all(not (g.get("input_sketch_snapshot_id") or "").strip() for g in gens) if gens else True
        api_ok = all((g.get("api_input") or "") == "image+text" for g in gens) if gens else True
        t2_loop_ok = True
        t2_tasks = [t for t in tasks if t.get("stage") == "T2"]
        for t in t2_tasks:
            tid = t.get("task_id")
            gok = [g for g in by_task[tid] if g["_ok"]]
            autos = [a for a in pkt["autos"] if a.get("task_id") == tid]
            acts = [s for s in pkt["sketches"] if s.get("task_id") == tid]
            if t.get("ended_at") and not (len(gok) >= 1 and autos and acts):
                t2_loop_ok = False
        if group_name == "control":
            t2_loop_ok = len(t2_tasks) == 0
        t0_has_targets = any(
            t.get("stage") == "T0"
            and (t.get("primary_target") or t.get("secondary_target") or t.get("target_modification_specification"))
            for t in tasks
        )
        self_by_block = defaultdict(list)
        result_by_block = defaultdict(list)
        wall_by_block = defaultdict(list)
        wall_clip = defaultdict(list)
        text_by_block = defaultdict(list)
        copy_by_block = defaultdict(list)
        plen_by_block = defaultdict(list)
        for t in tasks:
            block = t.get("block") or "?"
            wall = (num(t.get("total_task_time_ms")) or 0) / 1000
            if t.get("ended_at"):
                s, r = num(t.get("self_alignment_rating")), num(t.get("result_alignment_rating"))
                if s is not None:
                    self_by_block[block].append(s)
                if r is not None:
                    result_by_block[block].append(r)
                wall_by_block[block].append(wall)
                wall_clip[block].append(None if wall >= WALL_OUTLIER_S else wall)
                text_by_block[block].append((num(t.get("text_edit_time_ms")) or num(t.get("text_writing_time")) or 0) / 1000)
                plen_by_block[block].append(len(t.get("final_text") or ""))
                autos = [a for a in pkt["autos"] if a.get("task_id") == t.get("task_id")]
                copies = [c for c in (num(a.get("copy_ratio")) for a in autos) if c is not None]
                copy = copies[-1] if copies else num(t.get("copy_ratio"))
                if copy is not None:
                    copy_by_block[block].append(copy)
        gen_fail = sum(1 for g in gens if not g["_ok"])
        conc = sum(1 for g in gens if g["_concurrent"])
        all7 = len(ended) == 7
        v2 = seq_ver.startswith("formal-between-v2")
        has_val = bool(pkt["validation"])
        formal = all7 and v2 and export_ready and not sketch_sent_any and empty_sketch_id and api_ok and has_val
        flags_fail = [k for k, v in flags.items() if v is False]
        notes = []
        if not has_val:
            notes.append("missing_validation")
        if not v2:
            notes.append(f"protocol_{seq_ver or 'unknown'}")
        if t0_has_targets:
            notes.append("t0_has_targets")
        if flags_fail:
            notes.append("flags:" + ",".join(flags_fail))
        if conc:
            notes.append(f"concurrent_fail={conc}")
        rows.append(
            {
                "packet": pkt["packet"],
                "typed_id": p.get("participant_id"),
                "group": group_code,
                "group_name": group_name,
                "pattern": p.get("assignment_pattern"),
                "seq_ver": seq_ver,
                "export_ready": export_ready,
                "formal_efficacy": formal,
                "complete7": all7 and not sketch_sent_any,
                "n_ended": len(ended),
                "gen_ok": sum(1 for g in gens if g["_ok"]),
                "gen_fail": gen_fail,
                "concurrent_fail": conc,
                "sketch_sent_any": sketch_sent_any,
                "t2_loop_ok": t2_loop_ok,
                "p_norm_present": any((t.get("P_norm") or "").strip() for t in tasks),
                "self_raw": dict(self_by_block),
                "result_raw": dict(result_by_block),
                "wall_raw": dict(wall_by_block),
                "wall_clip_raw": dict(wall_clip),
                "text_raw": dict(text_by_block),
                "plen_raw": dict(plen_by_block),
                "copy_raw": dict(copy_by_block),
                "started_at": p.get("started_at"),
                "notes": notes,
                "n_issues": len(issues) if isinstance(issues, list) else 0,
            }
        )
    return rows


def main():
    root = unpack_if_needed(resolve_root(), Path("/tmp/chitest-packets-work"))
    packets = [load_packet(p) for p in sorted(root.iterdir()) if p.is_dir() and (p / "participants.csv").exists()]
    rows = build_rows(packets)
    formal = [r for r in rows if r["formal_efficacy"]]
    sens = [r for r in rows if r["complete7"]]
    print("packets", len(rows), "unique_start", len({r["started_at"] for r in rows}))
    print("typed_id collisions", {k: v for k, v in Counter(r["typed_id"] for r in rows).items() if v > 1})
    print("P_norm", any(r["p_norm_present"] for r in rows))
    print("formal", [r["packet"] for r in formal], Counter(r["group_name"] for r in formal))
    print("sens", [r["packet"] for r in sens], Counter(r["group_name"] for r in sens))
    metrics = [
        ("self_alignment", "self_raw"),
        ("result_alignment", "result_raw"),
        ("wallclock_s", "wall_raw"),
        ("wallclock_excl_30min", "wall_clip_raw"),
        ("prompt_len", "plen_raw"),
    ]
    for title, sample in [("formal", formal), ("complete7", sens)]:
        print(f"\n== {title} n={len(sample)} ==")
        for metric, key in metrics:
            c = contrast(sample, key)
            print(
                metric,
                "primary",
                fmt(c["primary"]),
                "SΔ",
                fmt(c["scaffold_delta"]),
                "CΔ",
                fmt(c["control_delta"]),
                "transfer",
                fmt(c["transfer"]),
            )


if __name__ == "__main__":
    main()
