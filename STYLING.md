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
    grep -RInE "bg-[a-z]+-[0-9]+|text-[a-z]+-[0-9]+|hover:bg-[a-z]+-[0-9]+|#[A-Fa-f0-9]{3,6}" frontend || true
    STYLING
    =======

    Short reference for styling and design tokens used in the frontend.

    See `frontend/src/custom-styles.css` for token definitions and `frontend/tailwind.config.js` for Tailwind fallbacks.

    Last updated: 2025-10-24
