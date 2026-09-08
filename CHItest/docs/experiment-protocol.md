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

Assignment is deterministic from participant ID (odd = scaffold, even = control). Session metadata stores `experimental_group`, `assignment_pattern`, `condition_order`, and `task_sequence_version` (`formal-between-v1`). Do not infer group from `task_id`. Participants never see the group name.

| Group | 7 tasks | Middle block |
| --- | --- | --- |
| **scaffold** | T0×1 + T1×2 + T2×2 + T3×2 | Sketch-mediated scaffold |
| **control** | T0×1 + T1×4 + T3×2 | Extra text-only practice (T1′) |

Both groups have the same number of tasks. The scaffold group differs only in the middle two tasks.

Task `block` is recorded for analysis: `baseline` (T0), `early` (first two T1), `middle` (T2 or T1′), `transfer` (T3).

## Stages

| Stage | AI | Sketch | Auto prompt | Generation input |
| --- | --- | --- | --- | --- |
| **T0** | no | no | no | — |
| **T1** | ≤3 rounds | no | no | currentImage + userPrompt |
| **T2** (scaffold only) | ≤3 rounds | always visible | yes, from Sketch only | currentImage + userPrompt |
| **T3** | ≤3 rounds | **no** | **no** | currentImage + userPrompt |

T3 tests near-term transfer after scaffold removal, not long-term learning.

Participants may stop T1/T2/T3 early via **Satisfied / Next**.

## Stimulus pool

20 pictures in `data/tasks/stimuli.json` (environment×5, character_space×4, camera×5, composition×6). Stratified rotation A/B/C. No image repeats inside a session.

Researcher-only target modification: `data/tasks/target_modifications.json` (`current_visual_state`, `target_modification` / `target_modification_specification`). Never shown to participants.

## Scoring

Each active criterion is 0–3. Professional vocabulary is never enough for a 3. Plain language can receive 3 if it is executable.

```text
P_i = sum of active criteria
P_norm = P_i / (3 × number_of_active_criteria)
```

Use **P_norm** as the main cross-task metric when active-target counts differ.

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

`event_log` with ISO-8601 `timestamp` and `relative_time_ms`. T2 must reconstruct Sketch action → Auto Prompt → Auto Prompt view → user prompt edit (including copy/paste) → Generation.

Text versions are append-only (`initial` / `auto` / `refined` / `final`). Generation records store the API input actually sent (`input_sketch_snapshot_id` is empty). Sketch snapshots are stored separately for process analysis.

T2 snapshots always include `initial`, `pre_auto_prompt`, and `post_user_revision`. User-prompt edits store previous/current text, source Auto Prompt id, edit distance, similarity, copy ratio, and copied segments.

Export: participants, tasks, events, text_versions, generations, sketch_interactions, sketch_snapshots, auto_prompts (with edit distance / similarity / copy ratio), expert_ratings, self_alignment, full_session_timeline.json. Use **Download official tables (zip)** for a single complete dump. Full JSON also includes `practice_control`.

Local store key: `chitest.store.v7`. Pilot sessions on v6 (including P001) are instrumentation only and are not migrated.

Export is blocked when validation fails (`export_ready=false`). Official tables: participants, tasks, events, text_versions, generations, sketch_interactions, sketch_snapshots, auto_prompts, expert_ratings, self_alignment, full_session_timeline.
