# Anonymous CHI supplementary ZIP

Do **not** put the anonymous ZIP in this repository. A public repo that also
hosts other identifiable projects would deanonymize a CHI submission.

Build locally (output is written to the agent artifacts directory, not git):

```bash
python3 CHItest/scripts/pack_chi_supplement.py
```

Upload **`CHI2027-Anonymous-Supplementary.zip`** to the conference system only.

The archive contains:

- `experiment-design/` protocol + questionnaires
- `image-library/` full PNG + SVG still pool
- `participants/` P001–P026 official tables
- `ratings/` self-alignment and demographics

Author names, product names, and repository URLs are stripped inside the ZIP.
