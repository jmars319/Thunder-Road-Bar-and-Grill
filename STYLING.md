STYLING
=======

Short reference for styling and design tokens used in the frontend.

Overview
--------
- Tokens are implemented as CSS variables in `frontend/src/custom-styles.css`.
- `tailwind.config.js` provides Tailwind utility fallbacks where appropriate.
- Prefer semantic token names (e.g., `bg-surface`, `text-primary`) instead of hard-coded Tailwind color classes.

Where to look
-------------
- Token definitions: `frontend/src/custom-styles.css`
- Tailwind config: `frontend/tailwind.config.js`
- Component examples: `frontend/src/components/*`

Migration checklist (literal Tailwind → token)
-------------------------------------------
1. Find literal color/utility usage (search for `bg-<color>-<num>`, `text-<color>-<num>`, or hex values).
2. Choose a semantic token name (e.g., `bg-surface`, `text-muted`).
3. Add token to `frontend/src/custom-styles.css` and update `tailwind.config.js` if needed.
4. Replace classes in components and verify visually in both light and dark modes.

Verification commands
---------------------
From the `frontend/` folder:

```bash
npm install
npm run lint         # JS linting
npm run lint:css     # CSS linting (stylelint)
npm start            # start dev server
```

Notes on stylelint and Tailwind
-------------------------------
- `@tailwind` directives are PostCSS/Tailwind at-rules and may trigger generic CSS linters.
- We added a project `.stylelintrc.json` that ignores Tailwind at-rules and a small per-file override for legacy naming patterns so renaming classes doesn't break the app.

If you need stricter enforcement, relax overrides or rename selectors (careful — renaming may require JS changes).

Last updated: 2025-10-25
