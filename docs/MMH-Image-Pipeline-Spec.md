MMH Image Pipeline Spec
Quick Start Overview
Admin staff use the React MediaManager interface to pick files, capture categories/metadata, and stream uploads to POST /api/media, which validates files, generates responsive variants, and records media metadata (MediaManager.js (lines 53-187), index.php (lines 4891-4945), MMH_SYSTEMS.md (lines 4-51)).
Image optimization runs through save_uploaded_file + process_image_variants, which enforce MIME/size limits, orient the source, resize into width profiles, emit optimized + WebP assets, and persist manifest JSON alongside DB rows (index.php (lines 133-194), ImageUtils.php (lines 10-189), schema.sql (lines 27-50)).
Consumers fetch /api/media and /api/settings to obtain image_variants payloads; imageVariants.js + ResponsiveImage.js turn them into <picture> trees for event grids, hero sections, and anywhere else the admin CMS references uploads (index.php (lines 4861-4888), index.php (lines 4993-5005), imageVariants.js (lines 1-260), ResponsiveImage.js (lines 1-157), FeaturedEvents.js (lines 1-95)).
Storage lives under backend/uploads/ with enforced subfolders (/optimized, /webp, /variants, /manifests), hardened by .htaccess, excluded from version control, and rewired by deployment docs so /uploads/* stays writable between releases (bootstrap.php (lines 23-78), .htaccess (lines 1-27), MMH_SYSTEMS.md (lines 42-51), MMH_SYSTEMS.md (lines 80-86)).
Pipeline 1 – Admin Media Upload & Variant Generation
Client entry: MediaManager lists existing media, filters by category, previews selections, and captures upload metadata using fetch for GET /api/media and raw XMLHttpRequest for POST /api/media so it can surface progress/processing states (MediaManager.js (lines 53-147)).
API flow: POST /api/media ensures a file input exists, calls save_uploaded_file, derives the public URL (/uploads/{filename}), hashes the file, and inserts the row into media with width/height, MIME, category, alt/caption, optimized paths, and processing notes before returning the inserted payload (index.php (lines 4891-4945)).
Validation & security: save_uploaded_file rejects anything that exceeds IMAGE_UPLOAD_MAX_BYTES (default 8 MB), enforces MIME/extension allowlists (jpeg, png, gif, webp), names files event-{hash}-{random}.{ext}, and only keeps uploads after move_uploaded_file succeeds (index.php (lines 133-188)).
Image transformations: process_image_variants reads intrinsic metadata, applies EXIF rotation for JPEGs, chooses width targets from the union of the icon/thumb/gallery/hero profiles, resizes with imagecreatetruecolor, writes optimized variants using JPEG quality IMAGE_JPEG_QUALITY (default 85) or PNG compression IMAGE_PNG_COMPRESSION (default 6), attempts WebP conversion via imagewebp using IMAGE_WEBP_QUALITY (default 85), builds srcset strings, and writes a manifest per original (ImageUtils.php (lines 10-189), ImageUtils.php (lines 533-607), bootstrap.php (lines 57-67)).
Storage & naming: Bootstrap guarantees backend/{UPLOAD_DIR}/, .../optimized, .../webp, .../variants/{optimized,webp}, and .../manifests exist; manifests are saved as {basename}.json and derived variant filenames follow {basename}-w{width}.{ext} or .webp (bootstrap.php (lines 23-55), ImageUtils.php (lines 103-173)).
Database update: The media table tracks file paths, public URLs, checksums, width/height, MIME, category, textual metadata, optimized/webp paths, status, notes, uploader, and timestamps, providing indexes by category/date for the admin grid (schema.sql (lines 27-50)).
Response contract: Success payloads include id, filename, file_url, intrinsic dimensions, optimized/WebP paths, srcsets, fallback originals, and the raw responsive_variants arrays, mirroring the DB insert (index.php (lines 4928-4943)).
POST /api/media request/response:
Request: multipart form-data with file (binary, required), category (string, defaults other), alt_text and caption (strings, optional) (index.php (lines 4891-4924)).
Success 200 example:
{
  "success": true,
  "media": {
    "id": 123,
    "filename": "event-ab12cd34-123456789.jpg",
    "file_url": "/uploads/event-ab12cd34-123456789.jpg",
    "category": "gallery",
    "alt_text": "Poster",
    "caption": "Summer show",
    "width": 1600,
    "height": 900,
    "optimized_path": "/uploads/variants/optimized/event-ab12cd34-123456789-w1024.jpg",
    "webp_path": "/uploads/variants/webp/event-ab12cd34-123456789-w1024.webp",
    "optimized_srcset": "...",
    "webp_srcset": "...",
    "fallback_original": "/uploads/event-ab12cd34-123456789.jpg",
    "responsive_variants": {
      "optimized": [...],
      "webp": [...]
    }
  }
}
Errors: missing file or validation failure → 400 with { "success": false, "message": "No file uploaded" | "Only image files are allowed" | "File exceeds the {n}MB limit" }; unexpected exceptions return 500 "Upload failed" after logging when APP_DEBUG is true (index.php (lines 4891-4950)).
Client handling: After a successful upload, MediaManager clears the selection, refetches the grid, and surfaces any errors via alerts/console logs; progress UI shows transfer percent and a “Processing images…” state until the XHR resolves (MediaManager.js (lines 98-187)).
Security posture: Uploads are served with listing disabled and executable types denied via backend/uploads/.htaccess, and docs reiterate that this directory stays writable but untracked, preventing scripts from running even if they slip through (.htaccess (lines 1-27), MMH_SYSTEMS.md (lines 115-119)).
Pipeline 2 – Variant Retrieval & Rendering
Admin/media retrieval: GET /api/media optionally filters by category, maps every row through build_single_image_variant, and returns enriched entries containing image_variants, optimized_srcset, webp_srcset, and fallback_original properties (index.php (lines 4861-4888)).
CMS settings retrieval: GET /api/settings loads hero image arrays from business_settings, resolves their variants via build_image_variants, and exposes hero_images_variants / tgp_hero_images_variants so hero modules can render responsive art without inspecting raw URLs (index.php (lines 4993-5005)).
Variant assembly: Helpers normalize URLs to /uploads/*, consult manifests first, fall back to DB columns, and finally infer files from disk, guaranteeing optimized, webp, and srcset strings whenever derivatives exist (index.php (lines 840-1007), ImageUtils.php (lines 409-463)).
Frontend rendering: imageVariants.js prefixes relative URLs with SERVER_BASE, deduplicates srcset entries, blocks legacy /uploads/event-* URLs lacking responsive data, and exposes hasRenderableImageVariant plus buildImageVariant for downstream components (imageVariants.js (lines 1-260)). ResponsiveImage consumes those variants to output <picture> trees, manage aspect ratios, lazily load, switch to fallbacks on errors, and respect caller-defined sizes (ResponsiveImage.js (lines 1-157)). Components such as FeaturedEvents only render poster art when hasRenderableImageVariant returns true, otherwise showing brand fallbacks (FeaturedEvents.js (lines 1-95)).
Request/response contract: GET /api/media responds with { "success": true, "media": [ ...enriched rows... ] }; errors log to error_log when APP_DEBUG and return 500 "Failed to fetch media" (index.php (lines 4861-4888)). PUT /api/media/:id expects a JSON body with category, alt_text, caption and returns { "success": true } or 500 upon failure, while DELETE /api/media/:id removes the row & files or replies 404 "Media not found" (index.php (lines 4953-4989)).
Client usage: MediaManager hydrates its gallery by calling GET /api/media, filtering client-side by category buttons, showing fallback icons when thumbnails fail, and supporting inline updates/deletes via PUT/DELETE requests (MediaManager.js (lines 53-206)). Site modules such as events, schedule, and hero rely on the same image_variants data propagated through API responses to avoid broken images (MMH_SYSTEMS.md (lines 40-51)).
Security & validation: Variant builders only accept upload-backed URLs via normalize_existing_upload_url, emit fallbacks if files disappear, and short-circuit if manifests are missing, preventing broken <img> references downstream (ImageUtils.php (lines 352-407), imageVariants.js (lines 209-224)).
Pipeline 3 – Cleanup, Auditing, and Ops
Deletion flow: DELETE /api/media/:id looks up the row, infers the original upload path, calls delete_image_with_variants to remove the original, every derived variant width, and manifest JSON atomically, and then deletes the DB row, logging failures when APP_DEBUG is set (index.php (lines 4969-4989), ImageUtils.php (lines 466-519)).
Variant health checks: check_image_variants.php can be run by operators to iterate hero/settings/event images, confirm manifest availability, list optimized/WebP widths vs. expected targets, and report missing derivatives for remediation (check_image_variants.php (lines 1-200), MMH_SYSTEMS.md (lines 42-51)).
Operational guidance: Docs remind operators that uploads sit under backend/uploads/, stay writable on the server, and are excluded from deploy zips so existing media survives releases (MMH_SYSTEMS.md (lines 42-51), MMH_SYSTEMS.md (lines 80-86)). Regression and smoke-test checklists include uploading/deleting media and verifying /uploads/variants/{optimized,webp} contents, ensuring the pipeline works after deployment (operator-checklist.md (lines 45-47), DEPLOY_SMOKE_TEST.md (lines 52-53)).
Storage protections: .htaccess forbids executing scripts from the uploads tree and caches binary assets aggressively (immutable 1-year TTL) while forcing manifests/JSON to stay uncached so variant metadata refreshes immediately (.htaccess (lines 1-27)).
Request/Response Reference
POST /api/media: multipart (fields above), 200 success payload shown earlier; 400 on validation failure; 500 on server error (index.php (lines 4891-4950)).
GET /api/media: optional ?category=hero|menu|general|all, returns media[] each with DB columns plus image_variants, srcsets, fallback_original; 500 on failure (index.php (lines 4861-4888)).
PUT /api/media/:id: JSON body { "category": "hero", "alt_text": "...", "caption": "..." }, 200 success with { "success": true }, 500 failure logs error (index.php (lines 4953-4966)).
DELETE /api/media/:id: no body; success returns { "success": true }, 404 if ID missing, 500 on error (index.php (lines 4969-4989)).
GET /api/settings: returns { "success": true, "settings": { ..., "hero_images_variants": [...], "tgp_hero_images_variants": [...] } } so frontend hero modules stay responsive; 500 on failure (index.php (lines 4993-5005)).
Configuration, Storage, and Security References
Environment variables: UPLOAD_DIR selects the writable root; IMAGE_UPLOAD_MAX_BYTES, IMAGE_JPEG_QUALITY, IMAGE_WEBP_QUALITY, IMAGE_PNG_COMPRESSION, and RESPONSIVE_IMAGE_WIDTH_PROFILES control size, quality, and width targets; defaults are set in bootstrap.php (lines 23-78) and surfaced via .env.example for deploys (.env.example (lines 1-9)). Frontend uses REACT_APP_API_BASE to pin API_BASE/SERVER_BASE for admin calls and CDN-safe URLs (apiConfig.js (lines 1-66)).
Database schema: media table columns enumerated above ensure metadata persists per upload (schema.sql (lines 27-50)).
Serving rules: Root .htaccess rewrites /uploads/* to api/uploads/*, while backend .htaccess routes API requests; docs highlight this so uploaded assets continue to resolve publicly even though they originate from the backend/uploads/ tree (MMH_SYSTEMS.md (lines 80-86), .htaccess references in repo root).
