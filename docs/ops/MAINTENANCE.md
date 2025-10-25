# Maintenance and Release Notes

This file documents the lightweight release and maintenance process for this repository.

Tagging and releases
--------------------
- Releases are created by maintainers. When ready, create an annotated tag and push it.

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

Dependency updates
------------------
- Keep the `frontend/package.json` and `backend/package.json` dependencies up-to-date. When updating major versions, run the app locally and verify builds and tests.
- Lockfile (`package-lock.json`) is committed. After running `npm install` locally, commit the updated lockfile.

Housekeeping tasks
------------------
- Remove accidental nested package folders (see `docs/notes/DEVELOPER_NOTES.md`) — they often appear when running `npm install` in the wrong directory.
- Periodically run `npm audit` in both `frontend` and `backend` and review reported vulnerabilities. For anything marked as "high" or "critical", open an issue and plan a patch upgrade.

CI and verification
-------------------
- The repository uses simple CI checks (lint, tests, public asset checker). Ensure your PR includes passing checks or an explanation if a check is intentionally relaxed.

Last updated: 2025-10-25
