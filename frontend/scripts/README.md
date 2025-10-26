Image generation and asset-check scripts

This folder contains small helper scripts used to generate and validate the public images used by the site.

Files
- `generate_social_with_logo.py` — generate various Open Graph (OG) images compositing the site's hero image and logo. Requires Python 3 and Pillow.
- `generate_ios_splash.py` — generate iOS splash images by parsing `frontend/public/index.html` for apple-touch-startup-image link tags.
- `generate_favicon_ico.py` — build a multi-resolution `favicon.ico` from PNG sources.
- `check_public_assets.js` — Node script used by CI to verify referenced public assets exist and validate dimensions for filename-encoded sizes.

Quick usage

1. Install Python dependencies (if running the Python scripts):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pillow
```

2. Run a generator (example):

```bash
python3 generate_social_with_logo.py --hero ../backend/uploads/1760554663370.jpg --logo ../backend/uploads/TRBG\ Logov2-w-badge.png
```

3. Run the asset checker (no Node deps required):

```bash
node ./check_public_assets.js
```

CI note

The repository includes a GitHub Actions workflow `.github/workflows/public-assets-check.yml` which runs `node ./scripts/check_public_assets.js` to fail the run when referenced assets are missing or have dimension mismatches.

If you change the public asset layout, update `frontend/public/index.html` and `frontend/public/manifest.json` and rerun the checker locally.
