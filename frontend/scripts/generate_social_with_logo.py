#!/usr/bin/env python3
"""
Generate social images from the hero JPG and composite the logo in the
bottom-right corner with padding. Outputs PNGs to ../public/.

Usage: run from the repo root or frontend folder; requires Pillow.
"""
import os
from PIL import Image

# Paths (absolute source paths)
# Resolve repo root relative to this script file to make paths robust
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
HERO_SRC = os.path.join(REPO_ROOT, 'backend', 'uploads', '1760554663370.jpg')
LOGO_SRC = os.path.join(REPO_ROOT, 'TRBG Logov2-w-badge.png')

# Output dir (frontend/public/og)
OUT_DIR = os.path.join(REPO_ROOT, 'frontend', 'public', 'og')

SIZES = [
    (1200, 630, 'og-image-1200x630-with-badge.png'),
    (1024, 1024, 'og-1024x1024.png'),
]

# Logo placement params
LOGO_TARGET_WIDTH_RATIO = 0.18  # logo width as fraction of output width
PADDING_RATIO = 0.04  # padding from edges as fraction of width
LOGO_OPACITY = 1.0


def ensure_out_dir():
    os.makedirs(OUT_DIR, exist_ok=True)


def load_image(path):
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    return Image.open(path).convert('RGBA')


def cover_resize(img, target_w, target_h):
    # Resize image to cover the target area (center crop)
    src_w, src_h = img.size
    src_ratio = src_w/src_h
    target_ratio = target_w/target_h
    if src_ratio > target_ratio:
        # source is wider -> fit height, crop width
        new_h = target_h
        new_w = int(target_h * src_ratio)
    else:
        # source is taller -> fit width, crop height
        new_w = target_w
        new_h = int(target_w / src_ratio)
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    # crop center
    left = (new_w - target_w)//2
    top = (new_h - target_h)//2
    return img_resized.crop((left, top, left+target_w, top+target_h))


def composite_logo(base_img, logo_img, out_name):
    W, H = base_img.size
    # compute logo size
    logo_w = int(W * LOGO_TARGET_WIDTH_RATIO)
    # maintain logo aspect
    lw, lh = logo_img.size
    logo_h = int(logo_w * (lh / lw))
    logo_resized = logo_img.resize((logo_w, logo_h), Image.LANCZOS)

    # apply opacity if needed
    if LOGO_OPACITY < 1.0:
        alpha = logo_resized.split()[3].point(lambda p: int(p*LOGO_OPACITY))
        logo_resized.putalpha(alpha)

    padding = int(W * PADDING_RATIO)
    pos_x = W - logo_w - padding
    pos_y = H - logo_h - padding

    out = base_img.copy()
    out.paste(logo_resized, (pos_x, pos_y), logo_resized)
    out.save(os.path.join(OUT_DIR, out_name), format='PNG', optimize=True)
    print('Wrote', out_name, '->', out.size)


def main():
    ensure_out_dir()
    hero = load_image(HERO_SRC)
    logo = load_image(LOGO_SRC)
    for w, h, name in SIZES:
        base = cover_resize(hero, w, h)
        composite_logo(base, logo, name)

if __name__ == '__main__':
    main()
