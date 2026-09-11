# RQ3 re-expression codebook

## Scope and unit

The unit is one strict-valid Scaffold participant's T2 task. There are 20 units
(10 participants × 2 tasks). Coders inspect the ordered sketch-action summary,
the Auto Prompt selected for the final successful generation, and the
authoritative participant final text.

This is an exploratory analysis of re-expression behavior. It does not measure
whether the final text matches a predetermined correct answer.

## Primary pattern (one per unit)

1. **Direct adoption**
   - The final text preserves nearly all substantive Auto Prompt content and
     organization.
   - Differences are limited to punctuation, grammar, or very small wording
     changes.
2. **Selective revision**
   - The Auto Prompt remains recognizably dominant, but the participant adds,
     removes, or changes one or more meaningful visual/action details.
3. **Substantive rewriting**
   - The participant expresses a related next-shot intent using substantially
     different content or organization; much of the Auto Prompt is replaced.
4. **Corrective rewriting**
   - The final text explicitly or functionally reverses/corrects a relation,
     entity, action, or camera interpretation supplied by the Auto Prompt.
   - Use only when the correction is evidenced by the Auto–final comparison,
     not merely because the texts differ.
5. **Unclassifiable**
   - The chain is too incomplete or ambiguous to assign one of the above.

## Secondary binary codes

- `adds_detail`: final introduces substantive visual/action information absent
  from the selected Auto Prompt.
- `removes_detail`: final drops substantive Auto Prompt information.
- `changes_relation_or_action`: final changes a spatial relation, camera
  relation, action, or event.
- `camera_language_retained`: camera/framing language in the Auto Prompt is
  retained functionally in the final.
- `minimal_sketch_trace`: three or fewer logged sketch actions.

## Coding rules

- Code functional meaning, not exact word overlap.
- Treat the final text in `tasks.csv` as authoritative.
- Do not infer participant intent from generated images.
- Do not use group labels, target specifications, expert scores, or outcomes
  while assigning codes.
- For multiple Auto Prompts, use `selected_auto_prompt`; inspect the full
  sequence only to resolve obvious final-generation linkage ambiguity.
- Record a short evidence note quoting the smallest necessary Auto/final
  fragments.

## Provenance limitation

Any coding produced by AI agents is preliminary AI-assisted coding. It must not
be described as human qualitative coding or human coder agreement.
