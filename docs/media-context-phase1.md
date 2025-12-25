# Media Context Phase 1 Verification

## Schema reference
- `media_library.category` comes from `database/migrations/20251224_full_stack_upgrade.sql` (section 3). This column already stores hero/menu/general tags, so no schema change was required.

## Normalized context proof
```
$ ./scripts/dev-media-context-proof.php
{
    "normalized_inputs": [
        {"input":"NULL","normalized":null},
        {"input":"'general'","normalized":"gallery"},
        {"input":"'gallery'","normalized":"gallery"},
        {"input":"'menu'","normalized":"menu"}
    ],
    "gallery_where_clause": "(category IS NULL OR category = '' OR category = 'general' OR category = 'gallery')",
    "hydrated_categories": [
        {"input_category":null,"output_category":"gallery"},
        {"input_category":"general","output_category":"gallery"},
        {"input_category":"menu","output_category":"menu"}
    ]
}
```
- Rows without a stored context (NULL/"general") now hydrate as `gallery`.
- The gallery filter automatically matches `NULL`, empty string, legacy `general`, or new `gallery` values.

## Frontend checks
- Admin Media tab now labels hero/menu/gallery explicitly and uploads menu context intentionally.
- Menu module uploads default to the `menu` context when invoked from the menu editor.

## Build & deploy verification
```
$ npm ci && npm run build
$ bash ./scripts/make-deploy-zips.sh
$ bash ./scripts/check-deploy-zips.sh
```
All commands succeeded as part of this phase.
