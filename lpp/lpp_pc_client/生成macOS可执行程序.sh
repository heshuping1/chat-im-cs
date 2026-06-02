#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[LPP PC] macOS packaging should be run on macOS."
  echo "[LPP PC] Current system: $(uname -s)"
  exit 1
fi

echo "[LPP PC] Building macOS DMG..."
npm run dist:mac

echo
echo "[LPP PC] macOS DMG build completed. Check the release directory."
