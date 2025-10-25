Developer notes: nested frontend/backend folders

During development this repository acquired two nested folders that look like accidental local installs:

- `frontend/backend/` — contains an ad-hoc `package.json` and `package-lock.json` (devDependencies for ESLint). It appears to be a local linting/tooling install and not part of the site's backend.
- `backend/frontend/` — contains an ad-hoc `package.json` and `package-lock.json` (devDependencies for ESLint/React hooks linting).

Recommendations

1. These folders are not required by the application itself and can safely be removed from the repository. They are likely the result of running `npm install` inside those subfolders.

2. To remove them from Git but preserve local copies, use:

```bash
# stop tracking the package files
git rm --cached frontend/backend/package.json frontend/backend/package-lock.json
git rm --cached backend/frontend/package.json backend/frontend/package-lock.json
git commit -m "chore: stop tracking accidental nested package.json files"
```

3. To delete the directories locally (free disk space):

```bash
rm -rf frontend/backend node_modules
rm -rf backend/frontend node_modules
```

4. If you intend these to be real subprojects, add a short README inside each explaining purpose and keep them tracked as proper package roots.

Last updated: 2025-10-21 — flagged accidental nested package folders and recommended cleanup.

See also
--------
- `DEVELOPERS.md` — developer onboarding and frontend/admin guidance
- `TESTING.md` — instructions for running tests and location of aggregated test logs (`test-logs/`)

Stylelint & editor configuration
--------------------------------
Recent housekeeping added a lightweight stylelint setup for the frontend to avoid noisy "unknown at rule @tailwind" warnings in editors. Key points:

- A workspace `.vscode/settings.json` was added to disable the built-in CSS/SCSS/LESS validators and prefer the Stylelint extension when opening the repository root.
- The frontend contains `frontend/.stylelintrc.json` to ignore Tailwind at-rules and a targeted override for `src/custom-styles.css` and `src/App.css` so renaming CSS classes (which could break JS) is not required.
- Local lint scripts are available in `frontend/package.json`:

```bash
cd frontend
npm run lint:css   # run stylelint
```

If your editor still reports warnings after pulling these changes, reload the editor window and ensure the Stylelint extension is installed and configured to use workspace settings.
