# Expert ratings

Keep one independent record set per expert. Do not replace them with means.

## Layout

| Path | Who sees it |
| --- | --- |
| `blinded/` | Experts: still caption, target specification, final expression. No stage / group / Auto Prompt / Sketch. |
| `researcher/item_keyfile.json` | Researchers only: maps `item_id` → packet `task_id` / stage / block. **Never send to experts.** |
| `expert_01_xinxiangyang/` … `expert_04_liuzhejun/` | One expert’s CSVs: `primary_rating.csv`, `global_rating.csv`, `comments.csv` |

Primary efficacy: T1 + T2 + T3 **final** expressions (114 items, 233 dimension ratings each). T0 is stored in packets but is not in the blinded Intent Precision packet.

Four independent CSVs (2026-09-10, skill-based raters, no stage labels in their folders):

| Folder | Expert |
| --- | --- |
| `expert_01_xinxiangyang/` | 辛向阳 AI 视角 |
| `expert_02_louyongqi/` | 娄永琪 AI 视角 |
| `expert_03_lihejin/` | 李何槿 AI 视角 |
| `expert_04_liuzhejun/` | 柳喆俊 AI 视角 |

Do not average these into a single file as the only archive. Researcher joins with stage are in `researcher/joined_*.csv`.

Packet zip names (`P001`–`P020`) are the analysis participant IDs. In-session IDs inside some zips were reused (`P001`) and must not be used as the join key.

`#/expert` in the prototype matches this rubric: per-dimension 0–3, then three 1–7 globals; T0 skipped; stage hidden.
