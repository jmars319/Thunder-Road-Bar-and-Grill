# Logo Asset Inventory (Dec 2025)

| File | Dimensions | Size | Used in |
| --- | --- | --- | --- |
| frontend/src/assets/logo/logo.png | 133×80 | 13 KB | `BrandLogo` 1x PNG fallback |
| frontend/src/assets/logo/logo@2x.png | 267×160 | 40 KB | `BrandLogo` 2x PNG |
| frontend/src/assets/logo/logo@3x.png | 400×240 | 72 KB | `BrandLogo` 3x PNG |
| frontend/src/assets/logo/logo.webp | 133×80 | 9.3 KB | `BrandLogo` 1x WebP |
| frontend/src/assets/logo/logo@2x.webp | 267×160 | 28 KB | `BrandLogo` 2x WebP |
| frontend/src/assets/logo/logo@3x.webp | 400×240 | 50 KB | `BrandLogo` 3x WebP |

**Verification steps**
- `find frontend/src/assets/logo -type f` → only the six files above.
- `rg -n "logo@" -n "logo.webp" -n "logo.png" -g"*.js" frontend/src` → only `BrandLogo.js` references them.
- `identify frontend/src/assets/logo/*` (ImageMagick) confirms pixel sizes.

No duplicate or unused logo assets were found, so no deletion was necessary.
