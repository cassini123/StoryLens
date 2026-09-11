# Expert-agent ratings (anonymous)

Blind scores from four expert-persona agents (`expert_01` … `expert_04`).

This archive contains **only** the expert-agent scores and the items they
rated. Participant packets, still images, author names, expert real names,
typed nicknames, and repository URLs are not included.

## Coverage

- 120 items (P001–P020; six non-T0 tasks each)
- 4 experts × 120 items = **480 rating rows**
- 42 optional comments
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
