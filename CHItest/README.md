# Sketch-Based Cognitive Scaffolding for Generative AI

CHI 2027 prototype in `/CHItest`. Independent of StoryLens product features (no LoRA, knowledge-graph product UI, or final-image contest pipeline).

```text
Show image → Initial intent → Jimeng image
                (+ editable sketch + on-demand semantic panel in T2-Sketch)
         → Refined intent
```

## Run

```bash
cd CHItest
npm install
npm run dev
```

Open `http://localhost:5173`. Production:

- https://2027mitgo.top/chitest/
- https://storyboard-skill.vercel.app/chitest/

| Route | Use |
| --- | --- |
| `#/` | Home |
| `#/participant` | 6-image session: T1×2, T2 Direct, T2 Sketch, T3×2 |
| `#/participant?short=1` | Dry-run |
| `#/expert` | Blind rating of initial vs refined intent |
| `#/coding` | Researcher G1 0–18 |
| `#/export` | Full JSON/CSV plus per-participant download packet |

## Session

Each participant sees **6 unique images** from a 20-image pool (`IMG01–IMG20`), difficulty-matched across T1/T2/T3 and counterbalanced Direct/Sketch order.

T1 / T2 Direct / T3: image → describe → Jimeng generation → revise.  
T2 Sketch: same, plus low-fi sketch editing and a collapsible relation panel (no Object/Spatial/Camera labels).

Generated images are **feedback**, not the primary score. Primary comparison is refined intent: Sketch > Direct, and T3 vs T1 transfer.

## Data

Browser `localStorage` + IndexedDB (generated images). Participants download `Pxxx-session.json` at the end for the experimenter. Researcher export also includes `participant.csv`, `intent.csv`, `sketch_interactions.csv`, `expert_ratings.csv`.

## Jimeng

Server route `POST /api/jimeng/` (Vercel + local Vite middleware). Keys:

```text
JIMENG_ACCESS_KEY
JIMENG_SECRET_KEY
```

in repo-root `.env` or the Vercel project **Production + Preview** env, then **Redeploy**. Custom domains such as `2027mitgo.top` only see Production variables. Never commit secrets. GET `/api/jimeng/` reports whether credentials are present (not the secret values).

## Stimuli

`CHItest/public/stimuli/` and metadata in `CHItest/data/images/images.json`. Drop in the 20 photographs from `画面与描述.docx` using the same `IMG##` ids if you have the original files.
