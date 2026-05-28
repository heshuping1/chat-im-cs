#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

RUN_PUB_GET=true
RUN_ANALYZE=true
RUN_TESTS=true
RUN_BUILD=true

for arg in "$@"; do
  case "$arg" in
    --no-pub-get) RUN_PUB_GET=false ;;
    --no-analyze) RUN_ANALYZE=false ;;
    --no-tests) RUN_TESTS=false ;;
    --no-build) RUN_BUILD=false ;;
    -h|--help)
      cat <<'USAGE'
Usage: ../scripts/mobile/test/run_ios_tests.sh [options]

Runs the repeatable iOS regression suite:
  1. flutter pub get
  2. flutter analyze --no-fatal-warnings --no-fatal-infos lib ../scripts/mobile/test/flutter
  3. flutter test ../scripts/mobile/test/flutter
  4. flutter build ios --debug --no-codesign

Options:
  --no-pub-get   Skip flutter pub get.
  --no-analyze   Skip analyze.
  --no-tests     Skip Flutter tests.
  --no-build     Skip iOS build.
  -h, --help     Show this help.
USAGE
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

cd_root
ensure_flutter

if [ "$(host_os)" != "macos" ]; then
  echo "iOS build requires macOS. Current host: $(host_os)." >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild command not found; install full Xcode to build iOS." >&2
  exit 127
fi

if [ "$RUN_PUB_GET" = true ]; then run_pub_get; fi
if [ "$RUN_ANALYZE" = true ]; then run_project_analyze; fi
if [ "$RUN_TESTS" = true ]; then run_project_tests; fi
if [ "$RUN_BUILD" = true ]; then
  flutter build ios --debug --no-codesign
fi
