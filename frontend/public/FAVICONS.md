Favicon update notes
=====================

What I did
----------

- Backed up existing favicon files (if present) to a timestamped folder in this directory. Example backup folder created:

  - `favicon-backup-20251025031731`

- Copied the new favicon pack files into this `frontend/public` directory. Files added include:

  - `favicon.ico`, `favicon-mono.ico`
  - `favicon-16x16.png`, `favicon-32x32.png` and mono variants
  - `android-chrome-192x192.png`, `android-chrome-512x512.png` and mono variants
  - `apple-touch-icon.png` and mono variant
  - `site.webmanifest`

Notes and recommendations
-------------------------

- `index.html` already contains the usual favicon and manifest links and points to `manifest.json`. I left that in place to avoid changing the app behavior. The copied `site.webmanifest` is also available if you prefer the pack's manifest name.

- If you want the monogram (mono) versions (names ending in `-mono`), replace the standard filenames or update `index.html`/`manifest.json` to reference the `-mono` filenames.

- To revert to the previous icons, copy the files from the backup folder (for example `favicon-backup-20251025031731`) back into this directory.

Files present (selected)
------------------------

Use `ls -1` in this folder to view all files. Key files copied:

```
favicon.ico
favicon-16x16.png
favicon-32x32.png
apple-touch-icon.png
android-chrome-192x192.png
android-chrome-512x512.png
site.webmanifest
```

If you want me to also update `index.html` to point to `site.webmanifest` (instead of or in addition to `manifest.json`), or to switch the default `favicon.ico` to the `-mono` version, tell me and I will edit `index.html` accordingly.

— Automated update performed by the assistant
