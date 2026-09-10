# Expert ratings

Keep one independent record set per expert. Do not replace them with means.

## Rubric (current)

Experts score whether the **final next-shot wording** is clear, specific, and executable. No unique correct answer. They see only the still + final text.

Five 1–7 scores + Reconstructable (1/0). T0 excluded.

## Layout

| Path | Who sees it |
| --- | --- |
| `blinded/` | Experts: still caption + final expression. No stage / group / Auto Prompt / Sketch / target spec. |
| `researcher/item_keyfile.json` | Researchers only: maps `item_id` → packet `task_id` / stage / block. **Never send to experts.** |
| `expert_01_xinxiangyang/` … `expert_04_liuzhejun/` | `ratings.csv`, optional `comments.csv` |

Primary set: T1+T2+T3 final expressions, **120 items** (`P001`–`P020`, including P012). Each expert: `ratings.csv` (five 1–7 scores + reconstructable) and optional `comments.csv`.

This set **replaces** the earlier 0–3 target-specification ratings.

`#/expert` matches this rubric.
