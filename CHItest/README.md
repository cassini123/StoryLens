# Sketch-Based Cognitive Scaffolding for Generative AI

CHI 2027 prototype in `/CHItest`. Independent of StoryLens product features.

Core mechanism:

```text
Current generated state → Sketch (intended modification)
→ Auto natural-language prompt (P_auto) → Human revision (P_user) → Generate
```

```text
T0 × 1  observe current image, describe visual information; no AI, no sketch
T1 × 2  image + text → AI feedback, ≤3 rounds
T2 × 2  sketch always on; after round 1: image + sketch + P_user
T3 × 2  new image, same as T2 (transfer with sketch + auto prompt)
```

Seven tasks per participant, sampled from a 20-image pool (`data/tasks/stimuli.json`) with stratified rotation across environment / character_space / camera / composition. Researcher target-modification specs: `data/tasks/target_modifications.json`.

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
| `#/expert` | Blind 1–7 ratings vs intended modification |
| `#/coding` | Researcher precision on active dimensions |
| `#/export` | participants / tasks / event_log / auto_prompts / intents / generations / snapshots |

## Logging

Unified `event_log` with ISO-8601 timestamps and `relative_time_ms` from session start. Text versions are append-only (`initial` / `auto` / `refined` / `final`). Each generation stores the sketch snapshot actually sent to the API. Store key: `chitest.store.v5`.

## Jimeng

`POST /api/jimeng/` with `JIMENG_ACCESS_KEY` and `JIMENG_SECRET_KEY` on Vercel Production. Never commit secrets.

## Stimuli

Photographs live under `public/data/tasks/images/`. Do not hard-code image metadata in React components.
