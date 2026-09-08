# CHItest experiment protocol

Controlled research prototype for CHI 2027. Independent of StoryLens product features.

## Research question

Does a low-fidelity sketch scaffold help people express visual intent more precisely after generative-image feedback, and does that support transfer to a new picture?

## Stages

Each participant completes **7 tasks** from a 20-image stimulus pool:

| Stage | Count | AI | Sketch | Generation input |
| --- | --- | --- | --- | --- |
| **T0** Natural visual description baseline | 1 | no | no | — |
| **T1** AI visual feedback | 2 | yes, ≤3 rounds | no | Original image + text |
| **T2** Sketch-based scaffolding | 2 | yes, ≤3 rounds | yes, always visible | Original image + edited sketch + text |
| **T3** Transfer with sketch | 2 | yes, ≤3 rounds | yes, always visible | New original image + edited sketch + text |

Participants may stop a T1/T2/T3 task after any round via **Satisfied / Next**. They are not forced to use all 3 rounds.

## Stimulus pool

20 pictures in `data/tasks/stimuli.json`, grouped as:

- environment × 5
- character_space × 4
- camera × 5
- composition × 6

Assignment is **balanced stratified sampling + rotation** (patterns A/B/C). No image repeats inside a session. Metadata (`difficulty`, `primary_target`, `secondary_target`) is never shown to participants.

## Participant instruction

Use only the natural-language prompt in `config/experiment.json` (`prompts.observe`). Do not mention Object / Spatial / Relation / Camera / Emotion / Constraint, and do not prompt for shot size, camera terms, or composition jargon.

## Outcomes

Primary outcome: **Intent Precision** (researcher 0–3 × 6 dimensions = 0–18; experts also give 1–7 rubric scores).

```text
P0, P1, P2, P3
G_AI = P1 − P0
G_Sketch = P2 − P1
G_Transfer = P3 − P1
ΔP = P_final − P_initial
```

Timeline events, text versions, sketch actions, and generation logs are **process measures**. Do not treat click counts, text length, round count, or speed as cognitive improvement.

## Expert rating

Four experts (`expert_01` … `expert_04`) rate descriptions blind: no participant ID, condition, logs, task order, background, or round count. They do not see the sketch editor. Raw ratings are stored; do not replace them with averages.

## Logging

Every session stores `event_log` with ISO-8601 `timestamp` and `relative_time_ms` from `session_start`. Export `event_log.csv` and `full_session_timeline.json` to rebuild the session.

## Local data

Browser `localStorage` key `chitest.store.v4` plus IndexedDB generated images. Download from Export after each session.
