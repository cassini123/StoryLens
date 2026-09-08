# Sketch-Based Cognitive Scaffolding for Generative AI

CHI 2027 prototype in `/CHItest`. Independent of StoryLens product features.

```text
T0 × 1  natural description, no AI, no sketch
T1 × 2  original image + text → AI feedback, ≤3 rounds
T2 × 2  original image + edited sketch + text, sketch always visible
T3 × 2  new image + sketch + text (transfer, sketch kept)
```

Seven tasks per participant, sampled from a 20-image pool (`data/tasks/stimuli.json`) with stratified rotation across environment / character_space / camera / composition.

## Run

```bash
cd CHItest
npm install
npm run dev
```

Production:

- https://www.2027mitgo.top/chitest/
- https://storyboard-skill.vercel.app/chitest/

| Route | Use |
| --- | --- |
| `#/` | Home |
| `#/participant` | 7-task session |
| `#/participant?short=1` | Dry-run (one task per stage) |
| `#/expert` | Blind 1–7 ratings |
| `#/coding` | Researcher G1 0–18 |
| `#/export` | participants / tasks / event_log / intents / generations / snapshots |

## Logging

Unified `event_log` with ISO-8601 timestamps and `relative_time_ms` from session start. Text versions are append-only. Each generation stores the sketch snapshot actually sent to the API.

## Jimeng

`POST /api/jimeng/` with `JIMENG_ACCESS_KEY` and `JIMENG_SECRET_KEY` on Vercel Production. Never commit secrets.

## Stimuli

Placeholder SVGs live under `public/data/tasks/images/`. Replace with the original photographs using the same IDs (`E01`…, `C01`…, `A01`…, `D01`…) when available. Do not hard-code image metadata in React components.
