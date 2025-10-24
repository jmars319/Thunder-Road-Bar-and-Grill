#!/usr/bin/env python3
"""
Deduplicate consecutive duplicate paragraphs in all .md files in the repo.
Creates a .bak file (original) for any file that is changed.
Prints a list of files that were modified.
"""
import sys
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
md_files = list(root.rglob('*.md'))
ignored_dirs = {'.git','node_modules','build'}

modified = []

for p in md_files:
    # skip files in ignored dirs
    if any(part in ignored_dirs for part in p.parts):
        continue
    try:
        text = p.read_text(encoding='utf-8')
    except Exception as e:
        print(f"SKIP (read error): {p} -> {e}")
        continue
    # Normalize line endings
    text = text.replace('\r\n','\n')
    # Split into paragraphs separated by 1+ blank lines (preserve blank-lines as separator)
    parts = re.split(r'\n\s*\n', text)
    out_parts = []
    prev = None
    for part in parts:
        key = part.strip()
        if key == prev:
            # consecutive duplicate paragraph — skip
            continue
        out_parts.append(part)
        prev = key
    new_text = "\n\n".join(out_parts).rstrip()+"\n"
    if new_text != text:
        bak = p.with_suffix(p.suffix + '.bak')
        bak.write_text(text, encoding='utf-8')
        p.write_text(new_text, encoding='utf-8')
        modified.append(str(p.relative_to(root)))

if modified:
    print("MODIFIED FILES:")
    for m in modified:
        print(m)
    sys.exit(0)
else:
    print("No files needed deduping.")
    sys.exit(0)
