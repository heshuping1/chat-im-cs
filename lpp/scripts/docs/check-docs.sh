#!/usr/bin/env bash
set -euo pipefail

# Purpose: Check the LPP ECC documentation structure, local markdown links,
# and unresolved placeholders.
# Run from: repository root (/Users/eric/Downloads/lpp-flutte) or any child dir.
# Writes files: no.
# Network: no.
# Strict mode: pass --strict to fail when unresolved placeholders are found.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DOCS_DIR="$ROOT/lpp/docs"
STRICT=false

if [[ "${1:-}" == "--strict" ]]; then
  STRICT=true
fi

echo "== LPP docs files =="
find "$DOCS_DIR" -type f | sort

echo
echo "== Markdown local link check =="
python3 - "$ROOT" <<'PY'
from pathlib import Path
import re
import sys
import urllib.parse

root = Path(sys.argv[1])
docs = root / "lpp" / "docs"
problems = []
for path in docs.rglob("*.md"):
    text = path.read_text(errors="ignore")
    for match in re.finditer(r"\[[^\]]+\]\(([^)]+)\)", text):
        target = match.group(1).strip().split("#", 1)[0]
        if not target or target.startswith(("http://", "https://", "mailto:", "#", "/")):
            continue
        target = urllib.parse.unquote(target)
        if not (path.parent / target).exists():
            problems.append((path.relative_to(root), target))

for path, target in problems:
    print(f"{path}: missing {target}")
print(f"missing_count={len(problems)}")
sys.exit(1 if problems else 0)
PY

echo
echo "== Unresolved markers =="
set +e
rg -n "待填写|待确认|未执行|待细化|需确认|TBD|TODO" "$DOCS_DIR"
MARKER_STATUS=$?
set -e

if [[ "$MARKER_STATUS" -eq 0 && "$STRICT" == true ]]; then
  echo
  echo "Unresolved markers found in strict mode."
  exit 1
fi

echo
echo "Docs check completed."

