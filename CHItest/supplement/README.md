# Anonymous CHI supplementary ZIP

Do **not** put the anonymous ZIP in this repository. A public repo that also
hosts other identifiable projects would deanonymize a CHI submission.

Build locally (output is written to the agent artifacts directory, not git):

```bash
python3 CHItest/scripts/pack_chi_supplement.py
```

Upload **`CHI2027-Anonymous-Supplementary.zip`** to the conference system only.

A second archive, **`CHI2027-Expert-Agent-Ratings-Anonymous.zip`**, is only
the four expert-agent score tables (480 rows). Rebuild it with:

```bash
python3 CHItest/scripts/export_expert_agent_ratings.py
```

The main archive contains:

- `experiment-design/` protocol + questionnaires
- `image-library/` full PNG + SVG still pool
- `participants/` P001–P026 official tables
- `ratings/` self-alignment and demographics

Author names, product names, expert real names, and repository URLs are
stripped inside both ZIPs.
