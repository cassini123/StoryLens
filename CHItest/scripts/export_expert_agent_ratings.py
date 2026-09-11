#!/usr/bin/env python3
"""Export anonymized expert-agent ratings as a standalone ZIP.

Reads the joined CSVs from the expert-blind-ratings git ref (not from
participant packets, which have empty expert_ratings.csv). Drops expert
name slugs, nicknames, and product paths.

Usage:
  python3 CHItest/scripts/export_expert_agent_ratings.py
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import shutil
import subprocess
import zipfile
from collections import defaultdict
from pathlib import Path
from statistics import mean

ROOT = Path("/workspace")
CHITEST = ROOT / "CHItest"
SOURCE_REF = "origin/cursor/expert-blind-ratings-2046"
OUT_DIR = Path("/opt/cursor/artifacts/expert-ratings-anon-build")
ZIP_NAME = "CHI2027-Expert-Agent-Ratings-Anonymous.zip"
ZIP_PATH = Path("/opt/cursor/artifacts") / ZIP_NAME
REPO_DATA = CHITEST / "data" / "expert-ratings" / "anonymous"
REPO_ZIP = CHITEST / "supplement" / ZIP_NAME

RATING_FIELDS = [
    "expert_id",
    "item_id",
    "participant_id",
    "task_id",
    "stage",
    "block",
    "image_id",
    "interpretability",
    "spatial_specificity",
    "temporal_action_specificity",
    "executability",
    "overall_precision",
    "reconstructable",
]
SCORE_FIELDS = [
    "interpretability",
    "spatial_specificity",
    "temporal_action_specificity",
    "executability",
    "overall_precision",
    "reconstructable",
]
COMMENT_FIELDS = [
    "expert_id",
    "item_id",
    "participant_id",
    "task_id",
    "stage",
    "comment",
]
ITEM_FIELDS = [
    "item_id",
    "participant_id",
    "image_id",
    "image_title",
    "current_visual_state",
    "final_expression",
]

PII_SCAN = [
    "Mickey",
    "Cassini",
    "cassini123",
    "辛向阳",
    "娄永琪",
    "李何槿",
    "柳喆俊",
    "xinxiangyang",
    "louyongqi",
    "lihejin",
    "liuzhejun",
    "xiangyang-xin",
    "yongqi-lou",
    "hejin-li",
    "zhejun-liu",
    "2027mitgo",
    "storyboard-skill",
    "Releac",
    "唧唧1",
    "oclock",
    "StoryLens",
    "storylens",
    "SceneSketch",
    "CHItest",
    "chitest",
    "jimeng",
    "github.com",
    "cursor.com",
    "vercel",
    "logged_participant_id",
    "expert_slug",
]


def git_show(path: str) -> bytes:
    return subprocess.check_output(["git", "show", f"{SOURCE_REF}:{path}"], cwd=ROOT)


def git_show_text(path: str) -> str:
    return git_show(path).decode("utf-8")


def write_csv(path: Path, fields: list[str], rows: list[dict]) -> None:
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(out.getvalue(), encoding="utf-8")


def as_int(value: str) -> int:
    return int(str(value).strip())


def load_ratings() -> list[dict]:
    raw = list(csv.DictReader(io.StringIO(git_show_text("CHItest/data/expert-ratings/researcher/joined_ratings.csv"))))
    rows = []
    for row in raw:
        clean = {k: (row.get(k) or "").strip() for k in RATING_FIELDS}
        if clean["expert_id"] not in {"expert_01", "expert_02", "expert_03", "expert_04"}:
            raise SystemExit(f"unexpected expert_id: {clean['expert_id']}")
        for field in SCORE_FIELDS:
            as_int(clean[field])
        rows.append(clean)
    if len(rows) != 480:
        raise SystemExit(f"expected 480 rating rows, got {len(rows)}")
    return rows


def load_comments() -> list[dict]:
    raw = list(csv.DictReader(io.StringIO(git_show_text("CHItest/data/expert-ratings/researcher/joined_comments.csv"))))
    rows = []
    for row in raw:
        clean = {k: (row.get(k) or "").strip() for k in COMMENT_FIELDS}
        if clean["expert_id"] not in {"expert_01", "expert_02", "expert_03", "expert_04"}:
            raise SystemExit(f"unexpected expert_id in comments: {clean['expert_id']}")
        rows.append(clean)
    return rows


def load_items() -> list[dict]:
    items = json.loads(git_show_text("CHItest/data/expert-ratings/blinded/items.json"))
    rows = []
    for item in items:
        rows.append({k: str(item.get(k) or "").strip() for k in ITEM_FIELDS})
    if len(rows) != 120:
        raise SystemExit(f"expected 120 rated items, got {len(rows)}")
    return rows


def scoring_brief() -> str:
    text = git_show_text("CHItest/data/expert-ratings/blinded/RATING_BRIEF.md")
    text = text.replace("SceneSketch Expert Rating Brief", "Blind expert rating brief")
    text = text.replace("SceneSketch", "the study")
    return text


def summarize_experts(ratings: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in ratings:
        grouped[row["expert_id"]].append(row)
    out = []
    for expert_id in sorted(grouped):
        rows = grouped[expert_id]
        rec = {"expert_id": expert_id, "n_ratings": str(len(rows))}
        for field in SCORE_FIELDS:
            rec[f"mean_{field}"] = f"{mean(as_int(r[field]) for r in rows):.3f}"
        out.append(rec)
    return out


def summarize_participants(ratings: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in ratings:
        grouped[row["participant_id"]].append(row)
    out = []
    for pid in sorted(grouped):
        rows = grouped[pid]
        rec = {
            "participant_id": pid,
            "n_items": str(len({r["item_id"] for r in rows})),
            "n_ratings": str(len(rows)),
        }
        for field in SCORE_FIELDS:
            rec[f"mean_{field}"] = f"{mean(as_int(r[field]) for r in rows):.3f}"
        out.append(rec)
    return out


def write_readme(path: Path, n_comments: int) -> None:
    path.write_text(
        f"""# Expert-agent ratings (anonymous)

