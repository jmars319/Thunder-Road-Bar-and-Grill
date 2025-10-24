STYLING
=======

This file is a short, self-contained reference for styling in this repository.
It describes the design-token approach, how to migrate components away from
literal Tailwind classes, verification steps, and CI recommendations. It is
intentionally standalone — you do not need any local-only files to follow it.

Token philosophy
----------------
- Use semantic token classes in JSX and CSS, for example: `bg-primary`,
  `text-text-primary`, `bg-surface`, `divide-divider`.
- Tokens are implemented as CSS variables in `frontend/src/custom-styles.css`.
- `tailwind.config.js` maps utility fallbacks to these variables so tokens
  work with Tailwind while still providing safe fallback values for older
  environments.
- Tokens make runtime theming (light/dark) possible and keep color usage
  maintainable across the app.

Where to look
-------------
- Token definitions: `frontend/src/custom-styles.css`
- Tailwind config (token fallbacks): `frontend/tailwind.config.js`
- Example usage: `frontend/src/components/*` (search for `bg-`, `text-` token names)

Migration checklist (literal Tailwind → token)
-------------------------------------------
1. Identify literal color usage
   - Search for patterns like `bg-[a-z]+-\d+`, `text-[a-z]+-\d+`, `hover:bg-`,
     or inline hex values like `#fff` in JSX and CSS.
2. Pick an appropriate token name
   - Prefer semantic names: `bg-surface`, `bg-primary`, `text-muted`.
   - If a token for the color doesn't exist, add one to
     `frontend/src/custom-styles.css` and provide a sensible fallback in
     `tailwind.config.js`.
3. Replace classes and run quick checks
   - Replace literal classes with the token classes in the component.
   - Run the app locally and verify both light and dark themes.
4. Add a small verification step
   - For critical admin pages, add a snapshot test or capture a screenshot
     and compare visually as part of PR QA.

Verification commands
---------------------
- Run JS/JSX lint and tests (recommended before pushing):

```bash
cd frontend
npx eslint "src/**/*.{js,jsx}"
CI=true npm test -- --watchAll=false --runInBand
```

- Run style checks (if stylelint configured):

```bash
cd frontend
# optional: install stylelint config
npx stylelint "src/**/*.{css,scss}" || echo "no stylelint configured"
```

Search helpers
--------------
- Repo-wide grep for likely literals (run from repo root):

```bash
# simple literal tailwind check
grep -RInE "bg-[a-z]+-[0-9]+|text-[a-z]+-[0-9]+|hover:bg-[a-z]+-[0-9]+|#[A-Fa-f0-9]{3,6}" frontend || true
```

CI recommendations
------------------
- Add a CI job (GitHub Actions, GitLab CI, etc.) that runs:
  1. `npx eslint` for JS/JSX
  2. `npx stylelint` (if configured)
  3. `npm test` (frontend unit tests)

- Optionally create a verification job that runs the grep above to detect
  accidental re-introduction of literal utility classes.

Examples
--------
- Before: `className="bg-blue-500 text-white"`
- After:  `className="bg-primary text-on-primary"`

If `bg-primary` doesn't exist yet, add to `custom-styles.css` like:

```css
:root {
  --color-primary: #1e3a8a; /* fallback */
}
.bg-primary { background-color: var(--color-primary); }
```

And add the same fallback in `tailwind.config.js` so Tailwind utilities
compile correctly in production builds.

Notes and caveats
-----------------
- Prefer small, incremental changes (5–10 files per PR). Run tests and
  visually verify admin surfaces after each batch.
- Tokens are intentionally semantic — avoid naming tokens after colors
  (for example, don't use `bg-blue` as a token name; use `bg-primary`).
- Inline SVGs with `fill="currentColor"` will pick up token color values
  when used inside token-driven wrappers.

Last updated: 2025-10-24
