# Asset Optimization Report — 2025-12-25

## Logo PNGs (lossless via `optipng -o2`)

| File | Before | After | Delta |
| --- | --- | --- | --- |
| logo.png | 13,646 B | 11,990 B | -1,656 B (12.1%) |
| logo@2x.png | 40,521 B | 35,843 B | -4,678 B (11.5%) |
| logo@3x.png | 73,240 B | 66,225 B | -7,015 B (9.6%) |

Dimensions confirmed unchanged via `identify frontend/src/assets/logo/*.png`.

## Logo WebP files

`cwebp` trials at q=92 yielded <1% savings, so the original WebP exports were left untouched to avoid unnecessary re-encoding.

## Apple splash PNGs

Ran `optipng -o2 frontend/public/splash/*.png`; tool reported every file "already optimized" (no byte savings). File sizes and dimensions remain unchanged.

Full command log available in the commit history for reproducibility.
