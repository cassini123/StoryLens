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

`chitest.store.v7`. Session metadata records `experimental_group`, `assignment_pattern`, `condition_order`, `task_sequence_version`. Event timeline, append-only text versions, Auto Prompt records with view start/end, copy/paste, sketch snapshots (process only), generation I/O with `sketch_sent=false`. Secondary self-alignment ratings. Export is blocked if validation fails. Primary cross-task metric: **P_norm**.
