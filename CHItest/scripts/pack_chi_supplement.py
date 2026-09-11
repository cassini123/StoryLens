#!/usr/bin/env python3
"""Build an anonymized CHI supplementary ZIP (< 300 MB).

Usage:
  python3 CHItest/scripts/pack_chi_supplement.py
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path("/workspace")
CHITEST = ROOT / "CHItest"
OUT_DIR = Path("/opt/cursor/artifacts/chi-supplement-build")
ZIP_NAME = "CHI2027-Anonymous-Supplementary.zip"
ZIP_PATH = Path("/opt/cursor/artifacts") / ZIP_NAME
REPO_ZIP = CHITEST / "supplement" / ZIP_NAME

# Author / researcher / expert / deployment identifiers. Applied to copied text.
NAME_REPLACEMENTS = [
    ("Mickey", "researcher-a"),
    ("Cassini", "researcher-b"),
    ("cassini123", "anonymous-org"),
    ("辛向阳", "Expert 01"),
    ("娄永琪", "Expert 02"),
    ("李何槿", "Expert 03"),
    ("柳喆俊", "Expert 04"),
    ("xinxiangyang", "expert-01"),
    ("louyongqi", "expert-02"),
    ("lihejin", "expert-03"),
    ("liuzhejun", "expert-04"),
    ("xiangyang-xin", "expert-01"),
    ("yongqi-lou", "expert-02"),
    ("hejin-li", "expert-03"),
    ("zhejun-liu", "expert-04"),
    ("www.2027mitgo.top", "study.example.edu"),
    ("storyboard-skill.vercel.app", "study.example.edu"),
    ("12345678", "<redacted>"),
    ("Independent of StoryLens product features.", ""),
    ("Independent of the production application product features.", ""),
    ("StoryLens", ""),
    ("storylens", ""),
    ("storyboard-skill", "study-host"),
    ("jimeng_t2i_v40", "t2i-v40"),
    ("jimeng_task_id", "generation_task_id"),
    ("jimeng", "t2i"),
    ("CHItest", "study"),
    ("chitest", "study"),
    ("github.com", "example.edu"),
]

# Typed nicknames that are not zip labels. Remapped per-packet to the zip id.
NICKNAMES = ("Releac", "唧唧1", "mty", "oclock")

SKIP_FILE_NAMES = {
    "n11-json-parsed-full.md",
    ".env",
    ".env.local",
    ".DS_Store",
}

SKIP_DIR_NAMES = {
    "node_modules",
    ".git",
    ".next",
    "dist",
    "coverage",
    "__pycache__",
    "surprise",
    "participants",
}

BINARY_EXTS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".woff",
    ".woff2",
    ".ttf",
    ".ico",
}

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
    "2027mitgo",
    "storyboard-skill",
    "12345678",
    "Releac",
    "唧唧1",
    "StoryLens",
    "storylens",
    "the production application",
    "CHItest",
    "chitest",
    "jimeng",
    "github.com",
    "cassini",
]


def anon_text(s: str) -> str:
    for a, b in NAME_REPLACEMENTS:
        s = s.replace(a, b)
    return s


def strip_nicknames(s: str, label: str) -> str:
    for nick in NICKNAMES:
        s = s.replace(nick, label)
    return s


def should_skip(path: Path) -> bool:
    if set(path.parts) & SKIP_DIR_NAMES:
        return True
    if path.name in SKIP_FILE_NAMES:
        return True
    return False


def rewrite_auth(dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(
        """const KEY = 'chitest.researcher'
let memoryName: string | null = null

export const RESEARCHER_ACCOUNTS: Record<string, string> = {
  'researcher-a': '<redacted>',
  'researcher-b': '<redacted>',
}

