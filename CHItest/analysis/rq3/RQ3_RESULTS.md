# RQ3: From sketch and Auto Prompt to participant re-expression

## Scope and method

This exploratory analysis uses only the strict-valid Scaffold sample: 10
participants with two T2 tasks each (20 participant-task units). For each unit,
the analysis reconstructs the sequence of logged Sketch actions, the Auto
Prompt linked to the final successful generation (or the documented legacy
fallback), and the authoritative final text from `tasks.csv`.

Two independent AI coding agents applied the predefined codebook without
seeing expert-rating outcomes, target specifications, generated images, or
each other's codes. Their primary-pattern agreement was 15/20 (75%),
Cohen's kappa = .438. Agreement was 100% for added detail, retained camera
language, and minimal Sketch trace; 95% for removed detail; and 95% for changed
relation/action (kappa = .643). Primary disagreements were resolved using the
strict rule that `corrective_rewriting` required an observable reversal or
correction of an Auto Prompt relation, entity, action, or camera interpretation.

These are preliminary AI-assisted codes, not human qualitative coding or human
coder reliability.

## Pattern distribution

| Re-expression pattern | Tasks | Percent | Participants represented |
| --- | ---: | ---: | ---: |
| Direct adoption | 0 | 0% | 0 |
| Selective revision | 2 | 10% | 2 |
| Substantive rewriting | 12 | 60% | 7 |
| Corrective rewriting | 6 | 30% | 4 |
| Unclassifiable | 0 | 0% | 0 |

The dominant behavior was not literal adoption. In 18/20 tasks (90%),
participants either substantially rewrote the Auto Prompt or corrected one of
its interpretations. Every final text added at least one substantive element
and removed at least one element from the selected Auto Prompt. Eighteen tasks
(90%) changed an action or visual relation. Camera language was functionally
retained in only 3/20 tasks (15%). Five tasks (25%) had three or fewer logged
Sketch actions, showing that a recorded Auto-to-final re-expression chain did
not always require extensive Sketch manipulation.

## Three observed mechanisms

### Selective grounding

In 2/20 tasks, participants retained a useful structural part of the Auto
Prompt while replacing placeholders or adding scene-specific action. For
P009/C04, the Auto Prompt supplied a low, left-offset, close, rear-side camera
configuration and an unspecified object. The final text retained the camera
configuration but grounded the scene as two girls looking at the sea and
replaced the placeholder with seagulls. This suggests that Auto Prompt output
could function as an editable compositional scaffold rather than final prose.

### Narrative expansion through substantive rewriting

In 12/20 tasks, participants replaced most of the generated relational
description with a concrete event or scene. For P010/D06, the Auto Prompt
described abstract character placement and camera relations. The final text
re-expressed these relations as a woman crossing a busy intersection while a
man followed behind her, preserving distance and depth through narrative
action rather than through the original template language. Substantive
rewriting therefore often translated schematic spatial relations into
story-specific events.

### Correction of machine interpretation

In 6/20 tasks, final text visibly corrected a relation or interpretation. For
P009/A05, the Auto Prompt placed one character directly in front of another
and specified one gaze direction. The participant moved the male character to
the woman's right rear and reversed the gaze relation. In P004/D05, the Auto
Prompt interpreted the scene as three people and a table, whereas the final
text specified two people and a mirror. These cases show participants treating
AI language as contestable rather than authoritative.

## Descriptive relationship with expression precision

The task-level Overall Expression Precision means were:

| Pattern | n | Mean | SD | Median |
| --- | ---: | ---: | ---: | ---: |
| Selective revision | 2 | 6.25 | 0.71 | 6.25 |
| Substantive rewriting | 12 | 4.96 | 1.72 | 5.00 |
| Corrective rewriting | 6 | 5.83 | 1.67 | 6.38 |

These values are descriptive only. Tasks are nested within 10 participants,
pattern groups are small and unequal, and the underlying precision scores are
currently AI-simulated ratings. They do not establish that one re-expression
strategy causes higher precision.

## Paper-ready result paragraph

Across the 20 strict-valid Scaffold T2 tasks, participants rarely treated the
Auto Prompt as final language. No task was classified as direct adoption.
Instead, 12 tasks (60%) involved substantive rewriting, six (30%) involved an
observable correction of an AI-supplied relation or interpretation, and two
(10%) selectively retained useful compositional language while revising
scene-specific content. Eighteen final texts (90%) changed an action or visual
relation, whereas camera language was retained in only three tasks (15%).
These traces suggest that the scaffold primarily supported transformation and
negotiation: participants used generated language as material to ground,
rewrite, or correct, rather than simply copying it. This mechanism-oriented
finding is exploratory and does not imply a group-level efficacy effect.

## Reporting limitation

Before publication as qualitative evidence, human coders should independently
recode the 20 units, resolve disagreements, and verify representative excerpts.
The present analysis provides a reproducible coding packet, codebook, and
provisional findings for that process.
