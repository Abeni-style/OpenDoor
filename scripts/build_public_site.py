#!/usr/bin/env python3
"""Build the small, safe-to-publish static OpenDoor frontend in ./public."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
FILES = [
    "index.html",
    "styles.css",
    "backend.css",
    "pitch-tour.css",
    "backend-config.js",
    "data.js",
    "app.js",
    "backend.js",
    "pitch-tour.js",
]
DIRS = ["assets", "locales"]
FORBIDDEN = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_WEBHOOK_SECRET",
    "OPEN_DOOR_SYNC_SECRET",
]


def main() -> None:
    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    PUBLIC.mkdir(parents=True)

    for name in FILES:
        src = ROOT / name
        if not src.is_file():
            raise SystemExit(f"Required frontend file missing: {name}")
        if name == "backend-config.js":
            text = src.read_text(encoding="utf-8")
            leaked = [key for key in FORBIDDEN if key in text]
            if leaked:
                raise SystemExit(
                    "Refusing to publish backend-config.js; server secret names found: "
                    + ", ".join(leaked)
                )
        shutil.copy2(src, PUBLIC / name)

    for name in DIRS:
        src = ROOT / name
        if src.is_dir():
            shutil.copytree(src, PUBLIC / name)

    (PUBLIC / ".nojekyll").write_text("", encoding="utf-8")
    (PUBLIC / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")
    (PUBLIC / "VERSION").write_text((ROOT / "VERSION").read_text(encoding="utf-8"), encoding="utf-8")

    # Static preview health check: all script/style/image references must exist.
    import re
    html = (PUBLIC / "index.html").read_text(encoding="utf-8")
    refs = re.findall(r'''(?:src|href)=["']([^"']+)["']''', html)
    missing = []
    for ref in refs:
        if ref.startswith(("http://", "https://", "#", "mailto:", "tel:")):
            continue
        if not (PUBLIC / ref).exists():
            missing.append(ref)
    if missing:
        raise SystemExit("Broken static asset references: " + ", ".join(missing))

    print(f"Built public site at: {PUBLIC}")
    print(f"Files and directories copied: {len(FILES) + len(DIRS)} inputs")
    print("No server-side backend secrets were found in the public config check.")


if __name__ == "__main__":
    main()