function writeName(name: string | null): void {
  memoryName = name
  try {
    if (name) sessionStorage.setItem(KEY, name)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function loginResearcher(username: string, password: string): boolean {
  const expected = RESEARCHER_ACCOUNTS[username]
  if (!expected || expected !== password) return false
  writeName(username)
  notifyAuth()
  return true
}

export function researcherName(): string | null {
  try {
    const stored = sessionStorage.getItem(KEY)
    if (stored && RESEARCHER_ACCOUNTS[stored]) return stored
  } catch {
    /* ignore */
  }
  if (memoryName && RESEARCHER_ACCOUNTS[memoryName]) return memoryName
  return null
}

export function isResearcherAuthed(): boolean {
  return Boolean(researcherName())
}

export function logoutResearcher(): void {
  writeName(null)
  notifyAuth()
}

export function notifyAuth(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('chitest-auth'))
}
""",
        encoding="utf-8",
    )


def copy_text_file(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    text = src.read_text(encoding="utf-8", errors="replace")
    dest.write_text(anon_text(text), encoding="utf-8")


def copy_binary(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)


def copy_tree(src: Path, dest: Path) -> None:
    if not src.exists():
        return
    for path in src.rglob("*"):
        if not path.is_file() or should_skip(path):
            continue
        rel = path.relative_to(src)
        out = dest / rel
        if path.suffix.lower() in BINARY_EXTS:
            copy_binary(path, out)
        else:
            try:
                copy_text_file(path, out)
            except Exception:
                copy_binary(path, out)


def extract_packets(dest: Path) -> list[dict]:
    src_dir = CHITEST / "data" / "participants"
    out_dir = dest / "participants"
    out_dir.mkdir(parents=True, exist_ok=True)
    index: list[dict] = []
    for zip_path in sorted(src_dir.glob("P*.zip")):
        label = zip_path.name.split("-")[0]
        packet_dir = out_dir / label
        packet_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path) as zf:
            for info in zf.infolist():
                name = Path(info.filename).name
                if not name or name.startswith(".") or name.startswith("._"):
                    continue
                lower = name.lower()
                if lower.endswith("-session.json") or lower.endswith(".png") or lower.endswith(".jpg"):
                    continue
                if info.file_size > 2_000_000:
                    continue
                raw = zf.read(info)
                if name.endswith(".json"):
                    try:
                        obj = json.loads(raw.decode("utf-8"))
                        text = json.dumps(anon_obj(obj, label), ensure_ascii=False, indent=2)
                    except Exception:
                        text = strip_nicknames(anon_text(raw.decode("utf-8", errors="replace")), label)
                    (packet_dir / name).write_text(text, encoding="utf-8")
                elif name.endswith(".csv"):
                    decoded = raw.decode("utf-8-sig", errors="replace")
                    (packet_dir / name).write_text(anon_csv(decoded, label), encoding="utf-8")
                elif name.endswith(".md") or name.endswith(".txt"):
                    (packet_dir / name).write_text(
                        strip_nicknames(anon_text(raw.decode("utf-8", errors="replace")), label),
                        encoding="utf-8",
                    )
                else:
                    continue
        meta = summarize_packet(packet_dir, label, zip_path.name)
        index.append(meta)
        (packet_dir / "packet_index.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    (out_dir / "INDEX.csv").write_text(index_csv(index), encoding="utf-8")
    (out_dir / "INDEX.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    return index


def anon_obj(obj, label: str):
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in {"participant_id", "session_id"} and isinstance(v, str):
                out[k] = label
            elif k in {"username", "display_name", "researcher"}:
                out[k] = "redacted"
            else:
                out[k] = anon_obj(v, label)
        return out
    if isinstance(obj, list):
        return [anon_obj(x, label) for x in obj]
    if isinstance(obj, str):
        return strip_nicknames(anon_text(obj), label)
    return obj


def anon_csv(text: str, label: str) -> str:
    text = strip_nicknames(anon_text(text), label)
    buf = io.StringIO(text)
    reader = csv.DictReader(buf)
    if not reader.fieldnames:
        return text
    rows = []
    for row in reader:
        for key in ("participant_id", "session_id"):
            if key in row and row[key]:
                row[key] = label
        rows.append(row)
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=reader.fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return out.getvalue()


def first_json_record(path: Path):
    obj = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(obj, list):
        return obj[0] if obj else {}
    return obj if isinstance(obj, dict) else {}


def summarize_packet(packet_dir: Path, label: str, zip_name: str) -> dict:
    meta = {
        "id": label,
        "source_zip": re.sub(r"\s+", " ", zip_name).strip(),
        "group": "",
        "protocol_id": "",
        "completed_tasks": None,
        "export_ready": None,
        "files": sorted(p.name for p in packet_dir.iterdir() if p.is_file() and p.name != "packet_index.json"),
    }
    people = packet_dir / "participants.csv"
    if people.exists():
        rows = list(csv.DictReader(people.open(encoding="utf-8")))
        if rows:
            row = rows[0]
            raw_group = str(row.get("group") or row.get("experimental_group") or "").strip()
            if raw_group in {"1", "scaffold"}:
                meta["group"] = "scaffold"
            elif raw_group in {"0", "control"}:
                meta["group"] = "control"
            else:
                meta["group"] = raw_group
            meta["protocol_id"] = row.get("task_sequence_version") or ""
            meta["session_complete"] = str(row.get("completion_status") or "") == "complete"
            if row.get("export_ready") not in (None, ""):
                meta["export_ready"] = str(row.get("export_ready")).lower() in {"1", "true", "yes"}
    tasks = packet_dir / "tasks.csv"
    if tasks.exists():
        trows = list(csv.DictReader(tasks.open(encoding="utf-8")))
        ended = [r for r in trows if (r.get("ended_at") or r.get("completed_at") or "").strip()]
        meta["completed_tasks"] = len(ended) if ended else len(trows)
    val = next(packet_dir.glob("*validation.json"), None)
    if val:
        obj = first_json_record(val)
        if obj.get("export_ready") is not None:
            meta["export_ready"] = bool(obj.get("export_ready"))
        flags = obj.get("flags") or obj.get("study_flags") or {}
        meta["timing_complete"] = flags.get("timing_complete")
        sketch_ok = flags.get("sketch_never_sent")
        if sketch_ok is None:
            sketch_ok = flags.get("sketch_api_separation_valid")
        meta["sketch_never_sent"] = sketch_ok
        if obj.get("completion_status"):
            meta["session_complete"] = obj.get("completion_status") == "complete"
    return meta


def index_csv(index: list[dict]) -> str:
    fields = [
        "id",
        "group",
        "protocol_id",
        "completed_tasks",
        "export_ready",
        "timing_complete",
        "sketch_never_sent",
        "session_complete",
        "source_zip",
    ]
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    for row in index:
        w.writerow(row)
    return out.getvalue()


def redact_person_table_from_src(src: Path, dest: Path) -> None:
    text = src.read_text(encoding="utf-8")
    buf = io.StringIO(text)
    reader = csv.DictReader(buf)
    rows = list(reader)
    if not reader.fieldnames:
        dest.write_text(anon_text(text), encoding="utf-8")
        return
    for row in rows:
        typed = (row.get("typed_id") or "").strip()
        if typed in NICKNAMES:
            row["typed_id"] = "redacted-nickname"
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=reader.fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    dest.write_text(anon_text(out.getvalue()), encoding="utf-8")


def write_questionnaires(dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(
        """# Questionnaires and in-task items

Items below are the participant-facing study copy.
Chinese is the language shown to participants. English is included for reviewers.
No free-text interview was collected.

## 0. Session setup (before the first task)

| id | Chinese | English | response |
| --- | --- | --- | --- |
| participant_id | 被试编号 | Participant ID | text (analysis uses zip labels P001–P026) |
| cineExp | 影像 / 摄影经验 | Cinematography / photography experience | 没有 / 有一些 / 经常接触 |
| cineYears | 影像经验年数（没有就填 0） | Years of cinematography experience (0 if none) | integer |
| visualExp | 视觉 / 设计经验 | Visual / design experience | 没有 / 有一些 / 经常接触 |
| aiFam | 对生成式 AI 的熟悉程度 | Familiarity with generative AI | 没有 / 有一些 / 经常接触 |

English option labels: None / Some / Frequent.

## A. Per-task self-report (after each T1/T2/T3, before Next)

Scale: 1–7.

| id | Chinese | English |
| --- | --- | --- |
| self_alignment | 你最终想让 AI 完成的修改，与你原本想表达的内容有多一致？ | How well does the change you finally asked the AI to make match what you originally wanted to express? |
| result_alignment | 当前生成结果与你想表达的画面有多一致？ | How well does the current generated result match the picture you wanted to express? |

Anchors (zh): 1 = 完全不一致，7 = 完全一致。`self_alignment` 不是在给生成图打分。
Anchors (en): 1 = not at all, 7 = completely. `self_alignment` is not a score for the generated image.

`self_alignment` is the interaction-level precision proxy used when expert `P_norm` is unavailable.
`result_alignment` is recorded but is not the primary precision claim (model image quality is out of scope).

## B. End-of-session Likert (four items, 1–7)

Lead (zh): 下面几题是次要的，请按整场实验的整体感受作答。
Lead (en): These questions are secondary. Answer based on the session as a whole.

| id | Chinese label / hint | English label / hint |
| --- | --- | --- |
| perceived_control | 掌控感 — 你觉得自己在多大程度上把想要的画面表达清楚了？ | Perceived control — How much control did you feel over expressing your intended picture? |
| perceived_usefulness | 有帮助 — 这个过程对你理清自己想要的画面有多大帮助？ | Perceived usefulness — How useful was the process for clarifying your intention? |
| effort | 费力程度 — 整场实验需要你花多少心力？ | Cognitive effort — How much mental effort did the session require? |
| confidence | 把握 — 如果换一个人来布置你想要的画面，你觉得他能多大程度上做对？ | Confidence — How confident are you that someone else could stage your intended pictures? |

## C. T0 observation prompt (no generation)

Chinese: 请观察这张图，用你自己的语言描述你从这个画面中读到的视觉信息。你可以描述人物、空间、位置关系、构图、镜头、动作或氛围。没有标准答案，也不需要使用专业术语。

English: Look at this picture. In your own words, describe the visual information you read from the frame. You can mention people, space, positions, composition, the camera, action, or atmosphere. There is no single correct answer, and you do not need professional terms.

## D. T1 / T2 / T3 generation prompt

Chinese: 这是当前的视觉状态，描述你认为下一个镜头里会发生的内容。生成结果出现后，请观察它与自己想表达的效果有什么差异，并再次修改你的描述，让下一次生成更接近你的想法。没有设定标准答案，自由发挥！（我们提供<=3的修改轮次）

English: This is the current visual state. Describe what you think happens in the next shot. After the result appears, look at how it differs from what you wanted to express, and revise your description again so the next generation is closer. There is no set correct answer — feel free to improvise! (You have up to 3 revision rounds.)

Internal codes T0–T3 are never shown to participants.

### T2-only (scaffold group)

- Button: 生成文字解释 / Interpret Sketch
- Hint: 拖草图不会自动出字。改完后请点这一按钮，才会根据当前草图生成文字解释。
- Constraint: 请先改草图，点击「生成文字解释」，修改描述后再生成一次，才能进入下一题。
- The sketch is not sent to the image API (`sketch_sent=false`, `api_input=image+text`).

## E. Where responses live

- Setup / demographics: `ratings/demographics.csv` and `participants/PXXX/participants.csv`
- Per-task Likert: `ratings/self_alignment.csv`
- Expert rubric: `ratings/expert_ratings.csv` (empty in this deployment)
- Prompts: `participants/PXXX/text_versions.csv` (identifiers rewritten to zip labels)

The end-of-session Likert (perceived control / usefulness / effort / confidence) was shown in the client but was not written into the official export tables.
""",
        encoding="utf-8",
    )


def compile_ratings(out_dir: Path, index: list[dict]) -> None:
    ratings_dir = out_dir / "ratings"
    ratings_dir.mkdir(parents=True, exist_ok=True)
    packets = out_dir / "participants"
    align_rows: list[dict] = []
    demo_rows: list[dict] = []
    expert_rows: list[dict] = []
    expert_fields: list[str] | None = None
    for meta in index:
        folder = packets / meta["id"]
        sa = folder / "self_alignment.csv"
        if sa.exists():
            rows = list(csv.DictReader(sa.open(encoding="utf-8")))
            align_rows.extend(rows)
        people = folder / "participants.csv"
        if people.exists():
            for row in csv.DictReader(people.open(encoding="utf-8")):
                demo_rows.append(
                    {
                        "id": meta["id"],
                        "group": meta.get("group", ""),
                        "protocol_id": meta.get("protocol_id", ""),
                        "export_ready": meta.get("export_ready", ""),
                        "cinematography_experience": row.get("cinematography_experience", ""),
                        "cinematography_years": row.get("cinematography_years", ""),
                        "visual_experience": row.get("visual_experience", ""),
                        "AI_familiarity": row.get("AI_familiarity", ""),
                        "background": row.get("background", ""),
                        "started_at": row.get("started_at", ""),
                        "completed_at": row.get("completed_at", ""),
                    }
                )
        er = folder / "expert_ratings.csv"
        if er.exists() and er.stat().st_size > 0:
            with er.open(encoding="utf-8") as f:
                reader = csv.DictReader(f)
                expert_fields = expert_fields or list(reader.fieldnames or [])
                expert_rows.extend(list(reader))
    write_csv(ratings_dir / "self_alignment.csv", align_rows)
    write_csv(ratings_dir / "评分表-被试自评.csv", align_rows)
    write_csv(ratings_dir / "demographics.csv", demo_rows)

    sheet_rows: list[dict] = []
    for meta in index:
        folder = packets / meta["id"]
        tasks_path = folder / "tasks.csv"
        if not tasks_path.exists():
            continue
        for task in csv.DictReader(tasks_path.open(encoding="utf-8")):
            stage = (task.get("stage") or "").strip()
            if stage == "T0":
                continue
            sheet_rows.append(
                {
                    "participant_id": meta["id"],
                    "group": meta.get("group", ""),
                    "task_id": task.get("task_id", ""),
                    "stage": stage,
                    "block": task.get("block", ""),
                    "image_id": task.get("image_id", ""),
                    "self_alignment_1to7": task.get("self_alignment_rating", ""),
                    "result_alignment_1to7": task.get("result_alignment_rating", ""),
                    "expert_id": "",
                    "timepoint": "final",
                    "intent_precision_0to3": "",
                    "intent_interpretability_0to3": "",
                    "spatial_specificity_0to3": "",
                    "executability_0to3": "",
                    "naturalness": "",
                    "P_norm": task.get("P_norm", ""),
                    "comment": "",
                }
            )
    write_csv(ratings_dir / "评分表.csv", sheet_rows)
    write_csv(ratings_dir / "scoring-sheet.csv", sheet_rows)

    if expert_rows:
        write_csv(ratings_dir / "expert_ratings.csv", expert_rows)
    else:
        (ratings_dir / "expert_ratings.csv").write_text(
            "participant_id,session_id,task_id,stage,expert_id,timepoint,"
            "intent_precision,intent_interpretability,spatial_specificity,executability,naturalness,comment\n",
            encoding="utf-8",
        )

    person = CHITEST / "docs" / "n20-person-table.csv"
    if person.exists():
        redact_person_table_from_src(person, ratings_dir / "session-index.csv")

    (ratings_dir / "README.md").write_text(
        """# Scoring tables

## Filled (this study)

- `评分表-被试自评.csv` / `self_alignment.csv` — per-task participant ratings, 1–7.
  `self_alignment` = how well the final wording matched the intended change.
  `result_alignment` = how well the generated image matched the intended picture.
- `评分表.csv` / `scoring-sheet.csv` — one row per participant × task, with the
  filled 1–7 columns and empty expert 0–3 columns (`P_norm` empty).
- `demographics.csv` — cinematography / visual / generative-AI experience.
- `session-index.csv` — completeness flags for the n=20 freeze.

## Expert rubric (not yet filled)

Experts score the **wording**, not likeness to the still. Scale 0–3 on:

- intent_precision
- intent_interpretability
- spatial_specificity
- executability

`P_i` = sum of active criteria. `P_norm` = P_i / (3 × number of active criteria).
Plain language can receive 3 if it is executable. Jargon is never enough for a 3.

`expert_ratings.csv` is header-only: no expert submitted scores in this deployment.
Fill `评分表.csv` expert columns (or export from the expert page) and replace that file.

End-of-session Likert (control / usefulness / effort / confidence) was shown in
the client but was not written into the official export tables.
""",
        encoding="utf-8",
    )


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    fields: list[str] = []
    for row in rows:
        for k in row:
            if k not in fields:
                fields.append(k)
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    w.writerows(rows)
    path.write_text(out.getvalue(), encoding="utf-8")


def copy_image_library(dest: Path) -> None:
    lib = dest / "image-library"
    src = CHITEST / "data" / "tasks" / "images"
    n_png = n_svg = 0
    for path in sorted(src.rglob("*")):
        if not path.is_file():
            continue
        ext = path.suffix.lower()
        if ext not in {".png", ".svg"}:
            continue
        rel = path.relative_to(src)
        copy_binary(path, lib / rel)
        if ext == ".png":
            n_png += 1
        else:
            n_svg += 1
    pub = CHITEST / "public" / "data" / "tasks" / "images"
    if pub.exists():
        for path in sorted(pub.rglob("*.png")):
            rel = path.relative_to(pub)
            out = lib / rel
            if not out.exists():
                copy_binary(path, out)
                n_png += 1
    for name in ("stimuli.json", "tasks.json", "target_modifications.json"):
        src_json = CHITEST / "data" / "tasks" / name
        if src_json.exists():
            copy_text_file(src_json, lib / "metadata" / name)
    (lib / "CATALOG.md").write_text(
        f"""# Image library

Still frames shown to participants as the current visual state.
Researcher target-modification notes are in `metadata/target_modifications.json`
and were **never shown** to participants.

Packed files: {n_png} PNG, {n_svg} SVG.

| group | folder | ids |
| --- | --- | --- |
| environment | `environment/` | E01–E05 |
| character / space | `character_space/` | C01–C04 |
| camera | `camera/` | A01–A15 (A01–A05 used in the study; A06–A15 extra pool) |
| composition | `composition/` | D01–D06 |

Study stills used in the 7-task sessions are E01–E05, C01–C04, A01–A05, D01–D06.

| ID | scene |
| --- | --- |
| E01 | empty theatre |
| E02 | ferry deck |
| E03 | bookstore entrance |
| E04 | park bench |
| E05 | foreground / background |
| C01 | train-station window |
| C02 | cafe facing pair |
| C03 | courtyard facing pair |
| C04 | street corner, three people |
| A01 | stair low angle |
| A02 | museum wall |
| A03 | corridor from above |
| A04 | subway approaching |
| A05 | bench, distracted |
| D01 | half-hidden behind a column |
| D02 | figure behind a door |
| D03 | corridor direction |
| D04 | gallery crossing |
| D05 | dining table, three people |
| D06 | inside / outside glass |
""",
        encoding="utf-8",
    )


def write_readme(dest: Path, index: list[dict], size_mb: float | None = None) -> None:
    n_s = sum(1 for r in index if r.get("group") == "scaffold")
    n_c = sum(1 for r in index if r.get("group") == "control")
    dest.write_text(
        f"""# Supplementary materials

Anonymous supplementary package for a CHI 2027 paper on a temporary visual
scaffold for precise natural-language image editing.

This archive is **self-contained**. It does not include product source code,
repository URLs, live study URLs, author or institution names, or credentials.

## Contents

```
README.md
experiment-design/
  experiment-protocol.md
  experiment.json
  questionnaires.md
image-library/
  CATALOG.md
  environment/ C01–style stills as PNG + SVG
  character_space/
  camera/
  composition/
  metadata/                 stimuli and target-modification JSON
participants/
  INDEX.csv
  P001/ … P026/             official session tables (no embedded images)
ratings/
  评分表.csv                  participant 1–7 + empty expert 0–3 columns
  评分表-被试自评.csv           filled self-alignment / result-alignment
  self_alignment.csv
  scoring-sheet.csv
  demographics.csv
  session-index.csv
  expert_ratings.csv           expert rubric (empty in this deployment)
```

## Participants

{len(index)} collected sessions ({n_s} scaffold, {n_c} control), including
incomplete / failed-validation sessions. Inclusion rules are in
`experiment-design/experiment-protocol.md`.

Official tables in each `participants/PXXX/` folder:

- `participants.csv`, `tasks.csv`, `event_log.csv` / `events.csv`
- `text_versions.csv`, `generations.csv`
- `sketch_interactions.csv`, `sketch_snapshots.json`, `auto_prompts.csv`
- `self_alignment.csv`, `expert_ratings.csv`
- `full_session_timeline.json`, `validation.json`, `session_recovery.json`

Raw session JSON with embedded generated images is omitted (would exceed
the 300 MB limit). The **stimulus image library** is included in full.

## Ratings

Per-task `self_alignment` and `result_alignment` (1–7) are in
`ratings/self_alignment.csv`. Expert `P_norm` was not collected
(`ratings/expert_ratings.csv` is header-only).

## Anonymization

- Session IDs are labels `P001`…`P026`.
- Typed nicknames were rewritten to those labels.
- Author, researcher, expert, product, and repository identifiers were removed.
- Do not host this archive on a public repository that also contains
  identifiable projects.

## Ethics

For confidential paper review only. Do not redistribute participant logs.
""",
        encoding="utf-8",
    )


def write_user_guide(dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(
        """# Operator notes (anonymized)

The study client is a Vite + React app in `source/` of this package.

- Participants open `/chitest/` (or `/` in local `npm run dev`) and enter a participant code.
- Do not tell participants which group they are in.
- Scaffold (export `group` = 1): T0×1 + T1×2 + T2×2 + T3×2
- Control (export `group` = 0): T0×1 + T1×4 + T3×2
- Researcher login is required only to open expert / coding / bulk export pages.
  Credentials are redacted in this supplement (`researcher-a` / `researcher-b`).
- Each finished session downloads a ZIP of official CSV/JSON tables.
- Sketch pixels are never sent to the image API (`api_input = image+text`, `sketch_sent = false`).
- Do not bump `chitest.store.v*` during an in-progress study; it wipes local client state.

See `experiment-protocol.md` for inclusion rules and logging.
""",
        encoding="utf-8",
    )


def scan_pii(root: Path) -> list[str]:
    hits: list[str] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() in BINARY_EXTS:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for needle in PII_SCAN:
            if needle in text:
                rel = path.relative_to(root)
                hits.append(f"{rel}: {needle}")
    return hits


def write_zip(src: Path, dest: Path) -> None:
    if dest.exists():
        dest.unlink()
    dest.parent.mkdir(parents=True, exist_ok=True)
    readme = src / "README.md"
    with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as zf:
        # CHI looks for README.md; keep a copy at the archive root as well as
        # inside the packaged folder.
        if readme.exists():
            zf.write(readme, arcname="README.md")
        for path in src.rglob("*"):
            if path.is_file():
                zf.write(path, arcname=str(Path("CHI2027-Anonymous-Supplementary") / path.relative_to(src)))


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    copy_image_library(OUT_DIR)
    index = extract_packets(OUT_DIR)
    compile_ratings(OUT_DIR, index)

    proto = CHITEST / "docs" / "experiment-protocol.md"
    if proto.exists():
        copy_text_file(proto, OUT_DIR / "experiment-design" / "experiment-protocol.md")
    cfg = CHITEST / "config" / "experiment.json"
    if cfg.exists():
        copy_text_file(cfg, OUT_DIR / "experiment-design" / "experiment.json")
    write_questionnaires(OUT_DIR / "experiment-design" / "questionnaires.md")
    write_readme(OUT_DIR / "README.md", index)

    hits = scan_pii(OUT_DIR)
    if hits:
        raise SystemExit("PII scan failed:\n" + "\n".join(hits[:50]))

    write_zip(OUT_DIR, ZIP_PATH)
    size_mb = ZIP_PATH.stat().st_size / (1024 * 1024)
    digest = hashlib.sha256(ZIP_PATH.read_bytes()).hexdigest()
    manifest = (
        f"file: {ZIP_NAME}\n"
        f"bytes: {ZIP_PATH.stat().st_size}\n"
        f"megabytes: {size_mb:.2f}\n"
        f"sha256: {digest}\n"
        f"packets: {len(index)}\n"
    )
    (ZIP_PATH.parent / "CHI2027-Anonymous-Supplementary.MANIFEST.txt").write_text(manifest, encoding="utf-8")
    (CHITEST / "supplement").mkdir(parents=True, exist_ok=True)
    (CHITEST / "supplement" / "MANIFEST.txt").write_text(manifest, encoding="utf-8")
    # Local copy for download; gitignored so it is not published on the identifiable repo.
    shutil.copy2(ZIP_PATH, CHITEST / "supplement" / ZIP_NAME)

    print(manifest)
    if size_mb >= 300:
        raise SystemExit("ZIP exceeds 300 MB")


if __name__ == "__main__":
    main()
