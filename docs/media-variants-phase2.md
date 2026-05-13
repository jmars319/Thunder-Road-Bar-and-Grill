## Media Variant Proof – Phase 2

This document captures the verification steps for the responsive image variant changes (Phase 2).

### 1. Variant Generation Script

Run the helper script to generate throwaway hero/menu/gallery uploads and confirm file naming:

```bash
php scripts/dev-variant-proof.php
```

The script outputs JSON similar to:

```json
[
  {
    "context": "hero",
    "variant_widths": [768,1536,2304],
    "optimized_files": [
      {"width":768,"file":"event-ab12cd34-ef5678-1x.jpg"},
      {"width":1536,"file":"event-ab12cd34-ef5678-2x.jpg"},
      {"width":2304,"file":"event-ab12cd34-ef5678-3x.jpg"}
    ],
    "webp_files": [
      {"width":768,"file":"event-ab12cd34-ef5678-1x.webp"},
      {"width":1536,"file":"event-ab12cd34-ef5678-2x.webp"},
      {"width":2304,"file":"event-ab12cd34-ef5678-3x.webp"}
    ]
  }
]
```

The script deletes the generated artifacts after inspection so the uploads directory stays clean.

### 2. Frontend Build

```bash
cd frontend
npm ci
npm run build
```

### 3. Deployment Bundles

```bash
bash scripts/make-deploy-zips.sh
bash scripts/check-deploy-zips.sh
```

### 4. Additional Checks

* Confirm no Google Fonts references remain:  
  `rg -n "fonts.googleapis.com|fonts.gstatic.com" frontend/index.html`
* Confirm public assets list is up to date:  
  `bash scripts/verify-public-assets.sh`
* Confirm error envelopes stay standard:  
  `bash scripts/verify-error-envelope.sh`

These steps ensure the responsive variant ladder, naming, and frontend wiring remain verifiable without requiring manual uploads.
