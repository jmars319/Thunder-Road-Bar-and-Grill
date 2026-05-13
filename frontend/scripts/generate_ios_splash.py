#!/usr/bin/env python3
"""
Generate iOS splash images referenced in frontend/index.html
by cover-resizing the canonical hero image and saving PNGs to
frontend/public/ with the exact filenames referenced.

Usage: run from repo root with the project venv python:
  ./.venv/bin/python frontend/scripts/generate_ios_splash.py
"""
import os, re, sys
from PIL import Image

# Resolve repo root and paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
INDEX_HTML = os.path.join(REPO_ROOT, 'frontend', 'index.html')
OUT_DIR = os.path.join(REPO_ROOT, 'frontend', 'public', 'splash')
HERO_SRC = os.path.join(REPO_ROOT, 'backend', 'uploads', '1760554663370.jpg')

if not os.path.exists(INDEX_HTML):
    print('index.html not found at', INDEX_HTML)
    sys.exit(1)
if not os.path.exists(HERO_SRC):
    print('hero source not found at', HERO_SRC)
    sys.exit(1)

html = open(INDEX_HTML, 'r', encoding='utf-8').read()
# find all apple-splash filenames referenced
# look for patterns like apple-splash-2048x2732.png or apple-splash-landscape-2732x2048.png
filenames = set(re.findall(r'apple-splash[-\w]*-\d+x\d+\.png', html))
if not filenames:
    print('No apple-splash references found in index.html')
    sys.exit(0)

print('Found', len(filenames), 'splash references')
for fn in sorted(filenames):
    print(' ', fn)

# helper: cover resize
def cover_resize(img, target_w, target_h):
    src_w, src_h = img.size
    src_ratio = src_w / src_h
    target_ratio = target_w / target_h
    if src_ratio > target_ratio:
        # source wider -> fit height
        scale = target_h / src_h
    else:
        scale = target_w / src_w
    new_w = max(1, int(src_w * scale + 0.5))
    new_h = max(1, int(src_h * scale + 0.5))
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    left = max(0, (new_w - target_w)//2)
    top = max(0, (new_h - target_h)//2)
    return img_resized.crop((left, top, left+target_w, top+target_h))

hero = Image.open(HERO_SRC).convert('RGBA')
os.makedirs(OUT_DIR, exist_ok=True)
created = []
for fn in sorted(filenames):
    m = re.search(r'(\d+)x(\d+)', fn)
    if not m:
        print('Skipping (no WxH found):', fn)
        continue
    w = int(m.group(1))
    h = int(m.group(2))
    out_path = os.path.join(OUT_DIR, fn)
    print('Generating', fn, '->', '%dx%d' % (w,h))
    out_img = cover_resize(hero, w, h)
    out_img.save(out_path, format='PNG', optimize=True)
    created.append(out_path)

print('\nGenerated %d files' % len(created))
for p in created:
    print(' ', os.path.basename(p), os.path.getsize(p))

# Optionally run optipng from script if available
optipng_path = '/opt/homebrew/bin/optipng'
if os.path.exists(optipng_path):
    print('\nRunning optipng on generated files...')
    import subprocess
    for p in created:
        subprocess.run([optipng_path, '-o7', p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('optipng completed')
else:
    print('\noptipng not found at', optipng_path, '\nYou can optimize these PNGs with optipng later.')
