# TRBG Image Pipeline Spec

## 1) Quick Start Overview
- **Who uploads:** Administrators use the React `MediaModule` inside the admin panel to manage hero/menu/general image categories. Brand logos are static assets committed under `/public/assets/logo/`, so no admin action is required for them. Uploads occur over raw `XMLHttpRequest` so progress and processing states can be surfaced (`frontend/src/components/admin/MediaModule.js`).
- **High-level flow:** The UI streams files to `POST /api/media`, the PHP backend writes the original under `backend/uploads/`, generates optimized + WebP variants plus a manifest, inserts an enriched row into `media_library`, and returns the hydrated record (`backend/routes/media.php:83-168`, `backend/utils/MediaPipeline.php:8-210`, `database/schema.sql:175-201`).
- **Primary endpoints:**  
  - `POST /api/media` – upload & process images.  
  - `GET /api/media` / `GET /api/media/:id` – retrieve enriched rows for admin & public use.  
  - `PUT /api/media/:id` – update metadata/category.  
  - `DELETE /api/media/:id` – delete original, variants, manifest.  
  - `GET /api/settings` – serve hero images with responsive data for the public hero.  
  - `GET /api/menu` – expose menu categories enriched with responsive menu images (`backend/routes/menu.php:80-169`).

## 2) Pipeline 1 – Admin Media Upload & Variant Generation

### Client Entry
- `MediaModule` keeps paginated lists per category, refetches totals via `GET /api/media`, and wires each file input to `uploadMediaFile`, which appends `file`, `title`, and `category`, sets `Authorization: Bearer`, tracks progress (`onprogress`), and toggles a “Processing images…” state until the XHR resolves (`frontend/src/components/admin/MediaModule.js:200-276`).  
- After success, category-specific lists are reset/refetched and a `mediaUpdated` event is dispatched so other components refresh immediately (`frontend/src/components/admin/MediaModule.js:252-276`).

### API Flow – `POST /api/media`
- Authenticated via `AdminAuthMiddleware::require()`. Rejects missing files or upload errors before processing (`backend/routes/media.php:83-111`).  
- Category defaults to `general` but is normalized; `category=resume` is blocked with a 400 response to enforce images-only behavior (`backend/routes/media.php:102-107`).  
- Delegates to `MediaPipeline::processUploadedFile` for validation, renaming, and derivative generation, then inserts the resulting metadata plus user-supplied title/alt/caption (`backend/routes/media.php:112-167`).

### Validation & Security Rules
- Allowed MIME types: JPEG/PNG/GIF/WebP – enforced via `MediaPipeline::$ALLOWED_IMAGE_MIME_TYPES` and `FileValidator::validate`, which also checks magic bytes, `getimagesize`, and a max dimension guard (`backend/utils/MediaPipeline.php:8-191`, `backend/utils/FileValidator.php:15-119`).  
- Size cap: `IMAGE_UPLOAD_MAX_BYTES` env var (default 8 MB, `backend/.env.example:72-80`); exceeding files trigger a 400 error (`backend/utils/FileValidator.php:101-119`).  
- `save_uploaded_file` equivalent: `MediaPipeline::processUploadedFile` hashes the file, builds a basename `event-{hash}-{random}`, moves the original to `/uploads`, and only retains it after successful `move_uploaded_file`/`rename` (`backend/utils/MediaPipeline.php:70-137`).  
- `category=resume` rejection combined with `backend/scripts/remove_resume_media.php` ensures legacy resume blobs are removed (see §7).

### Image Transformations
- **Width profiles:**  
  - Hero: `[1600, 3200, 4800]`  
  - Menu: `[1440, 2880, 4320]`  
  - Default: `[480, 768, 1024, 1600]`  
  Defined in `MediaProfiles` and enforced per category, with optional overrides via `RESPONSIVE_IMAGE_WIDTH_PROFILES` (`backend/utils/MediaProfiles.php:5-66`).  
- **1x/2x/3x guarantee:** Hero/menu profiles are explicitly the base, 2x, and 3x widths listed above, so each upload produces exactly those three raster widths per required class.  
- **WebP generation:** Each width spawns an optimized JPEG/PNG variant plus a WebP counterpart via `imagewebp`; failures are logged but don’t abort the upload (`backend/utils/MediaPipeline.php:139-178`).  
- **Manifest creation:** After derivatives are written, a `{basename}.json` manifest containing the original metadata and `variants.optimized/webp` arrays is stored under `/uploads/manifests/` for deterministic lookups (`backend/utils/MediaPipeline.php:181-210`).

### Storage Layout & Naming
- `MediaPipeline::ensureStructure` boots the tree: `/uploads/`, `/incoming`, `/variants/optimized`, `/variants/webp`, `/manifests`, etc. (`backend/utils/MediaPipeline.php:16-53`).  
- Filenames follow `event-{hash}-{random}.ext`; variants append `-w{width}` plus `.jpg/.png` or `.webp`.  
- `/backend/uploads/.htaccess` disables indexing, blocks script execution, and sets 1-year caching for raster variants while keeping manifests uncached (`backend/uploads/.htaccess:1-11`). `.gitignore` files keep each leaf tracked but empty.

