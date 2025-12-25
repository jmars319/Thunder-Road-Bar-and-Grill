# Typography “Worst Display” Checklist

Guardrails for keeping TRBG readable on low-quality or aging monitors.

## Common Failure Modes
- Thin weights + low contrast, especially on dark backgrounds.
- Semi-transparent overlays behind small text.
- `transform`, `perspective`, or `preserve-3d` on text containers triggering GPU blur.
- Fractional font sizes/positions that raster unevenly.
- Heavy text-shadows or large blur radii that create halos.
- Parent opacity/filter effects applied to entire text blocks.

## Manual Verification (≈2 minutes)
1. Menu prices: digits appear crisp (tabular alignment, no “swim”).
2. Section headings: strong contrast, no blur or halo.
3. Buttons/CTAs: readable labels with solid contrast and no translucent overlays.
4. Admin tables: column text readable, no faint gray-on-gray rows.
5. Menu descriptions + preview: ensure sanitized HTML renders clearly (no literal tags).

## Rules of Thumb
- Prices: keep `font-variant-numeric: tabular-nums` and avoid opacity on wrappers.
- Avoid `perspective` / `transform-style: preserve-3d` on elements containing text; prefer simple translate transitions.
- Do not set opacity on parents of text. Use backgrounds/borders instead.
- Prefer integer font sizes for small text (12/14/16). Only use fractional sizes for large headings if needed.
- Text-shadows should be subtle: blur ≤ 1px, used only for contrast improvement.
- Use borders/contrast before shadows; drop shadows entirely if they create halos.
- Keep sanitization flow intact: sanitized HTML → `dangerouslySetInnerHTML`; never fallback to `textContent`.

Refer to `docs/richtext-editor.md` for rich text invariants and blur-only sanitization rules.
