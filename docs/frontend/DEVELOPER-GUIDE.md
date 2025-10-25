```markdown
# Developer Guide

This short guide collects the most common day-to-day commands and tips for working on the React + Tailwind frontend located in the `frontend/` folder.

Setup
-----
1. Install dependencies and start the dev server:

```bash
cd frontend
npm install
npm start
```

2. App URLs:
- Dev server: http://localhost:3000

Testing
-------
- Run unit tests (single pass / CI style):

```bash
CI=true npm test -- --watchAll=false --runInBand
```

Linting
-------
- JS linting: `npm run lint` and `npm run lint:fix` (ESLint)
- CSS linting: `npm run lint:css` (Stylelint)

Editor tips
-----------
- VS Code: install the ESLint and Stylelint extensions and allow them to use workspace settings.
- If you see `@tailwind` warnings in your editor, reload the window and ensure you opened the repository root (the repo contains a `.vscode/settings.json` disabling the built-in CSS validators and preferring Stylelint).

Working with Tailwind
---------------------
- `frontend/src/index.css` is the Tailwind entrypoint. It contains the `@tailwind base;`, `@tailwind components;`, and `@tailwind utilities;` directives.
- Avoid adding large amounts of bespoke global CSS to `index.css` — put project tokens and component-specific styles in `src/custom-styles.css`.

Performance and builds
----------------------
- Build for production:

```bash
npm run build
```

- If you change Tailwind config or PostCSS, rebuild to regenerate the production CSS.

Troubleshooting
---------------
- If linting or the editor shows different results than running `npm run lint` locally, your editor is likely using a global linter or cache. Reload the editor and ensure it uses the workspace config.
- If `npm start` fails, capture the terminal output and search for the top-most error; often missing env variables or a stale node_modules install are the cause.

Last updated: 2025-10-25

```
