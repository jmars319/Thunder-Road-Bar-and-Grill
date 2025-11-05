Image variant generator

This repository includes a small Node script to generate resized and WebP variants for images placed in the project's `uploads/` folder. These variants make it easy to provide `srcset` and WebP fallbacks for better performance.

Prerequisites

- Node.js installed
- From the `backend/` folder: npm install sharp minimist

Usage

From the project root, run:

```bash
cd backend
npm install sharp minimist
node tools/generate_image_variants.js --src ../uploads --sizes 480,768,1024,1600
```

This will create files like `image-480.jpg` and `image-480.webp` next to the original images.

Notes

- The script is intentionally simple. For a production flow, integrate image processing into your upload pipeline (e.g. process uploads on save) and set proper caching headers on the server.
- The script will skip outputs that already exist.
