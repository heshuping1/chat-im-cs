#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/../package" && pwd)"

debug_output="$("$PACKAGE_DIR/build_debug_apk.sh" --dry-run --no-pub-get --dart-define=FOO=bar)"
release_output="$("$PACKAGE_DIR/build_release_apk.sh" --dry-run --no-pub-get --split-per-abi --dart-define=FOO=bar)"
signing_template="$("$PACKAGE_DIR/create_android_signing_keys.sh" --print-template)"

if ! printf '%s\n' "$debug_output" | grep -q 'flutter build apk --debug --dart-define=FOO=bar'; then
  echo "Expected debug build script to print a debug APK command with dart defines." >&2
  exit 1
fi

if ! printf '%s\n' "$release_output" | grep -q 'flutter build apk --release --split-per-abi --dart-define=FOO=bar'; then
  echo "Expected release build script to print a release APK command with split ABI and dart defines." >&2
  exit 1
fi

for required_param in \
  KEY_DIR \
  APP_SIGNING_ALIAS \
  GOOGLE_UPLOAD_ALIAS \
  CN \
  OU \
  O \
  L \
  ST \
  C \
  VALIDITY_DAYS \
  KEY_SIZE \
  GENERATE_GOOGLE_UPLOAD_KEY; do
  if ! printf '%s\n' "$signing_template" | grep -q "^$required_param="; then
    echo "Expected signing parameter template to include $required_param." >&2
    exit 1
  fi
done

tmp_config="$(mktemp)"
trap 'rm -f "$tmp_config"' EXIT
printf '%s\n' \
  'KEY_DIR=/tmp/lpp-signing-test' \
  'APP_SIGNING_ALIAS=lpp_release' \
  'GOOGLE_UPLOAD_ALIAS=lpp_google_upload' \
  'CN=StartLink' \
  'OU=Mobile' \
  'O=StartLink' \
  'L=Shenzhen' \
  'ST=Guangdong' \
  'C=CN' \
  'VALIDITY_DAYS=10000' \
  'KEY_SIZE=4096' \
  'GENERATE_GOOGLE_UPLOAD_KEY=yes' > "$tmp_config"

signing_dry_run="$("$PACKAGE_DIR/create_android_signing_keys.sh" --dry-run --config="$tmp_config")"
if ! printf '%s\n' "$signing_dry_run" | grep -q 'lpp-release.jks'; then
  echo "Expected signing dry-run to mention the app release keystore." >&2
  exit 1
fi
if ! printf '%s\n' "$signing_dry_run" | grep -q 'lpp-google-upload.jks'; then
  echo "Expected signing dry-run to mention the Google upload keystore." >&2
  exit 1
fi

echo "mobile build script tests passed."
