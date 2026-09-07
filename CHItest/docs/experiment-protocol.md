# CHItest experiment protocol

Controlled research prototype for CHI 2027. Independent of StoryLens product features.

## Research question

Can a low-fidelity visual intermediate representation (sketch scaffold) help novice users express cinematographic intentions more precisely?

## Conditions

- **Direct:** task → initial intent → self-refinement → final intent
- **Sketch:** task → initial intent → mock SVG sketch → manipulation → refined intent
- **Transfer:** new task with no sketch and no assistance

## Counterbalancing

Four groups in `config/experiment.json`:

| Group | Direct tasks | Sketch tasks | Order |
| --- | --- | --- | --- |
| A_direct_first | T01 T03 T05 T07 | T02 T04 T06 T08 | Direct block first |
| A_sketch_first | T01 T03 T05 T07 | T02 T04 T06 T08 | Sketch block first |
| B_direct_first | T02 T04 T06 T08 | T01 T03 T05 T07 | Direct block first |
| B_sketch_first | T02 T04 T06 T08 | T01 T03 T05 T07 | Sketch block first |

Assign groups in rotation unless the experimenter overrides.

## What the system must not do

- Teach shot vocabulary (OTS, high angle, rear three-quarter, etc.)
- Auto-rewrite the participant's language into a professional prompt
- Generate photoreal or cinematic images
- Expose condition, logs, or participant identity to expert raters

## Expert rating

Four StoryLens experts rate **initial** and **final** intent separately (1–7):

1. Intent Precision
2. Intent Interpretability
3. Spatial / Relational Specificity
4. Executability

Naturalness is an auxiliary item on the final description.

Materials shown: task, initial intent, final intent, final sketch (or "Sketch not collected for this trial").

## Logging

Each trial stores initial intent, sketch scene + SVG, sketch actions, final intent, and ISO-8601 timestamps. Expert ratings are stored independently per `expert_id`.

## Local data

All data stays in the browser (`localStorage`) until downloaded from Export.
