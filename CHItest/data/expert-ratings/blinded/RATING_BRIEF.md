# SceneSketch Expert Rating Brief (blind)

Evaluate whether the participant’s **final written expression** conveys the **target visual relations**. Score what they expressed, not jargon, sentence length, or generated-image quality.

For every item you receive:

1. Current-state picture (or its caption) — reference only.
2. Target Modification Specification — criterion, not something to invent.
3. Participant Final Expression — the only text you score.

Do **not** use experimental condition, stage labels, sketch logs, auto-prompt text, or other experts’ scores.

## Part 1 — Intent Precision (primary, 0–3 per target dimension)

Score **each listed target dimension independently**.

| Score | Label | Meaning |
| --- | --- | --- |
| 0 | Absent | The relation is not expressed. |
| 1 | Vague | Related content is mentioned, but the relation is incomplete or ambiguous (e.g. “put A behind” with no referent). |
| 2 | Explicit | The relation is clearly stated, but key reconstructable detail is still missing. |
| 3 | Precise / Reconstructable | An experienced reader can rebuild the intended change with little ambiguity. |

Score the **functional visual relation**, not professional terms. “把镜头放低一点” can be 2 or 3 for *Lower camera height*. Short sentences are not penalized if the relation is clear.

Inactive dimensions are omitted. Do not invent extra dimensions.

## Part 2 — Global ratings (secondary, 1–7 each)

After all active dimensions for that item:

1. **Interpretability** — From this text alone, how clearly do you understand the intended picture change? 1 = not at all, 4 = basically, 7 = very clearly.
2. **Spatial / Relational Specificity** — How clearly are people, objects, space, distance, direction, camera specified? 1 = very vague, 4 = moderate, 7 = highly specific.
3. **Executability** — Could an experienced visual creator carry out this modification from the text? 1 = almost not, 4 = partially, 7 = clearly executable. Score the instruction, not image quality.

Optional one-line comment only if needed (e.g. ambiguous referent). No long essays. Do not compute totals.

## Output

Write three CSVs. Use `item_id` from the packet (do not invent IDs).

`primary_rating.csv`:

```text
item_id,participant_id,dimension,score
```

`global_rating.csv`:

```text
item_id,participant_id,interpretability,specificity,executability
```

`comments.csv` (omit rows with no comment):

```text
item_id,participant_id,comment
```

Rate every item. Independent rating only.