### Database Updates
- `media_library` stores original URL/name/type/size, intrinsic dimensions, checksum, textual metadata, category, `optimized_path`, `webp_path`, srcsets, serialized `responsive_variants`, manifest path, uploader username, status, processing notes, and timestamps (`database/schema.sql:175-201`).  
- `POST /api/media` inserts all of the above and returns the hydrated row (with `success: true`) for immediate UI consumption (`backend/routes/media.php:137-168`).

## 3) Pipeline 2 – Variant Retrieval & Rendering

### GET /api/media
- Accepts optional `category`, `limit`, and `offset`, returns `{ "success": true, "media": [...] }` with `X-Total-Count` for pagination. Each row flows through `MediaResponseBuilder`, which loads `responsive_variants` from the manifest/DB, computes `optimized_srcset`/`webp_srcset`, and sets `fallback_original` (`backend/routes/media.php:20-78` & `backend/utils/MediaResponseBuilder.php:1-64`).  
- The admin UI consumes this payload to populate category-specific grids and to bind menu hero selections (`frontend/src/components/admin/MediaModule.js:200-314`).

### GET /api/settings
- Reads `site_settings.hero_images`, looks up corresponding media rows, hydrates them, and returns `{ "success": true, "settings": { ..., "hero_images_variants": [...] } }`, keeping `hero_images` as the admin-ordered list with custom alt text (`backend/routes/settings.php:69-111`).  
- `HeroSection` fetches this endpoint first and feeds `hero_images_variants` through `buildImageVariant`/`ResponsiveImage` to render the slideshow (`frontend/src/components/public/HeroSection.js:18-90`).

### Menu Image Hydration
- `GET /api/menu` joins `menu_categories` with `media_library.gallery_image_id`, hydrates any referenced media via `MediaResponseBuilder`, and exposes both `gallery_image_url` (fallback) and `gallery_image_responsive`/`gallery_image_variants` for each category (`backend/routes/menu.php:80-157`).  
- `MenuSection` normalizes those fields into `heroVariant` via `buildImageVariant`, falling back to static URLs only when variants don’t exist (`frontend/src/components/public/MenuSection.js:20-150`).

### Variant Assembly & Frontend Rendering
- `frontend/src/utils/imageVariants.js` provides `normalizeImageVariants`, `hasRenderableImageVariant`, and `buildImageVariant`, always preferring manifest data before falling back to raw URLs. It also ensures URLs are absolute via `SERVER_BASE` (`frontend/src/utils/imageVariants.js:1-43`).  
- `ResponsiveImage` renders `<picture>` trees with a WebP `<source>`, JPEG `<source>`, and `<img>` fallback, populating `sizes`, `srcset`, and intrinsic dimensions to keep CLS low (`frontend/src/components/common/ResponsiveImage.js:1-30`).  
- All public consumers (hero, menu) check `hasRenderableImageVariant` before rendering, guaranteeing they only output `<picture>` when the manifest-backed payload is present (`frontend/src/components/public/HeroSection.js:18-90`, `frontend/src/components/public/MenuSection.js:20-150`).

## 4) Pipeline 3 – Cleanup, Auditing, and Ops

- **Deletion:** `DELETE /api/media/:id` fetches the row, loads the manifest if present, removes the original plus every optimized/WebP derivative (and manifest file), then deletes the DB row, returning `{ "success": true }` (`backend/routes/media.php:184-219`).  
- **Rehydration script:** `php backend/scripts/rehydrate_media_variants.php` scans for rows missing manifests/variants and reruns `MediaPipeline::regenerateForRow`, updating `optimized_srcset`, `webp_srcset`, and `responsive_variants` (`backend/scripts/rehydrate_media_variants.php:1-48`).  
- **Resume cleanup:** `php backend/scripts/remove_resume_media.php` deletes any legacy `category='resume'` rows/files and nulls matching `job_applications.resume_url` entries, ensuring the deprecated resume flow stays disabled (`backend/scripts/remove_resume_media.php:1-41`).  
- **Storage hygiene:** `.htaccess` in `backend/uploads/` blocks execution and enforces caching rules (see §6). No additional audit utility exists beyond the rehydration/cleanup scripts – **NOT FOUND IN REPO** for automated variant auditors beyond these scripts.

## 5) Request / Response Reference

| Endpoint | Method | Request Highlights | Response Shape |
| --- | --- | --- | --- |
| `/api/media` | POST | Multipart form-data (`file`, `category`, optional `title`, `alt_text`, `caption`). `Authorization: Bearer <token>` required (`frontend/src/components/admin/MediaModule.js:210-247`, `backend/routes/media.php:83-168`). | `201 { "success": true, "media": { ...hydrated row... } }` or `400/500 { "success": false, "message": "..." }`. |
| `/api/media` | GET | Optional `?category=hero&limit=48&offset=0`; adds `X-Total-Count`. | `{ "success": true, "media": [ { file_url, title, responsive_variants, optimized_srcset, webp_srcset, fallback_original, ... } ] }` (`backend/routes/media.php:20-78`). |
| `/api/media/:id` | GET | None. | `{ "success": true, "media": { ... } }` or `404 { "success": false, "message": "Media not found" }` (`backend/routes/media.php:61-78`). |
| `/api/media/:id` | PUT | JSON body with any of `title`, `alt_text`, `caption`, `category`. Attempts to set `category=resume` are rejected with 400 (`backend/routes/media.php:184-217`). | `{ "success": true }` or error. |
| `/api/media/:id` | DELETE | None. | `{ "success": true }` or `404/500` error (`backend/routes/media.php:184-219`). |
| `/api/settings` | GET | None (public, rate-limited). | `{ "success": true, "settings": { hero_images, hero_images_variants, ... } }` (`backend/routes/settings.php:69-111`). |

