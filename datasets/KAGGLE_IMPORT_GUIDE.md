# Importing datasets from Kaggle safely

The Kaggle homepage is a dataset discovery portal, not one dataset. Do not download or ingest everything from it.

For each candidate dataset:
1. Save the exact dataset page URL and owner.
2. Read its license and usage restrictions. Do not assume that a Kaggle account means the data is free for commercial use.
3. Record provenance, collection date, update frequency, fields and known limitations.
4. Remove direct identifiers and sensitive personal data. Do not import student-level records into public browser code.
5. Decide whether it is an opportunity dataset, a learning-resource dataset, or research/demo data. Keep those purposes separate.
6. Map only opportunity records into `global_opportunities_seed.csv` / the canonical opportunity schema. Every opportunity must link to an official provider source; a Kaggle record is not itself the official program authority.
7. Run `validate_and_merge_catalogue.py`, then manually review every candidate before marking it verified.

Never put Kaggle API tokens, passwords or `.kaggle/kaggle.json` in the website, GitHub repository or shared notebook. Use Colab Secrets for private credentials if you later automate a specific, licensed Kaggle dataset download.

A token-like credential was included in the conversation and is not included in this project. If it is a live API key, revoke it and generate a replacement. Use Colab Secrets or another private secret manager; never put a credential in a public notebook, website, CSV or Git repository.
