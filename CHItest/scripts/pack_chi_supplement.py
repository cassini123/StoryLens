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
ZIP_NAME = "CHI2027-SceneSketch-Supplementary.zip"
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
    ("StoryLens", "the production application"),
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
    out_dir = dest / "data" / "packets"
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

Items below are copied from the study client (`source/app/shared/i18n.tsx`).
Chinese is the participant-facing language. English is included for reviewers.
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

## E. Where responses live in the packets

- Setup / demographics: `participants.csv`
- Per-task Likert: `self_alignment.csv` and columns on `tasks.csv`
- End questionnaire: columns on `participants.csv` (`perceived_control`, `perceived_usefulness`, `effort`, `confidence`)
- Prompts: `text_versions.csv` (identifiers rewritten to zip labels)
""",
        encoding="utf-8",
    )


def write_readme(dest: Path, index: list[dict], size_mb: float | None = None) -> None:
    n_s = sum(1 for r in index if r.get("group") == "scaffold")
    n_c = sum(1 for r in index if r.get("group") == "control")
    dest.write_text(
        f"""# Supplementary materials

Anonymous supplementary package for the CHI 2027 paper
**SceneSketch: A Temporary Visual Scaffold for Precise Natural-Language Image Editing**.

This ZIP contains source code, stimuli, tabulated participant logs, analysis
scripts and reports, the experiment protocol, and the questionnaires.
It does **not** contain author names, institution names, live deployment URLs,
researcher login credentials, or raw session JSON with embedded images.

## Contents

```
README.md                 this file
questionnaires.md         all participant-facing items (zh + en)
experiment-design/
  experiment-protocol.md  between-subjects protocol, logging, inclusion
  experiment.json         study config (expert roster anonymized)
  user-guide.md           operator notes (credentials redacted)
source/                   CHI study client (Vite + React)
  app/                    participant / expert / export UI
  public/                 PNG stimuli served to participants
  config/experiment.json
  package.json
api/                      image-generation proxy (no secrets)
data/
  stimuli/                JSON + SVG sources for the 20-image pool
  packets/                one folder per collected session (P001–P026)
    INDEX.csv             group and completeness flags
    PXXX/                 official CSV + validation JSON (no session.json)
analysis/
  analyze_packets.py
  n20-paper-analysis.md   paper-freeze analysis (P001–P020)
  n20-complete-report.md
  n20-person-table.csv    typed nicknames redacted
```

## Size and what was omitted

The live participant packets include `*-session.json` files with base64
image snapshots (~9–22 MB each). Packing all 26 raw ZIPs is about 337 MB
and exceeds the 300 MB CHI limit. This supplement keeps the **official
tables** exported by the client:

- `participants.csv`, `tasks.csv`, `event_log.csv` / `events.csv`
- `text_versions.csv`, `generations.csv`
- `sketch_interactions.csv`, `sketch_snapshots.json`, `auto_prompts.csv`
- `self_alignment.csv`, `expert_ratings.csv` (empty in this deployment)
- `full_session_timeline.json`, `validation.json`, `session_recovery.json`

Omitted on purpose:

- `*-session.json` (embedded images; tables are sufficient for the reported analyses)
- PNG snapshots inside packets
- `node_modules`, `.git`, `.env` / API keys
- Researcher usernames and passwords (replaced with `researcher-a` / `researcher-b`)
- Expert real names (replaced with Expert 01–04)
- Researcher easter-egg assets under `public/surprise/`

Collected packets in this ZIP: **{len(index)}** ({n_s} scaffold, {n_c} control,
including incomplete / failed-validation sessions). Formal-analysis inclusion
is defined in `experiment-design/experiment-protocol.md` and applied in
`analysis/n20-paper-analysis.md` for the n=20 freeze (formal n=14: scaffold 7 /
control 7). Packets **P021–P026** arrived after that freeze; see
`data/packets/INDEX.csv`.

## Anonymization

- Analysis identifiers are zip labels `P001`…`P026`.
- Typed nicknames entered in the client were rewritten to the zip label
  inside packet tables, and to `redacted-nickname` in the n=20 person table.
- Author, researcher, and expert names were stripped from source and docs.
- Live study URLs were replaced with `study.example.edu`.
- Image-generation API keys are not included. `api/` contains only request
  code; credentials would live in the host environment.

## How to reproduce the n=20 analysis

The freeze in `analysis/` was run on the original packets (including
session JSON) with:

```
python3 analysis/analyze_packets.py
```

Against this stripped tree, set the packet directory to the unpacked
folders or keep using the CSV/JSON sidecars:

```
CHITEST_PACKET_DIR=data/packets python3 analysis/analyze_packets.py
```

