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

Primary set: T1+T2+T3 final expressions, **150 items** (`P001`–`P025`,
including P012). Each rater record contains five 1–7 scores plus
Reconstructable and optional comments.

This set **replaces** the earlier 0–3 target-specification ratings.

`#/expert` matches this rubric.

## Provenance

The current four rating files were produced by four independently run,
blind AI rating agents configured with the named expert perspectives; they are
not verified ratings submitted by those human experts. Analyses derived from
these files must therefore be described as simulated/proxy ratings. Replace or
validate them with ratings collected from the named people before making a
human-expert-rating claim in a publication.
