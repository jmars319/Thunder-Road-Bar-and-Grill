# Getting Started (Create React App)

This file is a short reference for running the dev server, tests, and building production output. See the repo `README.md` or `docs/frontend/FRONTEND-DEVELOPER-GUIDE.md` for full-stack setup notes.

## Available Scripts

In the `frontend/` directory, you can run:

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
