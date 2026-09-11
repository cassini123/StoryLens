# CHI 2027 supplementary materials

Upload **`CHI2027-SceneSketch-Supplementary.zip`** with the anonymous paper.
The ZIP is **13.63 MB** (limit 300 MB). SHA-256:

```
40a9239a4a91cfa1c907a32fdf9fcabfae78c16fe714dfc2fb8ce56f53113196
```

The archive root contains `README.md` as required by CHI. Rebuild after data changes:

```bash
python3 CHItest/scripts/pack_chi_supplement.py
```

---

# Supplementary materials

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

Collected packets in this ZIP: **26** (16 scaffold, 10 control,
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
