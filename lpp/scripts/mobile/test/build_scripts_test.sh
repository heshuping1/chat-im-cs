#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/../package" && pwd)"

debug_output="$("$PACKAGE_DIR/build_debug_apk.sh" --dry-run --no-pub-get --dart-define=FOO=bar)"
release_output="$("$PACKAGE_DIR/build_release_apk.sh" --dry-run --no-pub-get --split-per-abi --dart-define=FOO=bar)"

if ! printf '%s\n' "$debug_output" | grep -q 'flutter build apk --debug --dart-define=FOO=bar'; then
  echo "Expected debug build script to print a debug APK command with dart defines." >&2
  exit 1
fi

if ! printf '%s\n' "$release_output" | grep -q 'flutter build apk --release --split-per-abi --dart-define=FOO=bar'; then
  echo "Expected release build script to print a release APK command with split ABI and dart defines." >&2
  exit 1
fi

echo "mobile build script tests passed."
