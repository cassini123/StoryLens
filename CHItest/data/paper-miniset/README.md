# Paper miniset (small files only)

These four CSVs are the analysis extract. Download them from GitHub; do not use cloud-agent `/workspace` zip paths.

| File | Contents |
| --- | --- |
| `expert_ratings.csv` | 20 people × 6 T1/T2/T3 tasks × 4 experts = 480 rows |
| `final_texts.csv` | 20 × 6 = 120 final next-shot texts |
| `participants_group.csv` | P001–P020 group |
| `participants_valid.csv` | protocol validity for these 20 packets |

Join key: `participant_id` + `task_id`. `participant_id` is the **packet filename** (P001–P020), not the in-session login id.

## Protocol exclusion rule (from `CHItest/docs/experiment-protocol.md`)

Formal efficacy sample requires:

1. Session `completion_status = complete` (incomplete / mid-exit is not an efficacy sample).
2. `export_ready = true` (all study validation flags pass **and** the session is complete).
3. Old localStorage keys (`chitest.store.v7` and earlier, including P001-style pilots) are not migrated and are not formal efficacy data.
4. High Auto-Prompt copy ratio is **not** an auto-exclusion.

`export_ready` fails if, among other flags, timing events are not closed (`timing_complete`) or a task was skipped (`task_unfinished`).

## 32 → 20

**This repository does not contain a 32-person roster.** Only **P001–P020** packets are stored. There are no IDs, logs, or reasons here for twelve additional people. Do not invent them for the paper.

If N=32 was collected outside these files, that exclusion table has to come from the recruitment/session log that produced the 32, using the same four rules above.

## These 20 packets under the protocol

Applying the rules **to the 20 files that exist**:

| valid=yes | 15 | complete, `export_ready=true`, 7 tasks ended |
| valid=no | 5 | see `participants_valid.csv` |

The five that fail **export_ready / unfinished-task** rules:

| ID | Group | Reason in packet `validation.json` |
| --- | --- | --- |
| P003 | Scaffold | complete session but `timing_complete=false` (“required timing events are not closed”) |
| P017 | Scaffold | same: `timing_complete=false` |
| P018 | Scaffold | same: `timing_complete=false` |
| P019 | Scaffold | `task_unfinished`: T2_middle_A02 skipped / not ended |
| P020 | Scaffold | `task_unfinished`: T2_middle_A05 and T2_middle_E01 not ended |

P004 is `valid=yes` with `export_ready=1` but an older zip that has no `validation.json`.

Experts rated all 20 packets (including the five that fail `export_ready`). For a protocol-strict Results section, drop P003/P017/P018/P019/P020 or report them in a sensitivity note. That yields **n=15**, not n=20, unless you explicitly override `timing_complete` (P003/P017/P018 finished all seven tasks and have final text).

Groups among the 20 packets: Scaffold 13, Control 7. Among protocol `valid=yes` (15): check `participants_valid.csv`.
