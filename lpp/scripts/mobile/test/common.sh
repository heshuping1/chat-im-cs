#!/usr/bin/env bash
set -euo pipefail

LPP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APP_DIR="$LPP_ROOT/lpp_mobile"

cd_root() {
  cd "$APP_DIR"
}

ensure_flutter() {
  if ! command -v flutter >/dev/null 2>&1; then
    echo "flutter command not found. Please add Flutter SDK to PATH." >&2
    exit 127
  fi
}

run_pub_get() {
  flutter pub get
}

run_project_analyze() {
  flutter analyze --no-fatal-warnings --no-fatal-infos lib
}

run_project_tests() {
  flutter test ../scripts/mobile/test/flutter
}

host_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux) echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}
