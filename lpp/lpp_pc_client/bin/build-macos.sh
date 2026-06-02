#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[LPP PC] Build started..."
npm run build

echo
echo "[LPP PC] Build completed."
