# Paper miniset — n=20 included

All **P001–P020** are in the analysis files (`valid=yes`). Original protocol flags are kept in `participants_valid.csv` (`protocol_export_ready`, `protocol_issue`) and are **not** used to drop people.

| File | Rows |
| --- | --- |
| `expert_ratings.csv` | 20 × 6 × 4 = **480** |
| `final_texts.csv` | **120** T1/T2/T3 final texts |
| `participants_group.csv` | 20 (Scaffold 13, Control 7) |
| `participants_valid.csv` | 20, all `valid=yes` |

## Why five packets had `export_ready=false`

Software rule (`experiment-protocol.md`): formal export requires complete session **and** all validation flags. These five still have final text; they are included for efficacy on wording.

| ID | Group | Original flag | What was actually wrong | Why marked valid for this paper extract |
| --- | --- | --- | --- | --- |
| P003 | Scaffold | `timing_complete=false` | Some start/end timing events not closed | All 7 tasks ended; final text present. Timing holes are logging, not missing answers. |
| P017 | Scaffold | same | same | same |
| P018 | Scaffold | same | same | same |
| P019 | Scaffold | `task_unfinished` T2_middle_A02 | That T2 has no `ended_at` | Final text exists for that task; session `completion_status=complete`. |
| P020 | Scaffold | `task_unfinished` T2_middle_A05 and T2_middle_E01 | Those T2s have no `ended_at` | Final text exists for both; session marked complete. |

Source `validation.json` inside the participant zips is **unchanged**. Only this analysis extract treats them as included.
