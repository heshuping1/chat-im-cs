#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

RUN_PUB_GET=true
RUN_ANALYZE=true
RUN_TESTS=true
RUN_BUILD=true
RUN_INSTALL=false
RUN_LAUNCH=false
RUN_LAUNCH_ONLY=false
DEVICE_ID=""

for arg in "$@"; do
  case "$arg" in
    --no-pub-get) RUN_PUB_GET=false ;;
    --no-analyze) RUN_ANALYZE=false ;;
    --no-tests) RUN_TESTS=false ;;
    --no-build) RUN_BUILD=false ;;
    --install) RUN_INSTALL=true ;;
    --launch) RUN_INSTALL=true; RUN_LAUNCH=true ;;
    --launch-only) RUN_LAUNCH=true; RUN_LAUNCH_ONLY=true ;;
    --device=*) DEVICE_ID="${arg#--device=}" ;;
    -h|--help)
      cat <<'USAGE'
Usage: ../scripts/mobile/test/run_android_tests.sh [options]

Runs the repeatable Android regression suite:
  1. flutter pub get
  2. flutter analyze --no-fatal-warnings --no-fatal-infos lib ../scripts/mobile/test/flutter
  3. flutter test ../scripts/mobile/test/flutter
  4. flutter build apk --debug
  5. optional adb install / launch smoke test

Options:
  --no-pub-get   Skip flutter pub get.
  --no-analyze   Skip analyze.
  --no-tests     Skip Flutter tests.
  --no-build     Skip APK build.
  --install      Install debug APK to connected Android device.
  --launch       Install and launch app with adb monkey.
  --launch-only  Launch already installed app without reinstalling.
  --device=ID    adb device id for install/launch.
  -h, --help     Show this help.
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
if [ "$RUN_BUILD" = true ]; then
  if [ "$(host_os)" = "macos" ]; then
    DEVELOPER_DIR="${DEVELOPER_DIR:-/Library/Developer/CommandLineTools}" \
      flutter build apk --debug
  else
    flutter build apk --debug
  fi
fi

adb_cmd() {
  if [ -n "$DEVICE_ID" ]; then
    adb -s "$DEVICE_ID" "$@"
  else
    adb "$@"
  fi
}

if [ "$RUN_INSTALL" = true ] || [ "$RUN_LAUNCH_ONLY" = true ]; then
  if ! command -v adb >/dev/null 2>&1; then
    echo "adb command not found; cannot run Android device smoke test." >&2
    exit 127
  fi
fi

if [ "$RUN_INSTALL" = true ]; then
  adb_cmd install -r build/app/outputs/flutter-apk/app-debug.apk
fi

if [ "$RUN_LAUNCH" = true ]; then
  adb_cmd shell monkey -p com.lpp.mobile \
    -c android.intent.category.LAUNCHER 1
  sleep 2
  if ! adb_cmd shell pidof com.lpp.mobile >/dev/null; then
    echo "App process com.lpp.mobile is not running after launch." >&2
    exit 1
  fi
fi
