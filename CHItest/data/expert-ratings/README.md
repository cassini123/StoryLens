# Expert ratings

Keep one independent record set per expert. Do not replace them with means.

## Layout

| Path | Who sees it |
| --- | --- |
| `blinded/` | Experts: still caption, target specification, final expression. No stage / group / Auto Prompt / Sketch. |
| `researcher/item_keyfile.json` | Researchers only: maps `item_id` → packet `task_id` / stage / block. **Never send to experts.** |
| `expert_01_xinxiangyang/` … `expert_04_liuzhejun/` | One expert’s CSVs: `primary_rating.csv`, `global_rating.csv`, `comments.csv` |

Primary efficacy: T1 + T2 + T3 **final** expressions. T0 is stored in packets but is not in the blinded Intent Precision packet.

Packet zip names (`P001`–`P020`) are the analysis participant IDs. In-session IDs inside some zips were reused (`P001`) and must not be used as the join key.

`#/expert` in the prototype matches this rubric: per-dimension 0–3, then three 1–7 globals; T0 skipped; stage hidden.
