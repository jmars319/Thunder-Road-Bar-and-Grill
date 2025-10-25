# Linting (ESLint & Stylelint)

This file documents how we run and configure linters for JavaScript/JSX and CSS, and explains the Tailwind-specific handling so editors and CI show useful, non-noisy warnings.

JavaScript (ESLint)
-------------------
- Run JS linting from the repository root or the `frontend/` folder (frontend is a create-react-app project):

```bash
cd frontend
npm run lint
npm run lint:fix   # attempt to auto-fix issues
```

- If ESLint reports errors that are not auto-fixable, include a short note in your PR describing why (e.g., refactor required) or fix before requesting review.

CSS (Stylelint) and Tailwind
----------------------------
Tailwind adds PostCSS at-rules such as `@tailwind base;` which generic CSS linters will flag as "unknown at rule" unless they're configured to ignore them or use a Tailwind-aware plugin.

What we do in this repo
- The frontend includes a `frontend/.stylelintrc.json` that:
  - Extends a standard config and ignores Tailwind at-rules (`tailwind`, `apply`, `variants`, `responsive`, `screen`).
  - Adds a targeted override for some project CSS files (`src/custom-styles.css`, `src/App.css`) where we keep legacy naming patterns to avoid breaking JS references.

Editor configuration (recommended)
- For VS Code: install the "Stylelint" extension and ensure it is set to use workspace configuration.
- If the editor shows `@tailwind` warnings, disable the built-in CSS/SCSS/LESS validators in your workspace settings (this repo includes `.vscode/settings.json` at the repo root which disables them and prefers stylelint).

Running stylelint locally

```bash
cd frontend
npm run lint:css
# or run a single file
npx stylelint "src/index.css" --allow-empty-input
```

Auto-fixing CSS
---------------
You can auto-fix fixable style issues with:

```bash
npx stylelint "src/**/*.css" --fix
```

When to relax rules
-------------------
- We avoid renaming CSS class selectors en-masse because React components often reference them; renames can break behavior.
- If stylelint reports naming or ordering rules that would require renames, we prefer to add a targeted override in `.stylelintrc.json` and migrate classes gradually.

If you need help configuring your editor to use the workspace stylelint, add a note to your PR and we can include editor config snippets for other editors.

Last updated: 2025-10-25
