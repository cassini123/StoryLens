# CHItest experiment protocol

Controlled research prototype for CHI 2027. Independent of StoryLens product features.

## Research question

When an AI image is already a current generated state that does not fully match the user’s intent, can the user externalize the intended change through an editable sketch, have that sketch turned into everyday language, then refine that language?

Sketch is **not** a reference image to copy. It is an **editable visual representation of the intended modification**. The core mechanism is:

```text
Current generated state
→ visual externalization (Sketch)
→ auto language representation (P_auto)
→ human re-expression (P_user)
→ more precise intent
```

## Stages

Each participant completes **7 tasks** from a 20-image stimulus pool:

| Stage | Count | AI | Sketch | Auto prompt | Generation input |
| --- | --- | --- | --- | --- | --- |
| **T0** Initial visual representation | 1 | no | no | no | — (observe → describe → Submit) |
| **T1** AI output feedback | 2 | yes, ≤3 rounds | no | no | Original image + text |
| **T2** Sketch-based visual scaffolding | 2 | yes, ≤3 rounds | always visible | yes, after sketch edits | Round 1: image + text. Later: image + sketch + P_user |
| **T3** Transfer | 2 | yes, ≤3 rounds | always visible | yes | Same as T2 on unseen images |

Participants may stop a T1/T2/T3 task after any round via **Satisfied / Next**. They are not forced to use all 3 rounds.

T3 keeps Sketch and Auto Prompt. It tests whether visual externalization plus language re-expression transfers to a new picture — not whether people can work without a sketch.

## Stimulus pool

20 pictures in `data/tasks/stimuli.json`, grouped as:

- environment × 5
- character_space × 4
- camera × 5
- composition × 6

Assignment is **balanced stratified sampling + rotation** (patterns A/B/C). No image repeats inside a session.

Researcher-only fields live in `data/tasks/target_modifications.json`: `current_visual_state`, `target_modification`, plus each image’s `difficulty` / `primary_target` / `secondary_target`. Participants never see target modification or dimension names.

These pictures are **current / reference visual states**, not answer keys to reproduce.

## Participant instruction

T0: observe the current frame and describe visual information in the participant’s own words.

T1/T2/T3: the still is a current AI result; describe how to adjust it so it is closer to what they want.

Do not ask people to reproduce the still. Do not mention Object / Spatial / Relation / Camera / Emotion / Constraint on the participant UI.

Labels they may see: Current Image, Sketch, AI Interpretation, Your Description, Generate, Satisfied / Next.

## T2/T3 prompt split

After the first generation and after the participant edits the sketch:

- **P_auto** — system converts the sketch into everyday language. Shown read-only. Never overwritten by the user’s edits.
- **P_user** — the participant’s revision of that wording. Used for later generation.

Both versions are stored as append-only `text_versions` (`text_type`: `auto` vs `refined` / `final`). Export `auto_prompts.csv` pairs them by task and round.

## Outcomes

Primary outcome: **Intent Precision** against the task’s **target modification**, not similarity to the original still. Score only that image’s active dimensions (0–3 each).

```text
P0, P1, P2, P3
G_AI = P1 − P0
G_Sketch = P2 − P1
G_Transfer = P3 − P1
ΔP = P_final − P_initial
```

Also compare **P_auto vs P_user**. Timeline events, text versions, sketch actions, and generation logs are **process measures**. Do not treat click counts, text length, round count, or speed as cognitive improvement.

## Logging

Every session stores `event_log` with ISO-8601 `timestamp` and `relative_time_ms` from `session_start`. T2 alignment events include `sketch_edit_start/end`, `auto_prompt_generated`, `auto_prompt_view_start/end`, `user_prompt_edit_start`, `user_prompt_submit`, `generation_start/end`.

Export: `participants.csv`, `tasks.csv`, `event_log.csv`, `intents.csv`, `generations.csv`, `sketch_interactions.csv`, `sketch_snapshots.json`, `auto_prompts.csv`, `expert_ratings.csv`, `full_session_timeline.json`.

## Local data

Browser `localStorage` key `chitest.store.v5` plus IndexedDB generated images. Download from Export after each session.
