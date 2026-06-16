#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LPP_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
APP_DIR="$LPP_ROOT/lpp_mobile"

CONFIG_FILE=""
DRY_RUN=false
PRINT_TEMPLATE=false
FORCE=false

KEY_DIR="${KEY_DIR:-$HOME/.android-keys/lpp}"
APP_SIGNING_ALIAS="${APP_SIGNING_ALIAS:-lpp_release}"
GOOGLE_UPLOAD_ALIAS="${GOOGLE_UPLOAD_ALIAS:-lpp_google_upload}"
CN="${CN:-StartLink}"
OU="${OU:-Mobile}"
O="${O:-StartLink}"
L="${L:-Shenzhen}"
ST="${ST:-Guangdong}"
C="${C:-CN}"
VALIDITY_DAYS="${VALIDITY_DAYS:-10000}"
KEY_SIZE="${KEY_SIZE:-4096}"
GENERATE_GOOGLE_UPLOAD_KEY="${GENERATE_GOOGLE_UPLOAD_KEY:-yes}"
WRITE_ANDROID_KEY_PROPERTIES="${WRITE_ANDROID_KEY_PROPERTIES:-yes}"

usage() {
  cat <<'USAGE'
Usage: ../scripts/mobile/package/create_android_signing_keys.sh [options]

Creates Android release signing material for China stores and, optionally, a
separate Google Play upload key. Passwords are requested locally at runtime and
are not printed.

Options:
  --config=FILE       Load signing parameters from a shell-style env file.
  --print-template    Print a parameter template, then exit.
  --dry-run           Print planned outputs without generating keys.
  --force             Allow overwriting existing generated files.
  -h, --help          Show this help.

Typical flow:
  1. create_android_signing_keys.sh --print-template > android-signing.local.env
  2. edit android-signing.local.env
  3. create_android_signing_keys.sh --config=android-signing.local.env
USAGE
}

print_template() {
  cat <<'TEMPLATE'
KEY_DIR=/Users/treesoft/.android-keys/lpp
APP_SIGNING_ALIAS=lpp_release
GOOGLE_UPLOAD_ALIAS=lpp_google_upload
CN=StartLink
OU=Mobile
O=StartLink
L=Shenzhen
ST=Guangdong
C=CN
VALIDITY_DAYS=10000
KEY_SIZE=4096
GENERATE_GOOGLE_UPLOAD_KEY=yes
WRITE_ANDROID_KEY_PROPERTIES=yes
TEMPLATE
}

for arg in "$@"; do
  case "$arg" in
    --config=*) CONFIG_FILE="${arg#--config=}" ;;
    --print-template) PRINT_TEMPLATE=true ;;
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

if [ "$PRINT_TEMPLATE" = true ]; then
  print_template
  exit 0
fi

if [ -n "$CONFIG_FILE" ]; then
  if [ ! -f "$CONFIG_FILE" ]; then
    echo "Config file not found: $CONFIG_FILE" >&2
    exit 1
  fi
  # shellcheck source=/dev/null
  source "$CONFIG_FILE"
fi

APP_KEYSTORE_FILE="${APP_KEYSTORE_FILE:-$KEY_DIR/lpp-release.jks}"
GOOGLE_UPLOAD_KEYSTORE_FILE="${GOOGLE_UPLOAD_KEYSTORE_FILE:-$KEY_DIR/lpp-google-upload.jks}"
APP_CERT_PEM="${APP_CERT_PEM:-$KEY_DIR/lpp-release-certificate.pem}"
GOOGLE_UPLOAD_CERT_PEM="${GOOGLE_UPLOAD_CERT_PEM:-$KEY_DIR/lpp-google-upload-certificate.pem}"
FINGERPRINTS_FILE="${FINGERPRINTS_FILE:-$KEY_DIR/android-signing-fingerprints.txt}"
KEY_PROPERTIES_FILE="${KEY_PROPERTIES_FILE:-$APP_DIR/android/key.properties}"
GOOGLE_UPLOAD_KEY_PROPERTIES_FILE="${GOOGLE_UPLOAD_KEY_PROPERTIES_FILE:-$KEY_DIR/key.properties.google-upload}"
DNAME="CN=$CN, OU=$OU, O=$O, L=$L, ST=$ST, C=$C"

normalize_yes_no() {
  case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" in
    yes|y|true|1) echo "yes" ;;
    no|n|false|0) echo "no" ;;
    *) echo "invalid" ;;
  esac
}