The script will still read flags, groups, and self-alignment. It will not
recover image bytes. `expert_ratings` / `P_norm` were not collected, so
precision Primary/Transfer cannot be computed from these materials.

Formal efficacy inclusion used in the n=20 freeze:

1. seven completed tasks
2. protocol `formal-between-v2`
3. `validation.json` present
4. `export_ready = true` (all study-level flags)
5. `sketch_sent = false` on every generation

## Study client

The CHI experiment lives entirely under `source/` (the `CHItest/` tree).
Production application features outside this folder are out of scope.

```
cd source
npm install
npm run dev
```

The Vite dev plugin loads `../api/jimeng.js`. Image generation requires
host-side API credentials that are **not** provided.

## Ethics

Materials are provided for confidential CHI paper review only. Do not
redistribute participant logs. Stimuli images are study materials, not a
public dataset release.
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
    with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as zf:
        for path in src.rglob("*"):
            if path.is_file():
                zf.write(path, arcname=str(Path("CHI2027-SceneSketch-Supplementary") / path.relative_to(src)))


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    # Study client (Vite root)
    copy_tree(CHITEST / "app", OUT_DIR / "source" / "app")
    copy_tree(CHITEST / "config", OUT_DIR / "source" / "config")
    copy_tree(CHITEST / "public" / "data", OUT_DIR / "source" / "public" / "data")
    copy_tree(CHITEST / "public" / "stimuli", OUT_DIR / "source" / "public" / "stimuli")
    for name in (
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "tsconfig.app.json",
        "tsconfig.node.json",
        "vite.config.ts",
        "index.html",
        ".oxlintrc.json",
        ".gitignore",
    ):
        src = CHITEST / name
        if src.exists():
            copy_text_file(src, OUT_DIR / "source" / name)
    if (CHITEST / "README.md").exists():
        copy_text_file(CHITEST / "README.md", OUT_DIR / "source" / "README.md")
    if (CHITEST / "app" / "vite-env.d.ts").exists():
        copy_text_file(CHITEST / "app" / "vite-env.d.ts", OUT_DIR / "source" / "app" / "vite-env.d.ts")
    rewrite_auth(OUT_DIR / "source" / "app" / "shared" / "auth.ts")

    # API sibling of source/, matching vite.config.ts `../api/jimeng.js`
    if (ROOT / "api").exists():
        copy_tree(ROOT / "api", OUT_DIR / "api")
    env_ex = ROOT / ".env.example"
    if env_ex.exists():
        copy_text_file(env_ex, OUT_DIR / ".env.example")

    # Stimuli: JSON/SVG next to the client (config.ts imports ../../data/tasks)
    # and a reviewer-facing copy under data/stimuli.
    copy_tree(CHITEST / "data" / "tasks", OUT_DIR / "source" / "data" / "tasks")
    copy_tree(CHITEST / "data" / "tasks", OUT_DIR / "data" / "stimuli")

    index = extract_packets(OUT_DIR)

    proto = CHITEST / "docs" / "experiment-protocol.md"
    if proto.exists():
        copy_text_file(proto, OUT_DIR / "experiment-design" / "experiment-protocol.md")
    cfg = CHITEST / "config" / "experiment.json"
    if cfg.exists():
        copy_text_file(cfg, OUT_DIR / "experiment-design" / "experiment.json")
    write_user_guide(OUT_DIR / "experiment-design" / "user-guide.md")

    for name in ("n20-paper-analysis.md", "n20-complete-report.md"):
        src = CHITEST / "docs" / name
        if src.exists():
            copy_text_file(src, OUT_DIR / "analysis" / name)
    person = CHITEST / "docs" / "n20-person-table.csv"
    if person.exists():
        dest = OUT_DIR / "analysis" / "n20-person-table.csv"
        dest.parent.mkdir(parents=True, exist_ok=True)
        redact_person_table_from_src(person, dest)
    script = CHITEST / "scripts" / "analyze_packets.py"
    if script.exists():
        copy_text_file(script, OUT_DIR / "analysis" / "analyze_packets.py")

    write_questionnaires(OUT_DIR / "questionnaires.md")
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
    REPO_ZIP.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ZIP_PATH, REPO_ZIP)
    (ZIP_PATH.parent / "CHI2027-SceneSketch-Supplementary.MANIFEST.txt").write_text(manifest, encoding="utf-8")
    (REPO_ZIP.parent / "MANIFEST.txt").write_text(manifest, encoding="utf-8")

    print(manifest)
    if size_mb >= 300:
        raise SystemExit("ZIP exceeds 300 MB")


if __name__ == "__main__":
    main()
