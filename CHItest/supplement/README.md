# CHI 2027 supplementary materials

Upload **`CHI2027-SceneSketch-Supplementary.zip`** with the anonymous paper.
The ZIP is **5.56 MB** (limit 300 MB). SHA-256:

```
28d7bb42b9447834ef5b06f2c3bff6fd47a3f4819a3dda55001fb63a71198a6f
```

Study materials only: experiment design, stimuli, questionnaires, participant
tables, and ratings. No other product source code.

Rebuild:

```bash
python3 CHItest/scripts/pack_chi_supplement.py
```

---

# Supplementary materials

Anonymous supplementary package for the CHI 2027 paper
**SceneSketch: A Temporary Visual Scaffold for Precise Natural-Language Image Editing**.

This archive contains only the **study** materials: experiment design,
stimuli, questionnaires, participant logs, and rating tables.
It does not contain any other product source code, author names,
institution names, live URLs, or credentials.

## Contents

```
README.md
questionnaires.md              participant-facing items (zh + en)
experiment-design/
  experiment-protocol.md       between-subjects protocol and inclusion
  experiment.json              study config (expert roster anonymized)
data/
  stimuli/                     20-image study pool (PNG + JSON)
  participants/                one folder per session (P001–P026)
    INDEX.csv                  group and completeness flags
    PXXX/                      official CSV + validation JSON
ratings/
  self_alignment.csv           all per-task 1–7 ratings
  demographics.csv             experience items
  expert_ratings.csv           expert rubric (empty in this deployment)
```

## Participants

26 collected sessions (16 scaffold, 10 control), including
incomplete / failed-validation sessions. Formal inclusion is defined in
`experiment-design/experiment-protocol.md`.

Each `data/participants/PXXX/` folder keeps the official tables:

- `participants.csv`, `tasks.csv`, `event_log.csv` / `events.csv`
- `text_versions.csv`, `generations.csv`
- `sketch_interactions.csv`, `sketch_snapshots.json`, `auto_prompts.csv`
- `self_alignment.csv`, `expert_ratings.csv`
- `full_session_timeline.json`, `validation.json`, `session_recovery.json`

Raw `*-session.json` files with embedded images are omitted so the ZIP
stays under 300 MB.

## Ratings

Primary participant ratings are per-task `self_alignment` and
`result_alignment` (1–7). See `ratings/self_alignment.csv` and
`questionnaires.md`.

Expert `P_norm` / `expert_ratings.csv` were **not collected** in this
deployment (header only). End-of-session Likert items were shown in the
client but were not written into the official export tables.

## Anonymization

- IDs are zip labels `P001`…`P026`.
- Typed nicknames were rewritten to the zip label.
- Author, researcher, and expert names were removed.
- No live deployment URLs or API keys are included.

## Ethics

For confidential CHI paper review only. Do not redistribute participant
logs. Stimuli are study materials, not a public dataset release.
