#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[LPP PC] Starting PC client in dev mode..."
echo "[LPP PC] If port 5173 is already in use, close the existing dev instance or Electron window first."
npm run dev
