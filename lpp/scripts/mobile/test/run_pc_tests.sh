#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

RUN_PUB_GET=true
RUN_ANALYZE=true
RUN_TESTS=true
RUN_WEB_BUILD=true
RUN_DESKTOP_BUILD=true
DESKTOP_TARGET="auto"

for arg in "$@"; do
  case "$arg" in
    --no-pub-get) RUN_PUB_GET=false ;;
    --no-analyze) RUN_ANALYZE=false ;;
    --no-tests) RUN_TESTS=false ;;
    --no-web) RUN_WEB_BUILD=false ;;
    --no-desktop) RUN_DESKTOP_BUILD=false ;;
    --desktop=*) DESKTOP_TARGET="${arg#--desktop=}" ;;
    -h|--help)
      cat <<'USAGE'
Usage: ../scripts/mobile/test/run_pc_tests.sh [options]

Runs the repeatable PC regression suite:
  1. flutter pub get
  2. flutter analyze --no-fatal-warnings --no-fatal-infos lib ../scripts/mobile/test/flutter
  3. flutter test ../scripts/mobile/test/flutter
  4. flutter build web --debug
  5. flutter build <host desktop> --debug when supported by current host

Options:
  --no-pub-get      Skip flutter pub get.
  --no-analyze      Skip analyze.
  --no-tests        Skip Flutter tests.
  --no-web          Skip web build.
  --no-desktop      Skip host desktop build.
  --desktop=TARGET  auto|macos|windows|linux.
  -h, --help        Show this help.
USAGE
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

cd_root
ensure_flutter

if [ "$RUN_PUB_GET" = true ]; then run_pub_get; fi
if [ "$RUN_ANALYZE" = true ]; then run_project_analyze; fi
if [ "$RUN_TESTS" = true ]; then run_project_tests; fi
if [ "$RUN_WEB_BUILD" = true ]; then flutter build web --debug; fi

if [ "$RUN_DESKTOP_BUILD" = true ]; then
  target="$DESKTOP_TARGET"
  if [ "$target" = "auto" ]; then target="$(host_os)"; fi
  case "$target" in
    macos)
      if [ "$(host_os)" != "macos" ]; then
        echo "macOS desktop build requires macOS host." >&2
        exit 1
      fi
      flutter build macos --debug
      ;;
    windows)
      if [ "$(host_os)" != "windows" ]; then
        echo "Windows desktop build requires Windows host." >&2
        exit 1
      fi
      flutter build windows --debug
      ;;
    linux)
      if [ "$(host_os)" != "linux" ]; then
        echo "Linux desktop build requires Linux host." >&2
        exit 1
      fi
      flutter build linux --debug
      ;;
    unknown)
      echo "Unknown host; skipping desktop build." >&2
      exit 1
      ;;
    *)
      echo "Unsupported desktop target: $target" >&2
      exit 2
      ;;
  esac
fi
