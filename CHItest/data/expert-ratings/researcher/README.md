# Researcher-only keyfile

`item_keyfile.json` maps blinded `item_id` to packet `participant_id`, `task_id`, `stage`, and `block`.

Do not include this folder in expert packets. Experts must not see T1/T2/T3 or group.

Join after all four expert folders have CSVs:

```bash
python3 CHItest/scripts/join_expert_ratings.py
```

That writes `joined_dimension_scores.csv` and `joined_global_ratings.csv` here (with stage, for analysis only).

Analysis participant_id is the packet filename (`P001`–`P020`). Several zips reused in-session id `P001`; do not join on that field.

T0 rows are not in the blinded packet. Packets with `export_ready=0` are still in the 114-item set; exclude them in analysis if you require official export flags.

`P_i` / `P_norm` are computed by researchers, not by experts.
