#!/usr/bin/env bash
set -euo pipefail

LPP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APP_DIR="$LPP_ROOT/lpp_mobile"
cd "$APP_DIR"

RUN_PUB_GET=true
RUN_ANALYZE=true
RUN_ALL_TESTS=false
COVERAGE=false

for arg in "$@"; do
  case "$arg" in
    --no-pub-get)
      RUN_PUB_GET=false
      ;;
    --no-analyze)
      RUN_ANALYZE=false
      ;;
    --all)
      RUN_ALL_TESTS=true
      ;;
    --coverage)
      COVERAGE=true
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: ../scripts/mobile/test/run_automated_tests.sh [options]

Options:
  --no-pub-get   Skip flutter pub get.
  --no-analyze   Skip flutter analyze.
  --all          Run all Flutter tests under ../scripts/mobile/test/flutter instead of automated only.
  --coverage     Collect coverage for flutter test.
  -h, --help     Show this help.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

if ! command -v flutter >/dev/null 2>&1; then
  echo "flutter command not found. Please add Flutter SDK to PATH." >&2
  exit 127
fi

if [ "$RUN_PUB_GET" = true ]; then
  flutter pub get
fi

if [ "$RUN_ANALYZE" = true ]; then
  flutter analyze --no-fatal-warnings --no-fatal-infos lib
fi

TEST_TARGET="../scripts/mobile/test/flutter/automated"
if [ "$RUN_ALL_TESTS" = true ]; then
  TEST_TARGET="../scripts/mobile/test/flutter"
fi

TEST_ARGS=()
if [ "$COVERAGE" = true ]; then
  TEST_ARGS+=(--coverage)
fi

if [ "${#TEST_ARGS[@]}" -gt 0 ]; then
  flutter test "$TEST_TARGET" "${TEST_ARGS[@]}"
else
  flutter test "$TEST_TARGET"
fi