Blind scores from four expert-persona agents (`expert_01` … `expert_04`).

This archive contains **only** the expert-agent scores and the items they
rated. Participant packets, still images, author names, expert real names,
typed nicknames, and repository URLs are not included.

## Coverage

- 120 items (P001–P020; six non-T0 tasks each)
- 4 experts × 120 items = **480 rating rows**
- {n_comments} optional comments
- T0 observation trials were not rated
- P021–P026 were collected after this rating batch and are not in this file

Scale: five 1–7 items plus reconstructable (0/1). This is **not** the
protocol’s 0–3 `P_norm` rubric. See `scoring-brief.md`.

## Files

```
README.md
scoring-brief.md              rubric shown to raters
expert_ratings.csv            480 rows, all experts
expert_comments.csv           optional comments
rated_items.csv               still caption + participant final text
summary_by_expert.csv         means per expert
summary_by_participant.csv    means per participant (across 4 experts)
expert_01/ … expert_04/       per-expert copies of ratings + comments
```

`participant_id` is the packet zip label (`P001`…`P020`), not the typed
in-session code. Several sessions reused typed id `P001`; do not join on
that field.

Experts did not see experimental group. `task_id` / `stage` / `block` were
joined after rating for analysis.

## Anonymization

- Expert real names and name slugs removed; ids are `expert_01`–`expert_04`
- Typed nicknames and in-session typed codes are omitted
- Stimulus paths rewritten out of `rated_items.csv`
- Do not host this archive on a public repository that also contains
  identifiable projects
