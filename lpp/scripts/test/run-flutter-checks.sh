#!/usr/bin/env bash
set -euo pipefail

# Purpose: Run Flutter static analysis and automated tests for LPP Mobile.
# Run from: repository root or any child dir.
# Writes files: Flutter/Dart tooling may update local build/cache artifacts.
# Network: no intended network access.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APP_DIR="$ROOT/lpp/lpp_mobile"

cd "$APP_DIR"

echo "== flutter analyze =="
flutter analyze

echo
echo "== flutter test ../scripts/mobile/test/flutter =="
flutter test ../scripts/mobile/test/flutter

echo
echo "Flutter checks completed."
