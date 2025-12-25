# Rich Text Editor (RichTextField) Reference

## Invariants
- **Uncontrolled while focused**: the `contentEditable` element never has its `innerHTML` rewritten while the user is typing. State is updated only on blur/ext-value changes.
- **Blur-only sanitization**: input is sanitized via `sanitizeRichText` on blur; the PHP `HtmlSanitizer` remains authoritative server-side.
- **Selection preservation**: toolbar actions use `onMouseDown`, `preventDefault`, and explicit selection save/restore to avoid caret jumps.
- **Allowlist**: only `<p>`, `<strong>`, `<em>`, `<br>`, `<ul>`, `<ol>`, `<li>` are allowed and stored without attributes.

## Paste Normalization
- Paste handler always strips inline styles, fonts, and disallowed tags.
- Plain text paste converts newlines to `<br>` within paragraphs.
- HTML paste runs through the same `sanitizeRichText` allowlist before insertion.

## UTF-8 Expectations
- All editor content is stored and transmitted as UTF-8.
- Backend schema (utf8mb4) + JSON responses must preserve symbols (arrows, checkmarks, etc.).

## Sanitization Contract
- Client: sanitize-on-blur for previews/UI.
- Server: re-sanitize via `HtmlSanitizer` before persisting or rendering.
- Consumers must render rich text via `dangerouslySetInnerHTML` using sanitized content; never use textContent/innerText for saved HTML.

## Manual Smoke Checklist (≈2 minutes)
1. Type mid-paragraph; ensure caret stays put.
2. Use Bold/Italic/Bullets/Numbered buttons; confirm formatting applies without caret jump.
3. Paste styled content (with fonts/colors); ensure output is normalized to allowed tags only.
4. Insert symbols via toolbar; verify they appear and are stored.
5. Blur editor; confirm sanitized HTML persists and placeholder/dirty indicators reset.
6. Verify admin preview and public menu display show identical formatting, and `/api/menu` returns sanitized `<ul>/<li>` as expected.
