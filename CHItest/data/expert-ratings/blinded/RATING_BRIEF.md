# SceneSketch Expert Rating Brief (blind)

Evaluate whether the participant’s **final text** clearly, specifically, and executably conveys what they want the **next shot** to show.

There is **no unique correct answer**. Do not judge whether the idea is a “good shot.” Score only: **did they say it clearly?**

## Materials (only these)

1. Current visual state (picture / caption)
2. Participant final expression

Do **not** use: experimental group, T1/T2/T3, Sketch logs, Auto Prompt, earlier drafts, generated images, other experts’ scores, or any target-modification specification.

## Five 1–7 ratings

### 1. Visual Intent Interpretability
From the still and this text, how clearly do you understand what the next shot should present?
1 = almost none · 4 = basically · 7 = very clear, a definite next-shot image forms

### 2. Spatial / Relational Specificity
Does the text locate people, objects, position, distance, direction, front/back, composition?
1 = almost no locatable information · 4 = basically clear · 7 = highly specific
If the shot is mainly action, expression, or event, **do not auto-penalize missing spatial detail**.

### 3. Temporal / Action Specificity
Does the text say what happens next (action, state change, sequence)?
1 = almost no clear action/change · 4 = basically clear · 7 = action/change/order very clear

### 4. Executability / Reconstructability
Could an experienced director/storyboarder build a next shot roughly matching this description without more questions?
1 = almost not · 4 = basically, but needs explanation · 7 = highly consistent reconstruction

### 5. Overall Expression Precision
Overall, how precisely does the wording turn visual intent into clear, specific, executable language?
1 = very imprecise · 4 = moderate · 7 = very precise

## Reconstructable (Yes/No)

Without asking the participant anything more, can an experienced visual creator form a relatively definite next-shot plan?
- **Yes = 1**
- **No = 0**
Focus: would you still need to ask “what do you actually mean?”

## Rules
- Do not score creativity quality.
- Do not require professional terms.
- Do not penalize short sentences if they are clear.
- Do not score generated-image quality.
- Rate each item independently.
- Do not guess experimental condition.

## Output CSVs (UTF-8)

`ratings.csv`:

```text
item_id,participant_id,interpretability,spatial_specificity,temporal_action_specificity,executability,overall_precision,reconstructable
```

Scores 1–7 integers; reconstructable 1 or 0.

`comments.csv` (only when needed):

```text
item_id,participant_id,comment
```

One short sentence. Do not compute totals.
