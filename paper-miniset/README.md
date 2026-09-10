# Paper miniset — protocol-valid sample only

Denoised for Results: **n = 15** (Scaffold 8, Control 7). Invalid packets are not relabeled valid.

| File | Rows |
| --- | --- |
| `expert_ratings.csv` | 15 × 6 tasks × 4 experts = **360** |
| `final_texts.csv` | 15 × 6 = **90** (ended T1/T2/T3 only) |
| `participants_group.csv` | 15 |
| `participants_valid.csv` | 15, all `valid=yes` |
| `excluded_participants.csv` | 5 dropped IDs |

Join: `participant_id` + `task_id`. IDs are packet names P001–P020.

## Dropped (protocol)

| ID | Group | Rule |
| --- | --- | --- |
| P003, P017, P018 | Scaffold | `export_ready=false` (`timing_complete`) |
| P019 | Scaffold | T2_middle_A02 not ended |
| P020 | Scaffold | T2_middle_A05 and T2_middle_E01 not ended |

Kept: P001, P002, P004–P016. P004 kept (`export_ready=1`, all 7 tasks ended; older zip without `validation.json`).
