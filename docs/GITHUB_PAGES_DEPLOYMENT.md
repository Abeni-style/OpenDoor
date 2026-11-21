# Publish OpenDoor with GitHub Pages

This project contains a GitHub Actions deployment workflow. It builds a separate `public/` directory containing only the browser files needed by the website. It does not publish the Supabase source, private ingestion tools, raw source registry or server-side environment examples as part of the Pages artifact.

## Repository

The connected project repository is `Abeni-style/OpenDoor`. Confirm that this is still the repository you want to publish. It is public, so everything committed to it is visible to anyone.

## One-time setup (Windows)

1. Download and extract the OpenDoor website ZIP.
2. Install Git for Windows and GitHub Desktop if they are not already installed.
3. Clone `https://github.com/Abeni-style/OpenDoor.git` to your computer. The repository was empty at the last check, so it may clone without a local branch.
4. Copy the **contents** of the extracted `opendoor` project folder into the cloned repository folder. Include hidden files and folders such as `.github`.
5. Open PowerShell in the cloned repository folder. If the repository is empty, create the initial branch:

   ```powershell
   git switch -c main
   ```

   If Git says the branch already exists, use `git switch main` instead.
6. Build the public folder:

   ```powershell
   python scripts/build_public_site.py
   ```

7. Review `backend-config.js`. It should contain only the public Supabase project URL and public anon/publishable key, or empty strings while the backend is not connected. Never put service-role, OpenAI, Stripe, Telegram or sync secrets in it.
8. Commit and push:

   ```powershell
   git add .
   git commit -m "Publish OpenDoor Global 5.4.0"
   git push -u origin main
   ```

If `git switch -c main` says that branch already exists, do not force-reset it; use `git switch main` and continue.

## Enable Pages

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under Build and deployment, choose **GitHub Actions** as the source.
4. Open **Actions** and confirm `Deploy OpenDoor website to GitHub Pages` runs successfully.
5. Return to **Settings → Pages** and open the published URL shown there. The expected project-site URL pattern is `https://abeni-style.github.io/OpenDoor/`, but use the exact URL GitHub displays.
6. Test that URL on a laptop and a phone.

The workflow deploys the static frontend only. It does not activate cloud auth, AI, community reviews, payments or feed ingestion.

## Updating the website

Edit the source files in the repository root, rerun `python scripts/build_public_site.py` locally to check the public build, then commit and push. The workflow rebuilds and deploys the `public/` folder on each relevant push to `main`.

## Rollback

In GitHub, open **Actions**, select the last successful deployment and inspect its commit. To roll back, revert the problematic commit and push the revert. Do not edit deployment artifacts directly.
