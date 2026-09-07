# CHItest

Cinematography Cognitive Scaffolding user-study prototype for CHI 2027.

Independent of StoryLens. Do not generate final images, knowledge graphs, LoRA styles, or prompt rewrites here.

The study asks whether a **low-fidelity sketch scaffold** helps non-experts turn a vague shot intention into a more precise, executable description.

```text
Vague Intent → Low-fi Sketch → Human inspection / editing → Refined Intent
```

## Run

```bash
cd CHItest
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

| Route | Use |
| --- | --- |
| `#/` | Home |
| `#/participant` | Participant session |
| `#/expert` | Four-expert blind rating |
| `#/export` | JSON / CSV download |

## What is implemented (P0 + P1)

- Direct vs Sketch conditions, 8 matched tasks, transfer task
- Four-group counterbalancing
- Controlled mock SVG sketch (camera / people / objects / gaze / movement)
- Sketch action logging
- Dual expert ratings (initial and final) plus optional naturalness
- LocalStorage persistence and export

Sketch generation defaults to `sketch_mode: "mock"` in `config/experiment.json`. Model generation is stubbed and falls back to the same mock so the experiment stays reproducible.

## Data

Runtime data lives in the browser. Use Export to download:

- `chitest-trials.json` / `.csv`
- `chitest-expert-ratings.json` (keyed by `expert_01` … `expert_04`, never averaged)
- `chitest-export.json`

Use `#/participant?short=1` for a dry-run of one Direct task, one Sketch task, then Transfer.

## Docs

- [User guide, architecture, sketch API hook](docs/user-guide.md)
- [Experiment protocol](docs/experiment-protocol.md)