GENERATE_GOOGLE_UPLOAD_KEY="$(normalize_yes_no "$GENERATE_GOOGLE_UPLOAD_KEY")"
WRITE_ANDROID_KEY_PROPERTIES="$(normalize_yes_no "$WRITE_ANDROID_KEY_PROPERTIES")"

if [ "$GENERATE_GOOGLE_UPLOAD_KEY" = invalid ]; then
  echo "GENERATE_GOOGLE_UPLOAD_KEY must be yes or no." >&2
  exit 2
fi
if [ "$WRITE_ANDROID_KEY_PROPERTIES" = invalid ]; then
  echo "WRITE_ANDROID_KEY_PROPERTIES must be yes or no." >&2
  exit 2
fi

print_plan() {
  cat <<PLAN
Android signing plan
  App release keystore:      $APP_KEYSTORE_FILE
  App release alias:         $APP_SIGNING_ALIAS
  Google upload keystore:    $GOOGLE_UPLOAD_KEYSTORE_FILE
  Google upload alias:       $GOOGLE_UPLOAD_ALIAS
  Distinguished name:        $DNAME
  Validity days:             $VALIDITY_DAYS
  Key size:                  $KEY_SIZE
  Generate Google upload:    $GENERATE_GOOGLE_UPLOAD_KEY
  Write key.properties:      $WRITE_ANDROID_KEY_PROPERTIES
  Fingerprints output:       $FINGERPRINTS_FILE
PLAN
}

print_cmd() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
}

ensure_available() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 command not found. Install JDK/Android Studio command line tools first." >&2
    exit 127
  fi
}

ensure_new_file() {
  local path="$1"
  if [ "$FORCE" = false ] && [ -e "$path" ]; then
    echo "Refusing to overwrite existing file: $path" >&2
    echo "Pass --force if you intentionally want to replace it." >&2
    exit 1
  fi
}

read_secret() {
  local prompt="$1"
  local first=""
  local second=""
  while true; do
    read -r -s -p "$prompt: " first
    printf '\n' >&2
    read -r -s -p "Confirm $prompt: " second
    printf '\n' >&2
    if [ -z "$first" ]; then
      echo "Password cannot be empty." >&2
    elif [ "$first" != "$second" ]; then
      echo "Passwords did not match." >&2
    else
      printf '%s' "$first"
      return 0
    fi
  done
}

generate_key() {
  local keystore_file="$1"
  local alias="$2"
  local store_password="$3"
  local key_password="$4"

  print_cmd keytool -genkeypair -v -keystore "$keystore_file" -storetype JKS \
    -keyalg RSA -keysize "$KEY_SIZE" -validity "$VALIDITY_DAYS" \
    -alias "$alias" -dname "$DNAME"

  if [ "$DRY_RUN" = false ]; then
    keytool -genkeypair -v \
      -keystore "$keystore_file" \
      -storetype JKS \
      -keyalg RSA \
      -keysize "$KEY_SIZE" \
      -validity "$VALIDITY_DAYS" \
      -alias "$alias" \
      -dname "$DNAME" \
      -storepass "$store_password" \
      -keypass "$key_password"
  fi
}

export_certificate() {
  local keystore_file="$1"
  local alias="$2"
  local store_password="$3"
  local output_file="$4"

  print_cmd keytool -exportcert -rfc -keystore "$keystore_file" \
    -alias "$alias" -file "$output_file"

  if [ "$DRY_RUN" = false ]; then
    keytool -exportcert -rfc \
      -keystore "$keystore_file" \
      -alias "$alias" \
      -file "$output_file" \
      -storepass "$store_password"
  fi
}

append_fingerprints() {
  local title="$1"
  local keystore_file="$2"
  local alias="$3"
  local store_password="$4"

  if [ "$DRY_RUN" = true ]; then
    return 0
  fi

  {
    echo "[$title]"
    echo "keystore=$keystore_file"
    echo "alias=$alias"
    keytool -list -v \
      -keystore "$keystore_file" \
      -alias "$alias" \
      -storepass "$store_password" |
      grep -E 'SHA1:|SHA256:' || true
    echo
  } >> "$FINGERPRINTS_FILE"
}