## 6) Configuration, Storage, and Security References

- **Environment variables (backend/.env.example:72-80):**  
  - `UPLOAD_DIR` – root relative to `backend/` (defaults to `uploads`).  
  - `IMAGE_UPLOAD_MAX_BYTES` – size limit (default 8388608).  
  - `IMAGE_JPEG_QUALITY`, `IMAGE_WEBP_QUALITY`, `IMAGE_PNG_COMPRESSION` – quality knobs.  
  - `RESPONSIVE_IMAGE_WIDTH_PROFILES` – JSON map for overriding width arrays.
- **Storage:** `MediaPipeline::ensureStructure` keeps `/uploads/` and subfolders present; directories must stay writable on servers and are excluded from deploy archives so originals/variants persist (`backend/utils/MediaPipeline.php:16-53`).  
- **.htaccess:** `/backend/uploads/.htaccess` disables directory listings, forbids executing PHP/CGI, caches images for a year, and keeps manifests no-cache (`backend/uploads/.htaccess:1-11`).  
- **Routing protections:** Global `.htaccess` in `backend/` ensures `/api/uploads/*` is served directly without passing through PHP (`backend/.htaccess:1-10`).  
- **Auth:** All mutations require admin JWT (see `AdminAuthMiddleware.php`). Public endpoints apply rate limiting (`backend/index.php:140-209`).

## 7) TRBG-Specific Notes

- **Mandatory menu category:** The admin UI exposes a dedicated “Menu” column, and `MediaModule.handleUpload` refreshes the menu list only when `category === 'menu'` (`frontend/src/components/admin/MediaModule.js:252-276`). Menu components consume `gallery_image_responsive` to ensure only menu-class uploads power the menu cards instead of repurposing gallery art (`frontend/src/components/public/MenuSection.js:20-150`).  
- **Menu images not reused for gallery:** `menu_categories.gallery_image_id` explicitly references media rows, and the public API returns responsive metadata per category, meaning menu cards exclusively render whichever media entry is assigned via the admin picker (`backend/routes/menu.php:80-157`).  
- **Locked width profiles:** Hero `[1600, 3200, 4800]` and menu `[1440, 2880, 4320]` are hard-coded constants in `MediaProfiles` (`backend/utils/MediaProfiles.php:5-51`).  
- **Resume uploads blocked:** `POST /api/media` rejects `category=resume`, `PUT /api/media/:id` disallows switching to resume, and `backend/scripts/remove_resume_media.php` purges historical entries while clearing job application references (`backend/routes/media.php:102-107`, `backend/routes/media.php:194-205`, `backend/scripts/remove_resume_media.php:1-41`).  
- **Menu images only:** Nothing references a “gallery target” concept; the only enforced upload categories are hero/menu/general, aligning with TRBG’s requirement that menu art be its own class. Logos are static assets outside the pipeline.

## 8) Verification Checklist
1. **Upload test:** From the admin panel, upload a hero image and a menu image. Confirm the progress UI runs, the cards appear in their respective sections, and the manifest/variant files show up under `backend/uploads/variants/*` plus `/backend/uploads/manifests/*.json` (verify via filesystem).  
2. **API validation:** `curl http://localhost:5001/api/media?category=hero` → ensure each entry has `responsive_variants.optimized/webp` arrays and non-empty `optimized_srcset`.  
3. **Hero settings:** `curl http://localhost:5001/api/settings` → confirm the returned `settings.hero_images_variants` includes the newly uploaded hero entry with srcsets.  
4. **Menu rendering:** Load `/` in the frontend, expand a menu category that has a menu image, and use dev tools to confirm the `<picture>` markup references `/uploads/variants/...` URLs rather than raw originals (`frontend/src/components/public/MenuSection.js:118-200`).  
5. **Deletion:** Delete the uploaded media from the admin UI; verify the API returns `{ success: true }` and that the original + variant files + manifest disappear on disk (`backend/routes/media.php:184-219`).  
6. **Legacy remediation:** If upgrading from older data, run `php backend/scripts/rehydrate_media_variants.php` and `php backend/scripts/remove_resume_media.php` once to ensure all rows have manifests and that no resume artifacts remain.  
7. **Limits enforcement:** Attempt to upload a non-image (e.g., PDF) or file >8 MB and confirm the API responds with `400` (“Only image files are allowed” or size error) aligning with `FileValidator` checks.
