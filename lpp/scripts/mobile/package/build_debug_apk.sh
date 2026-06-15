#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LPP_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
APP_DIR="$LPP_ROOT/lpp_mobile"

RUN_PUB_GET=true
RUN_CLEAN=false
DRY_RUN=false
FLUTTER_BUILD_ARGS=(apk --debug)

usage() {
  cat <<'USAGE'
Usage: ../scripts/mobile/package/build_debug_apk.sh [options]

Builds the Android debug APK from lpp_mobile.

Options:
  --clean                         Run flutter clean before building.
  --no-pub-get                    Skip flutter pub get.
  --dry-run                       Print commands without running them.
  --dart-define=KEY=VALUE         Forward a Dart define to flutter build.
  --dart-define-from-file=FILE    Forward a Dart define file to flutter build.
  --build-name=VERSION            Forward build name, for example 1.0.0.
  --build-number=NUMBER           Forward build number, for example 100.
  -h, --help                      Show this help.

Output:
  build/app/outputs/flutter-apk/app-debug.apk
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --clean) RUN_CLEAN=true ;;
    --no-pub-get) RUN_PUB_GET=false ;;
    --dry-run) DRY_RUN=true ;;
    --dart-define=*) FLUTTER_BUILD_ARGS+=("$arg") ;;
    --dart-define-from-file=*) FLUTTER_BUILD_ARGS+=("$arg") ;;
    --build-name=*) FLUTTER_BUILD_ARGS+=("$arg") ;;
    --build-number=*) FLUTTER_BUILD_ARGS+=("$arg") ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

print_cmd() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
}

run_cmd() {
  print_cmd "$@"
  if [ "$DRY_RUN" = false ]; then
    "$@"
  fi
}

if ! command -v flutter >/dev/null 2>&1; then
  echo "flutter command not found. Please add Flutter SDK to PATH." >&2
  exit 127
fi

run_cmd cd "$APP_DIR"
cd "$APP_DIR"

if [ "$RUN_CLEAN" = true ]; then
  run_cmd flutter clean
fi

if [ "$RUN_PUB_GET" = true ]; then
  run_cmd flutter pub get
fi

run_cmd flutter build "${FLUTTER_BUILD_ARGS[@]}"

echo "Debug APK: $APP_DIR/build/app/outputs/flutter-apk/app-debug.apk"
