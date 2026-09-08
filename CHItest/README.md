# CHItest

Cinematography Cognitive Scaffolding user-study prototype for CHI 2027.

Independent of StoryLens. Do not generate final images, knowledge graphs, LoRA styles, or prompt rewrites here.

The study asks whether a **low-fidelity sketch scaffold** helps non-experts turn a vague shot intention into a more precise, executable description.

```text
Vague Intent → Low-fi Sketch → Human inspection / editing → Refined Intent
```

## Run

Local:

```bash
cd CHItest
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

Production (Vercel) is served from the StoryLens site at **`/chitest/`**, for example:

```text
https://<your-vercel-domain>/chitest/
https://<your-vercel-domain>/chitest/#/participant
https://<your-vercel-domain>/chitest/#/participant?short=1
```

The root deploy copies StoryLens static files as-is, then builds this Vite app into `/chitest/`. See `scripts/vercel-build.sh` and `vercel.json`.

| Route | Use |
| --- | --- |
| `#/` | Home |
| `#/participant` | Participant session (T1/T2/T3) |
| `#/expert` | Four-expert blind rating |
| `#/coding` | Researcher G1/G2/G3 coding |
| `#/export` | JSON / CSV download |

## What is implemented (P0 + P1)

- Direct vs Sketch conditions, 8 matched tasks, transfer task
- Four-group counterbalancing
- Controlled mock SVG sketch (camera / people / objects / gaze / movement)
- Sketch action logging
- Dual expert ratings (initial and final) plus optional naturalness
- LocalStorage persistence and export

Sketch generation defaults to `sketch_mode: "mock"` in `config/experiment.json`. Model generation is stubbed and falls back to the same mock so the experiment stays reproducible.

Timepoints: **T1 baseline** → **T2 Direct or Sketch** → **T3 transfer**. Researcher coding (`#/coding`) scores G1 six dimensions (0–18). Expert 1–7 ratings stay separate. Exports: `participant.csv`, `intent.csv`, `sketch_interactions.csv`, `expert_ratings.csv`.

## Data

Runtime data lives in the browser. Use Export to download:

- `chitest-trials.json` / `.csv`
- `chitest-expert-ratings.json` (keyed by `expert_01` … `expert_04`, never averaged)
- `chitest-export.json`

Use `#/participant?short=1` for a dry-run of one Direct task, one Sketch task, then Transfer.

## Docs

- [User guide, architecture, sketch API hook](docs/user-guide.md)
- [Experiment protocol](docs/experiment-protocol.md)

