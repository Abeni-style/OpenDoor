# OpenDoor datasets and source pipeline

- `global_opportunities_seed.csv`: program/provider discovery leads; not verified current applications.
- `source_registry.csv`: providers and dataset discovery sources; all require review before automated ingestion.
- `dataset_registry.csv`: dataset provenance and permitted use notes.
- `student_program_data.csv`: 500-row sample dataset kept separate from the opportunity catalogue.
- `student_program_data_profile.json`: schema and basic descriptive profile of the sample file.
- `fetch_public_feeds.py`: optional RSS/Atom/JSON candidate collector. It does not scrape arbitrary web pages and marks every result pending review.
- `validate_and_merge_catalogue.py`: CSV normalization, basic validation and deduplication.
- `KAGGLE_IMPORT_GUIDE.md`: how to evaluate Kaggle datasets and credentials safely.

Run the scripts from the project root or provide explicit input/output paths. Do not embed API keys in files committed to GitHub.
