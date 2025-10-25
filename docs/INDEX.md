# Developer Documentation Index

This page collects the most useful developer-facing docs in the repository and one-place commands to get started. Link to these files from your PRs and onboarding notes.

Primary docs
------------
- `README.md` — high-level overview and quick start (repo root).
- `CONTRIBUTING.md` — contribution workflow, commit message style, PR checklist.
- `DEVELOPERS.md` — onboarding, architecture notes, and frontend/admin guidance.
- `DEVELOPER_NOTES.md` — special-case notes and housekeeping guidance (e.g., accidental nested package folders).
- `FRONTEND-DEVELOPER-GUIDE.md` — frontend quick-start, tests and Tailwind notes.
- `LINTING.md` — ESLint and Stylelint setup, Tailwind handling, how to run and auto-fix linting.
- `STYLING.md` — design token philosophy, where tokens live, and verification commands.
- `MAINTENANCE.md` — release and tagging guidance, dependency update notes, and CI reminders.
- `TESTING.md` — test run instructions and locations for test logs.

Frontend-specific docs
----------------------
- `frontend/README.md` — create-react-app frontend quick start and stylelint notes.
- `frontend/scripts/README.md` — helper scripts for asset generation and checks.
- `frontend/.stylelintrc.json` — local stylelint config (ignores Tailwind at-rules and includes targeted overrides).

Backend-specific docs
---------------------
- `backend/README.md` — backend quick start, env vars, routes, and operational notes.

Release & verification
----------------------
- `release/CHANGELOG.md` — changelog copy for discoverability (also at repo root).
- `release/CHANGELOG-RELEASE-ENTRY.md` — per-release entry used for release automation.
- `release/RELEASE_NOTES.md` — release summary and verification notes.
- `release/2025-10-15-lint-cleanup.md` — specific release note included in `RELEASE_NOTES/`.
- `ops/VERIFICATION_REPORT.md` — verification and audit summary for recent styling/tokenization work.

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
1. Read `CONTRIBUTING.md` for the PR workflow and commit conventions.
2. Follow `FRONTEND-DEVELOPER-GUIDE.md` to get the frontend running locally.
3. Run linters and tests before opening a PR.

Last updated: 2025-10-25
