# Developer Documentation Index

This page collects the most useful developer-facing docs in the repository and one-place commands to get started. Link to these files from your PRs and onboarding notes.

Primary docs
------------
- `INDEX.md` — docs index and high-level quick start (this file).
- `CHANGELOG.md` — dated change log (doc moves, pipeline updates, infra tweaks).
- `DEPLOYMENT.md` — GoDaddy deployment guide (zip upload + manual fallback).
- `TRBG-Image-Pipeline-Spec.md` — authoritative image upload/variant spec for this project.
- `Generic-Scripts-Reference.md` — how to run the dev/deploy scripts safely.
- `contributing/CONTRIBUTING.md` — contribution workflow, commit message style, PR checklist.
- `notes/DEVELOPERS.md` — onboarding, architecture notes, and frontend/admin guidance.
- `notes/DEVELOPER_NOTES.md` — special-case notes and housekeeping guidance.
- `frontend/DEVELOPER-GUIDE.md` — frontend quick-start, tests and Tailwind notes.
- `backend/README.md` — PHP API quick start, env vars, and route outline.
- `guides/LINTING.md`, `guides/STYLING.md`, `guides/TESTING.md` — linting, styling, and testing guides.
- `ops/MAINTENANCE.md` — release/tagging guidance and dependency update notes.

Frontend-specific docs
----------------------
- `frontend/README.md` — CRA quick start and stylelint notes (mirrored in docs/frontend/README.md).
- `frontend/.stylelintrc.json` — local stylelint config (ignores Tailwind at-rules and includes targeted overrides).
- `frontend/scripts/README.md` and `docs/frontend/scripts/README.md` — asset generators + checks.
- `frontend/DEVELOPER-GUIDE.md` — developer guide with common commands and tips.

Backend-specific docs
---------------------
- `docs/backend/README.md` — PHP API setup, env vars, scripts, and operational notes.
- `docs/TRBG-Image-Pipeline-Spec.md` — upload/variant pipeline, manifests, menus vs hero images.

Release & verification
----------------------
- `CHANGELOG.md` — changelog for all notable updates.
- `release/CHANGELOG-RELEASE-ENTRY.md` — per-release entry used for automation.
- `release/RELEASE_NOTES.md` — release summary and verification notes.
- `release/2025-10-15-lint-cleanup.md` — specific release note included in `RELEASE_NOTES/`.
- `ops/VERIFICATION_REPORT.md` — verification/audit summary for recent styling/tokenization work.

How to use these docs (quick commands)
-------------------------------------
Run common tasks from the repo root:

```bash
# frontend quick start
cd frontend
npm install
npm start

# linting
npm run lint        # from frontend/
npm run lint:css    # from frontend/

# tests
CI=true npm test -- --watchAll=false --runInBand
```

Editor tips
-----------
- We add `.vscode/settings.json` at the repo root to disable built-in CSS validators and prefer the Stylelint extension. If your editor still shows `@tailwind` warnings, reload the editor and make sure the Stylelint extension is using workspace settings.

Notes and rationale
-------------------
- The repository uses a Tailwind + token approach. Some legacy CSS classes keep non-kebab naming; renaming these en-masse is risky because React components reference them. To balance enforcement and safety, we added a `frontend/.stylelintrc.json` override for a small set of files and applied safe auto-fixes only.
- If you want stricter naming enforcement, open an issue and we can plan a migration that updates JS/JSX references as well as CSS.

Where to start for new contributors
----------------------------------
1. Read `contributing/CONTRIBUTING.md` for the PR workflow and commit conventions.
2. Follow `frontend/DEVELOPER-GUIDE.md` to get the frontend running locally.
3. Run linters and tests before opening a PR (see `guides/LINTING.md` and `guides/TESTING.md`).

Last updated: 2025-10-25
