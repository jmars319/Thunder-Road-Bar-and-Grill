#!/usr/bin/env python3
"""
Simple link-checker for local Markdown files.
- Scans all .md files under the repo root (excluding .git and node_modules).
- Finds markdown links of the form [text](target).
- For targets that look like local paths (not starting with http://, https://, mailto:, #),
  it checks whether the file exists relative to the linking file or as repo-root-relative.
- Prints a summary and exits with code 0 if no broken links, 2 if broken links found.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IGNORE_DIRS = {'.git', 'node_modules', '.venv'}

link_re = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")

broken = []
checked = 0

for md in ROOT.rglob('*.md'):
    if any(p in md.parts for p in IGNORE_DIRS):
        continue
    try:
        text = md.read_text(encoding='utf-8')
    except Exception:
        continue
    for m in link_re.finditer(text):
        target = m.group(2).strip()
        # ignore anchors and absolute urls and mailto
        if target.startswith('http://') or target.startswith('https://') or target.startswith('mailto:') or target.startswith('#'):
            continue
        # Strip any title part (e.g., link.md "title")
        if ' ' in target and not target.startswith('./') and not target.startswith('../'):
            # keep it simple; only split if looks like path with space and a quoted title
            pass
        # Remove any anchor from target
        target_path = target.split('#', 1)[0]
        # If the target is an absolute-like path within repo (starts with /), treat as repo-root relative
        if target_path.startswith('/'):
            candidate = ROOT.joinpath(target_path.lstrip('/'))
            checked += 1
            if not candidate.exists():
                broken.append((md.relative_to(ROOT), target, str(candidate)))
            continue
        # Try resolving relative to the md file
        candidate = (md.parent / target_path).resolve()
        checked += 1
        if not candidate.exists():
            # Try repo-root relative
            candidate2 = (ROOT / target_path).resolve()
            if not candidate2.exists():
                broken.append((md.relative_to(ROOT), target, str(candidate)))

# Print results
if broken:
    print(f"Found {len(broken)} broken local link(s) (checked ~{checked} local targets):\n")
    for src, tgt, cand in broken:
        print(f"- {src}: {tgt} -> missing ({cand})")
    sys.exit(2)
else:
    print(f"No broken local markdown links found (checked ~{checked} targets)")
    sys.exit(0)
