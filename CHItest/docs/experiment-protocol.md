# CHItest experiment protocol

Controlled research prototype for CHI 2027. Independent of StoryLens product features.

## Research question

The study is not testing whether Sketch makes better images. It tests whether a temporary visual scaffold helps users express visual modifications more precisely in natural language.

```text
Current visual state
→ user's text
→ AI feedback
→ (T2 only: Sketch manipulation)
→ Sketch-to-language (P_auto)
→ human re-expression (P_user)
→ final text
→ AI(currentImage, finalUserPrompt)
```

**Sketch never enters the image-generation API.** Final generation is always current image + the participant’s own prompt.

## Between-subject groups

Assignment is random 1/2 at session start. Export `group` is `0` = control (four T1s) or `1` = scaffold (T1 T1 T2 T2). Session metadata still stores `experimental_group`, `assignment_pattern`, `condition_order`, and `task_sequence_version` (`formal-between-v1`). Do not infer group from `task_id`. Participants never see the group.

| Export `group` | Internal name | 7 tasks | Middle block |
| --- | --- | --- | --- |
| **1** | scaffold | T0×1 + T1×2 + T2×2 + T3×2 | Sketch-mediated scaffold |
| **0** | control | T0×1 + T1×4 + T3×2 | Extra text-only practice (T1′) |

Both groups have the same number of tasks. The scaffold group differs only in the middle two tasks.

Task `block` is recorded for analysis: `baseline` (T0), `early` (first two T1), `middle` (T2 or T1′), `transfer` (T3).

## Stages

| Stage | AI | Sketch | Auto prompt | Generation input |
| --- | --- | --- | --- | --- |
| **T0** | no | no | no | — |
| **T1** | ≤3 rounds | no | no | currentImage + userPrompt |
| **T2** (scaffold only) | ≤3 rounds | always visible | only on Interpret Sketch | current generated image + userPrompt |
| **T3** | ≤3 rounds | **no** | **no** | currentImage + userPrompt |

T3 tests near-term transfer after scaffold removal, not long-term learning.

Participants may stop T1/T2/T3 early via **Satisfied / Next**. T2 Satisfied is blocked until Sketch → Interpret Sketch → user revision → generation on the current image.

Closing or refreshing the browser resumes the **same** `session_id`. Events are append-only. Incomplete sessions keep `completion_status = incomplete` and are not formal efficacy samples. P001-style mid-exit sessions are for recovery/logging checks only.

## Stimulus pool

20 pictures in `data/tasks/stimuli.json` (environment×5, character_space×4, camera×5, composition×6). Stratified rotation A/B/C. No image repeats inside a session.

Researcher target modification lives in `data/tasks/target_modifications.json` and is stored on each task for coding only. It is **never shown** to participants. T0 has `target_modification_specification = null` and is description only.

## Scoring

Intent Precision is **criterion-referenced** against the task’s Target Modification Specification. Four experts rate independently. They see the still, the specification, and the participant’s **final expression** only. They do not see T1/T2/T3, group, Sketch logs, or Auto Prompt. T0 is excluded from this primary analysis.

Each **active target dimension** is 0–3 (absent / vague / explicit / precise-reconstructable). Professional vocabulary is never required for a 3. Plain language can receive 3 if the visual relation is executable.

After dimensions, experts give three 1–7 secondary scores: Intent Interpretability, Spatial/Relational Specificity, Executability. Experts do not compute totals.

```text
P_i = sum of active dimension scores
P_norm = P_i / (3 × number_of_active_criteria)
```

Use **P_norm** as the main cross-task metric when active-target counts differ. Aggregate across experts after collection; do not store means only.

## Practice-control analysis

Do **not** claim T2 improvement from T2 > T1 alone.

```text
Primary scaffold test
= (Scaffold middle − Scaffold early) − (Control middle − Control early)

Transfer
= Scaffold T3 − Control T3
```

T3 is same-session near-term transfer only.

Time is interaction cost. Report it alongside precision; a sensitivity model may include log(task_time). Do not treat time, click counts, or copy ratio as cognitive improvement. Do not auto-exclude high-copy participants.

## Logging

`event_log` with ISO-8601 `timestamp` and `relative_time_ms`. T2 must reconstruct Sketch action → Interpret Sketch → Auto Prompt → Auto Prompt view → user prompt edit (including copy/paste) → Generation. Auto Prompt is never generated from raw mouse moves.

Text versions are append-only (`initial` / `auto_interpretation` / `user_revised` / `refined` / `final`). Generation records store the API input actually sent (`sketch_sent=false`, `input_sketch_snapshot_id` empty) plus `previous_generation_id` and `generation_input_chain_valid`. Round 2+ must use the previous output image.

T2 snapshots always include `initial`, `pre_auto_prompt`, and `post_user_revision`. User-prompt edits store previous/current text, source Auto Prompt id, edit distance, similarity, copy ratio, and copied segments. Copying Auto Prompt is allowed; paraphrase is not required.

Export: one zip of official tables plus `validation.json` and `session_recovery.json`. `export_ready=true` only if study-level flags all pass and the session is complete. Participant complete page packs that person’s zip. `group` is `0` (T1×4) or `1` (T1 T1 T2 T2).

Local store key: `chitest.store.v8`. Older keys (including P001 / v6 / v7 pilots) are not migrated and are not formal efficacy data.

Official tables: participants, tasks, event_log, text_versions, generations, sketch_interactions, sketch_snapshots, auto_prompts, expert_ratings, self_alignment, full_session_timeline, validation, session_recovery.
