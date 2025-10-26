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
