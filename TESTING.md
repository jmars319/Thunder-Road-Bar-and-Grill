TESTING
=======

This repository includes both a frontend React app and a Node/Express backend. This short guide explains how to run unit tests and the simple integration script, and where test logs are stored.

Files with aggregated logs
- `test-logs/frontend-tests.log` — captured output from running the frontend Jest test suite via `react-scripts`.
- `test-logs/backend-integration.log` — captured output from the backend integration script `backend/tests/menu.integration.test.js`.

Run frontend tests

From the repository root or inside `frontend/` you can run the project test runner. The project uses `react-scripts` and includes a `test:ci` script which runs Jest in single-threaded mode.

In zsh:

```bash
cd "$(pwd)"/frontend
# run using react-scripts (recommended; handles Babel/ESM transforms)
CI=true npm test -- --watchAll=false --runInBand

# OR use the project's convenience script (uses jest directly):
npm run test:ci
```

Run backend integration test

The backend integration script makes HTTP requests against a running API. Start your backend server (in another terminal) and then run the integration script — do not let the test script try to start or stop your running server.

Default API endpoint:

 - `http://localhost:5001/api` (the test script uses `API_BASE` environment variable if set)

In zsh:

```bash
# ensure your backend server is running (e.g. `npm run dev` in backend/) then:
cd "$(pwd)"/backend
npm run test:integration
```

If your server is on a different host/port set the `API_BASE` env var first, for example:

```bash
export API_BASE="https://staging.example.com/api"
npm run test:integration
```

Notes
- The frontend tests are run with the project's Babel/CRA setup so ESM and JSX are supported out of the box.
- The backend integration test requires a reachable server and a configured database. The integration script will fail if the API is unreachable or the DB is misconfigured.
- Captured logs are stored in `test-logs/`. If you prefer not to commit logs, remove or ignore them in `.gitignore`.

See also

- `README.md` — high-level project overview and quick start.
- `DEVELOPERS.md` — developer onboarding and deeper frontend/admin guidance.

Suggested next steps
- Convert the integration script into a Jest-managed integration test for easier CI integration and to allow running everything under a single test runner.
- Add a short section in `README.md` linking to this `TESTING.md`.

Last updated: 2025-10-24