""",
        encoding="utf-8",
    )


def scan_pii(root: Path) -> list[str]:
    hits: list[str] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for needle in PII_SCAN:
            if needle in text:
                hits.append(f"{path.relative_to(root)}: {needle}")
    return hits


def write_zip(src: Path, dest: Path) -> None:
    if dest.exists():
        dest.unlink()
    dest.parent.mkdir(parents=True, exist_ok=True)
    folder = "CHI2027-Expert-Agent-Ratings-Anonymous"
    with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as zf:
        zf.write(src / "README.md", arcname="README.md")
        for path in src.rglob("*"):
            if path.is_file():
                zf.write(path, arcname=str(Path(folder) / path.relative_to(src)))


def main() -> None:
    ratings = load_ratings()
    comments = load_comments()
    items = load_items()

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    write_csv(OUT_DIR / "expert_ratings.csv", RATING_FIELDS, ratings)
    write_csv(OUT_DIR / "expert_comments.csv", COMMENT_FIELDS, comments)
    write_csv(OUT_DIR / "rated_items.csv", ITEM_FIELDS, items)
    write_csv(
        OUT_DIR / "summary_by_expert.csv",
        ["expert_id", "n_ratings", *[f"mean_{f}" for f in SCORE_FIELDS]],
        summarize_experts(ratings),
    )
    write_csv(
        OUT_DIR / "summary_by_participant.csv",
        ["participant_id", "n_items", "n_ratings", *[f"mean_{f}" for f in SCORE_FIELDS]],
        summarize_participants(ratings),
    )
    (OUT_DIR / "scoring-brief.md").write_text(scoring_brief(), encoding="utf-8")
    write_readme(OUT_DIR / "README.md", len(comments))

    comments_by_expert: dict[str, list[dict]] = defaultdict(list)
    for row in comments:
        comments_by_expert[row["expert_id"]].append(row)
    per_expert_fields = [f for f in RATING_FIELDS if f != "expert_id"]
    per_comment_fields = [f for f in COMMENT_FIELDS if f != "expert_id"]
    for expert_id in ("expert_01", "expert_02", "expert_03", "expert_04"):
        folder = OUT_DIR / expert_id
        write_csv(
            folder / "ratings.csv",
            per_expert_fields,
            [{k: r[k] for k in per_expert_fields} for r in ratings if r["expert_id"] == expert_id],
        )
        write_csv(
            folder / "comments.csv",
            per_comment_fields,
            [{k: r[k] for k in per_comment_fields} for r in comments_by_expert.get(expert_id, [])],
        )

    hits = scan_pii(OUT_DIR)
    if hits:
        raise SystemExit("PII scan failed:\n" + "\n".join(hits[:50]))

    if REPO_DATA.exists():
        shutil.rmtree(REPO_DATA)
    shutil.copytree(OUT_DIR, REPO_DATA)

    write_zip(OUT_DIR, ZIP_PATH)
    (CHITEST / "supplement").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ZIP_PATH, REPO_ZIP)

    size = ZIP_PATH.stat().st_size
    digest = hashlib.sha256(ZIP_PATH.read_bytes()).hexdigest()
    names = zipfile.ZipFile(ZIP_PATH).namelist()
    blob = "\n".join(names)
    for needle in PII_SCAN:
        if needle in blob:
            raise SystemExit(f"PII in zip names: {needle}")

    manifest = (
        f"file: {ZIP_NAME}\n"
        f"bytes: {size}\n"
        f"megabytes: {size / (1024 * 1024):.2f}\n"
        f"sha256: {digest}\n"
        f"rating_rows: {len(ratings)}\n"
        f"comments: {len(comments)}\n"
        f"items: {len(items)}\n"
        f"zip_entries: {len(names)}\n"
        f"source_ref: {SOURCE_REF}\n"
    )
    (ZIP_PATH.parent / "CHI2027-Expert-Agent-Ratings-Anonymous.MANIFEST.txt").write_text(manifest, encoding="utf-8")
    (CHITEST / "supplement" / "EXPERT-RATINGS.MANIFEST.txt").write_text(manifest, encoding="utf-8")
    print(manifest)


if __name__ == "__main__":
    main()
