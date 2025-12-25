# Preload investigation (Dec 25, 2025)

Goal: verify that no hero/menu/gallery images are being manually preloaded in-app so the DevTools warning can only come from downstream optimizers (e.g., Cloudflare).

## Commands

```bash
rg -n 'rel="preload"'
```
Output: only the self-hosted font preloads in `frontend/public/index.html` (lines 137–150).

```bash
rg -n 'fetchpriority'
```
Output: only the `fetchpriority="high"` prop on Hero slideshow’s first image (kept intentionally).

```bash
rg -n 'as="image"' frontend
```
Output: *(no matches found)* — confirms no `<link rel="preload" as="image">` entries exist in the repo.
```

## Cloudflare follow-up
DevTools may still warn about “preloaded but not used” images if Cloudflare’s edge optimizations inject preloads. Check the Cloudflare dashboard (Speed → Optimization) for:

- **Rocket Loader / Auto Minify** (disable image preloads there if available)
- **Mirage / Polish / Early Hints** that might opportunistically preload hero images
- **Automatic Platform Optimization** (APO) settings, which can emit `<link rel="preload" as="image">`

No code changes were necessary; the repo itself doesn’t inject image preloads.
