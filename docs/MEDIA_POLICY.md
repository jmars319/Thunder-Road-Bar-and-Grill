# Media Policy

## Current Deploy
- Permanent public fixtures live in `frontend/public/static`, `frontend/public/og`, and tracked logo/favicon paths.
- Runtime uploads live under `backend/uploads` and are excluded from normal deploy archives except protective `.htaccess` files.
- Public menu/category and default hero imagery use bundled optimized assets so the site still renders if server uploads are empty.
- Admin-uploaded media remains supported for dynamic gallery or future business-managed content.

## Future R2 Pass
- Keep the existing admin upload UI.
- Store new admin uploads in Cloudflare R2 instead of cPanel disk after buckets, custom domains, and scoped tokens are available.
- Keep old cPanel upload references as legacy fallback until intentionally migrated.

## Never Commit
- Production uploads, downloaded live-reference zips, local snapshots, `.env`, `.env.production`, logs, caches, or temporary deploy staging folders.
