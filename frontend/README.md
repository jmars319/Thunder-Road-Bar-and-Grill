# Getting Started with Create React App

Purpose
- Quick reference for running the frontend dev server, tests, and building production output. See the repo root `README.md` for full-stack setup notes.

This project was bootstrapped with Create React App.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode. Open http://localhost:3000 to view it.

### `npm test`

Launches the test runner. For CI-style single runs, use:

```bash
CI=true npm test -- --watchAll=false --runInBand
```

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run eject`

One-way operation to copy build config into your project. Use with caution.

## Social preview & PWA assets

This project includes social preview images and PWA icons in `frontend/public/og/` and `frontend/public/splash/`. Helper scripts under `frontend/scripts/` can regenerate these images and an asset-checker validates files referenced by `index.html` and `manifest.json`.

See `frontend/scripts/README.md` for details on the image generators and the asset checker.

Last updated: 2025-10-21

## Linting and style checks

This project includes ESLint for JS/JSX and Stylelint for CSS. To run the checks locally:

```bash
# from frontend/
npm install
npm run lint        # JS lint (eslint)
npm run lint:fix    # try to auto-fix JS issues
npm run lint:css    # CSS lint (stylelint)
```

Notes about Tailwind and Stylelint
---------------------------------
- `src/index.css` is the Tailwind entrypoint and contains `@tailwind` directives.
- Generic CSS validators may flag `@tailwind` as an unknown at-rule. This repo configures stylelint to ignore Tailwind at-rules and adds workspace/editor settings to prefer the Stylelint extension and disable the built-in CSS validators in VS Code.
- If your editor still shows warnings after pulling changes, reload the editor and ensure the Stylelint extension is installed and using the workspace config.
