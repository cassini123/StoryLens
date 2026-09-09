# Sketch-Based Cognitive Scaffolding for Generative AI

CHI 2027 prototype in `/CHItest`. Independent of StoryLens product features.

Between-subjects: **scaffold** (T0 / T1 / T2 / T3) vs **control** (T0 / T1×4 / T3). Seven tasks each. Sketch is a temporary language scaffold and **does not enter the image-generation API**.

```text
AI(currentImage, finalUserPrompt)
```

T3 removes Sketch and Auto Prompt (near-term transfer).

## Run

```bash
cd CHItest
npm install
npm run dev
```

Production:

- https://www.2027mitgo.top/chitest/
- https://storyboard-skill.vercel.app/chitest/

Group is assigned at session start with probability 1/2. Export `group` is `0` (four T1s) or `1` (T1 T1 T2 T2). Participants never see the group.

## Logging

`chitest.store.v8`. Session metadata records `experimental_group`, `assignment_pattern`, `condition_order`, `task_sequence_version`, and session recovery cursor fields. Event timeline, append-only text versions, Auto Prompt records created only on Interpret Sketch, copy/paste, sketch snapshots (process only), generation I/O with a current-image chain and `sketch_sent=false`. Secondary self-alignment ratings. `export_ready` requires study-level flags in `validation.json`. Primary cross-task metric: **P_norm**. Incomplete/resumed sessions are not formal efficacy samples.