write_key_properties() {
  local output_file="$1"
  local keystore_file="$2"
  local alias="$3"
  local store_password="$4"
  local key_password="$5"

  print_cmd write "$output_file"

  if [ "$DRY_RUN" = false ]; then
    umask 077
    {
      printf 'storePassword=%s\n' "$store_password"
      printf 'keyPassword=%s\n' "$key_password"
      printf 'keyAlias=%s\n' "$alias"
      printf 'storeFile=%s\n' "$keystore_file"
    } > "$output_file"
  fi
}

print_plan

if [ "$DRY_RUN" = true ]; then
  exit 0
fi

ensure_available keytool
mkdir -p "$KEY_DIR"
ensure_new_file "$APP_KEYSTORE_FILE"
ensure_new_file "$APP_CERT_PEM"
ensure_new_file "$FINGERPRINTS_FILE"
if [ "$GENERATE_GOOGLE_UPLOAD_KEY" = yes ]; then
  ensure_new_file "$GOOGLE_UPLOAD_KEYSTORE_FILE"
  ensure_new_file "$GOOGLE_UPLOAD_CERT_PEM"
fi
if [ "$WRITE_ANDROID_KEY_PROPERTIES" = yes ]; then
  ensure_new_file "$KEY_PROPERTIES_FILE"
  if [ "$GENERATE_GOOGLE_UPLOAD_KEY" = yes ]; then
    ensure_new_file "$GOOGLE_UPLOAD_KEY_PROPERTIES_FILE"
  fi
fi

APP_STORE_PASSWORD="$(read_secret "App release store password")"
APP_KEY_PASSWORD="$(read_secret "App release key password")"
generate_key "$APP_KEYSTORE_FILE" "$APP_SIGNING_ALIAS" \
  "$APP_STORE_PASSWORD" "$APP_KEY_PASSWORD"
export_certificate "$APP_KEYSTORE_FILE" "$APP_SIGNING_ALIAS" \
  "$APP_STORE_PASSWORD" "$APP_CERT_PEM"
append_fingerprints "app-release-signing-key" "$APP_KEYSTORE_FILE" \
  "$APP_SIGNING_ALIAS" "$APP_STORE_PASSWORD"

if [ "$WRITE_ANDROID_KEY_PROPERTIES" = yes ]; then
  write_key_properties "$KEY_PROPERTIES_FILE" "$APP_KEYSTORE_FILE" \
    "$APP_SIGNING_ALIAS" "$APP_STORE_PASSWORD" "$APP_KEY_PASSWORD"
fi

if [ "$GENERATE_GOOGLE_UPLOAD_KEY" = yes ]; then
  GOOGLE_UPLOAD_STORE_PASSWORD="$(read_secret "Google upload store password")"
  GOOGLE_UPLOAD_KEY_PASSWORD="$(read_secret "Google upload key password")"
  generate_key "$GOOGLE_UPLOAD_KEYSTORE_FILE" "$GOOGLE_UPLOAD_ALIAS" \
    "$GOOGLE_UPLOAD_STORE_PASSWORD" "$GOOGLE_UPLOAD_KEY_PASSWORD"
  export_certificate "$GOOGLE_UPLOAD_KEYSTORE_FILE" "$GOOGLE_UPLOAD_ALIAS" \
    "$GOOGLE_UPLOAD_STORE_PASSWORD" "$GOOGLE_UPLOAD_CERT_PEM"
  append_fingerprints "google-play-upload-key" "$GOOGLE_UPLOAD_KEYSTORE_FILE" \
    "$GOOGLE_UPLOAD_ALIAS" "$GOOGLE_UPLOAD_STORE_PASSWORD"

  if [ "$WRITE_ANDROID_KEY_PROPERTIES" = yes ]; then
    write_key_properties "$GOOGLE_UPLOAD_KEY_PROPERTIES_FILE" \
      "$GOOGLE_UPLOAD_KEYSTORE_FILE" "$GOOGLE_UPLOAD_ALIAS" \
      "$GOOGLE_UPLOAD_STORE_PASSWORD" "$GOOGLE_UPLOAD_KEY_PASSWORD"
  fi
fi

cat <<DONE
Android signing files generated.
  Fingerprints: $FINGERPRINTS_FILE
  App certificate PEM: $APP_CERT_PEM
  App Gradle key.properties: $KEY_PROPERTIES_FILE
DONE

if [ "$GENERATE_GOOGLE_UPLOAD_KEY" = yes ]; then
  cat <<DONE
  Google upload certificate PEM: $GOOGLE_UPLOAD_CERT_PEM
  Google upload key.properties sample: $GOOGLE_UPLOAD_KEY_PROPERTIES_FILE
DONE
fi
