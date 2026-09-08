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

Odd participant IDs → scaffold; even IDs → control. Assignment is recorded, never shown to participants.

## Logging

`chitest.store.v6`. Event timeline, append-only text versions, copy/paste from Auto Prompt, sketch snapshots (process only), generation I/O without sketch input. Primary cross-task metric: **P_norm**.
