# Researcher-only keyfile

`item_keyfile.json` maps blinded `item_id` to packet `participant_id`, `task_id`, `stage`, and `block`.

Do not include this folder in expert packets. Experts must not see T1/T2/T3, group, or target specifications.

Join after all four expert folders have `ratings.csv`:

```bash
python3 CHItest/scripts/join_expert_ratings.py
```

Analysis participant_id is the packet filename (`P001`–`P025`). Several zips reused in-session id `P001`; do not join on that field.

T0 rows are not in the blinded packet.

Batch 2 (`blinded/items-batch2.json`, I121–I150, P021–P025) was shuffled with seed 2046 and appended to this keyfile in packet order. `join_expert_ratings.py` needs no changes: it joins whatever expert `ratings.csv` rows exist against this keyfile.
