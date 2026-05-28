#!/usr/bin/env bash
set -euo pipefail

# Runs the repeatable PC client regression from the repository root.
# Scope: local typecheck, production renderer/main build, and Playwright browser smoke tests.
# This script does not call business APIs, mutate server data, or print credentials.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LPP_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PC_DIR="$LPP_ROOT/lpp_pc_client"

RUN_TYPECHECK=true
RUN_BUILD=true
RUN_BROWSER=true
PASS_THROUGH_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --no-typecheck) RUN_TYPECHECK=false ;;
    --no-build) RUN_BUILD=false ;;
    --no-browser) RUN_BROWSER=false ;;
    -h|--help)
      cat <<'USAGE'
Usage: scripts/pc/test/run_pc_browser_tests.sh [options] [playwright args]

Runs the PC client automated regression:
  1. npm run typecheck
  2. npm run build
  3. npm run test:browser

Options:
  --no-typecheck  Skip TypeScript checks.
  --no-build      Skip production build.
  --no-browser    Skip Playwright browser tests.
  -h, --help      Show this help.

Any other arguments are passed to Playwright when browser tests run.
Examples:
  scripts/pc/test/run_pc_browser_tests.sh
  scripts/pc/test/run_pc_browser_tests.sh --headed
  scripts/pc/test/run_pc_browser_tests.sh tests/browser/workspace-smoke.spec.ts
USAGE
      exit 0
      ;;
    *) PASS_THROUGH_ARGS+=("$arg") ;;
  esac
done

if [ ! -d "$PC_DIR" ]; then
  echo "PC client directory not found: $PC_DIR" >&2
  exit 1
fi

if [ ! -d "$PC_DIR/node_modules" ]; then
  echo "node_modules not found. Run 'npm install' in $PC_DIR first." >&2
  exit 1
fi

cd "$PC_DIR"

if [ "$RUN_TYPECHECK" = true ]; then
  npm run typecheck
fi

if [ "$RUN_BUILD" = true ]; then
  npm run build
fi

if [ "$RUN_BROWSER" = true ]; then
  if [ "${#PASS_THROUGH_ARGS[@]}" -gt 0 ]; then
    npx playwright test "${PASS_THROUGH_ARGS[@]}"
  else
    npm run test:browser
  fi
fi

echo
echo "PC browser regression finished."
echo "Playwright HTML report: $PC_DIR/playwright-report/index.html"
