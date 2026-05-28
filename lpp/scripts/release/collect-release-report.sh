#!/usr/bin/env bash
set -euo pipefail

# Purpose: Collect local release-readiness evidence for the LPP version report.
# Run from: repository root or any child dir.
# Writes files: no.
# Network: no.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

echo "== LPP release evidence =="
echo "date: $(date '+%Y-%m-%d %H:%M:%S %z')"
echo "root: $ROOT"

echo
echo "== docs check =="
"$ROOT/lpp/scripts/docs/check-docs.sh"

echo
echo "== Flutter project =="
if [[ -f "$ROOT/lpp/lpp_mobile/pubspec.yaml" ]]; then
  echo "pubspec: found"
else
  echo "pubspec: missing"
fi

echo
echo "Next recommended command:"
echo "  $ROOT/lpp/scripts/test/run-flutter-checks.sh"

