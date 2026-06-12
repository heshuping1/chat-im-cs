#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LPP_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
APP_DIR="$LPP_ROOT/lpp_mobile"
PACKAGE_NAME="com.startlink.lite"

BUILD_MODE="debug"
RUN_BUILD=true
RUN_PUB_GET=true
LAUNCH=true
APK_PATH=""
INSTALL_METHOD="adb"
AUTO_CONFIRM_VIVO=true
VIVO_INSTALL_CHOICE_TEXT_REGEX="保留数据安装|保留数据|覆盖安装|替换安装"
VIVO_INSTALL_CONFIRM_TEXT_REGEX="继续安装|仍要安装|^安装$|重新安装|重新安装应用|重新安裝|重新安裝應用|从新安装|重装|确定|允许"

is_guided_install_device_brand() {
  local brand="$1"
  local manufacturer="$2"
  local normalized

  normalized="$(printf '%s %s' "$brand" "$manufacturer" |
    tr -d '\r' |
    tr '[:upper:]' '[:lower:]')"
  case "$normalized" in
    *vivo*|*iqoo*|*oppo*|*oplus*|*oneplus*) return 0 ;;
    *) return 1 ;;
  esac
}

extract_uiautomator_bounds_by_resource_id_from_xml() {
  local xml="$1"
  local resource_id="$2"
  local node

  node="$(printf '%s\n' "$xml" |
    grep -o '<node [^>]*>' |
    grep "resource-id=\"$resource_id\"" |
    tail -n 1 || true)"
  printf '%s' "$node" |
    sed -n 's/.*bounds="\[\([0-9]*\),\([0-9]*\)\]\[\([0-9]*\),\([0-9]*\)\]".*/\1 \2 \3 \4/p'
}

extract_uiautomator_bounds_by_text_regex() {
  local xml="$1"
  local text_regex="$2"
  local node

  node="$(printf '%s\n' "$xml" |
    grep -o '<node [^>]*>' |
    grep -E "(text|content-desc)=\"[^\"]*($text_regex)[^\"]*\"" |
    tail -n 1 || true)"
  printf '%s' "$node" |
    sed -n 's/.*bounds="\[\([0-9]*\),\([0-9]*\)\]\[\([0-9]*\),\([0-9]*\)\]".*/\1 \2 \3 \4/p'
}

should_retry_vivo_pm_install() {
  local serial="$1"
  local install_status="$2"
  local install_output="$3"

  if [ "$install_status" -eq 0 ]; then
    return 1
  fi
  if ! is_vivo_device "$serial"; then
    return 1
  fi
  printf '%s\n' "$install_output" |
    grep -Eq 'INSTALL_FAILED_ABORTED|User rejected permissions'
}

if [ "${LPP_INSTALL_ANDROID_DEVICES_SOURCE_ONLY:-false}" = true ]; then
  return 0 2>/dev/null || exit 0
fi

usage() {
  cat <<'USAGE'
Usage: ../scripts/mobile/dev/install_all_android_devices.sh [options]

Builds the LPP Mobile Android APK and installs it to every connected physical
Android device reported by adb. Flutter desktop/web targets such as macos and
chrome are not considered because this script reads adb devices only.

Options:
  --debug       Build and install the debug APK. Default.
  --release     Build and install the release APK.
  --apk=PATH    Install an existing APK instead of using the default output path.
  --method=adb  Install with adb install. Default.
  --method=pm   Push APK and install with adb shell pm install.
  --no-build    Skip flutter build and install the existing APK.
  --no-pub-get  Skip flutter pub get before build.
  --launch      Launch com.startlink.lite after installing. Default.
  --no-launch   Do not launch com.lpp.mobile after installing.
  --no-auto-confirm
               Do not auto-tap Android vendor install confirmation prompts.
  -h, --help    Show this help.

Examples:
  ../scripts/mobile/dev/install_all_android_devices.sh
  ../scripts/mobile/dev/install_all_android_devices.sh --release
  ../scripts/mobile/dev/install_all_android_devices.sh --no-build --apk=build/app/outputs/flutter-apk/app-debug.apk
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --debug) BUILD_MODE="debug" ;;
    --release) BUILD_MODE="release" ;;
    --apk=*) APK_PATH="${arg#--apk=}" ;;
    --method=adb) INSTALL_METHOD="adb" ;;
    --method=pm) INSTALL_METHOD="pm" ;;
    --no-build) RUN_BUILD=false ;;
    --no-pub-get) RUN_PUB_GET=false ;;
    --launch) LAUNCH=true ;;
    --no-launch) LAUNCH=false ;;
    --no-auto-confirm) AUTO_CONFIRM_VIVO=false ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v adb >/dev/null 2>&1; then
  echo "adb command not found. Please add Android platform-tools to PATH." >&2
  exit 127
fi

if [ "$RUN_BUILD" = true ] && ! command -v flutter >/dev/null 2>&1; then
  echo "flutter command not found. Please add Flutter SDK to PATH." >&2
  exit 127
fi

cd "$APP_DIR"

if [ "$RUN_PUB_GET" = true ] && [ "$RUN_BUILD" = true ]; then
  flutter pub get
fi

if [ "$RUN_BUILD" = true ]; then
  flutter build apk "--$BUILD_MODE"
fi

if [ -z "$APK_PATH" ]; then
  APK_PATH="build/app/outputs/flutter-apk/app-$BUILD_MODE.apk"
fi

if [ ! -f "$APK_PATH" ]; then
  echo "APK not found: $APK_PATH" >&2
  exit 1
fi

ADB_LINES=()
while IFS= read -r line; do
  ADB_LINES+=("$line")
done < <(adb devices | awk 'NR > 1 && NF >= 2 {print $1" "$2}')

if [ "${#ADB_LINES[@]}" -eq 0 ]; then
  echo "No adb devices found. Connect Android phones and run: adb devices" >&2
  exit 1
fi

PHYSICAL_DEVICES=()

for line in "${ADB_LINES[@]}"; do
  serial="${line%% *}"
  state="${line#* }"

  if [ "$state" != "device" ]; then
    echo "Skip $serial: adb state is $state"
    continue
  fi

  if adb -s "$serial" shell getprop ro.kernel.qemu 2>/dev/null | tr -d '\r' | grep -qx "1"; then
    echo "Skip $serial: emulator"
    continue
  fi

  model="$(adb -s "$serial" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || true)"
  echo "Target $serial${model:+ ($model)}"
  PHYSICAL_DEVICES+=("$serial")
done

if [ "${#PHYSICAL_DEVICES[@]}" -eq 0 ]; then
  echo "No online physical Android devices found." >&2
  exit 1
fi

is_vivo_device() {
  local serial="$1"
  local brand manufacturer
  brand="$(adb -s "$serial" shell getprop ro.product.brand 2>/dev/null | tr -d '\r' | tr '[:upper:]' '[:lower:]' || true)"
  manufacturer="$(adb -s "$serial" shell getprop ro.product.manufacturer 2>/dev/null | tr -d '\r' | tr '[:upper:]' '[:lower:]' || true)"
  case "$brand $manufacturer" in
    *vivo*|*iqoo*) return 0 ;;
    *) return 1 ;;
  esac
}

is_guided_install_device() {
  local serial="$1"
  local brand manufacturer
  brand="$(adb -s "$serial" shell getprop ro.product.brand 2>/dev/null || true)"
  manufacturer="$(adb -s "$serial" shell getprop ro.product.manufacturer 2>/dev/null || true)"
  is_guided_install_device_brand "$brand" "$manufacturer"
}

auto_confirm_vivo_install_prompt() {
  local serial="$1"

  sleep 1
  for _ in $(seq 1 60); do
    tap_vivo_installer_text_regex "$serial" "$VIVO_INSTALL_CHOICE_TEXT_REGEX" "50" "74"
    sleep 0.2
    tap_vivo_installer_control "$serial" "com.android.packageinstaller:id/deleted_file_state_cb" "50" "87"
    sleep 0.2
    tap_vivo_installer_control "$serial" "android:id/button1" "50" "93"
    sleep 0.2
    tap_vivo_installer_text_regex "$serial" "$VIVO_INSTALL_CONFIRM_TEXT_REGEX" "78" "93"
    sleep 1
  done
}

tap_vivo_installer_control() {
  local serial="$1"
  local resource_id="$2"
  local fallback_x_percent="$3"
  local fallback_y_percent="$4"
  local xml bounds x1 y1 x2 y2 x y size width height

  xml="$(adb -s "$serial" shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 && adb -s "$serial" shell cat /sdcard/window.xml | tr -d '\r' || true)"
  bounds="$(extract_uiautomator_bounds_by_resource_id_from_xml "$xml" "$resource_id")"

  if [ -n "$bounds" ]; then
    read -r x1 y1 x2 y2 <<<"$bounds"
    x=$(((x1 + x2) / 2))
    y=$(((y1 + y2) / 2))
  else
    size="$(adb -s "$serial" shell wm size 2>/dev/null | awk -F': ' '/Physical size/ {print $2}' | tr -d '\r' || true)"
    if [[ "$size" =~ ^[0-9]+x[0-9]+$ ]]; then
      width="${size%x*}"
      height="${size#*x}"
      x=$((width * fallback_x_percent / 100))
      y=$((height * fallback_y_percent / 100))
    else
      x=540
      y=2220
    fi
  fi

  adb -s "$serial" shell input tap "$x" "$y" >/dev/null 2>&1 || true
}

tap_vivo_installer_text_regex() {
  local serial="$1"
  local text_regex="$2"
  local fallback_x_percent="$3"
  local fallback_y_percent="$4"
  local xml bounds x1 y1 x2 y2 x y size width height

  xml="$(adb -s "$serial" shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 && adb -s "$serial" shell cat /sdcard/window.xml | tr -d '\r' || true)"
  bounds="$(extract_uiautomator_bounds_by_text_regex "$xml" "$text_regex")"

  if [ -n "$bounds" ]; then
    read -r x1 y1 x2 y2 <<<"$bounds"
    x=$(((x1 + x2) / 2))
    y=$(((y1 + y2) / 2))
  else
    size="$(adb -s "$serial" shell wm size 2>/dev/null | awk -F': ' '/Physical size/ {print $2}' | tr -d '\r' || true)"
    if [[ "$size" =~ ^[0-9]+x[0-9]+$ ]]; then
      width="${size%x*}"
      height="${size#*x}"
      x=$((width * fallback_x_percent / 100))
      y=$((height * fallback_y_percent / 100))
    else
      x=540
      y=2220
    fi
  fi

  adb -s "$serial" shell input tap "$x" "$y" >/dev/null 2>&1 || true
}

run_install_command() {
  local serial="$1"
  shift
  local confirm_pid=""
  local status

  if [ "$AUTO_CONFIRM_VIVO" = true ] && is_guided_install_device "$serial"; then
    echo "Auto-confirm enabled for vendor install prompts on $serial"
    auto_confirm_vivo_install_prompt "$serial" &
    confirm_pid="$!"
  fi

  set +e
  "$@"
  status=$?
  set -e

  if [ -n "$confirm_pid" ]; then
    kill "$confirm_pid" >/dev/null 2>&1 || true
    wait "$confirm_pid" >/dev/null 2>&1 || true
  fi

  return "$status"
}

install_with_pm() {
  local serial="$1"
  local remote_apk="/data/local/tmp/lpp-mobile-$BUILD_MODE.apk"
  local install_status=0

  if adb -s "$serial" push "$APK_PATH" "$remote_apk"; then
    run_install_command "$serial" adb -s "$serial" shell pm install -r -d "$remote_apk" || install_status=$?
  else
    install_status=$?
  fi
  adb -s "$serial" shell rm -f "$remote_apk" >/dev/null 2>&1 || true
  return "$install_status"
}

install_with_adb_or_vivo_pm_fallback() {
  local serial="$1"
  local install_output
  local install_status

  set +e
  install_output="$(run_install_command "$serial" adb -s "$serial" install -r -d "$APK_PATH" 2>&1)"
  install_status=$?
  set -e

  if [ -n "$install_output" ]; then
    printf '%s\n' "$install_output"
  fi

  if should_retry_vivo_pm_install "$serial" "$install_status" "$install_output"; then
    echo "adb install was rejected by vivo/iQOO installer on $serial; retrying with pm install..."
    install_with_pm "$serial"
    return $?
  fi

  return "$install_status"
}

echo "Installing $APK_PATH to ${#PHYSICAL_DEVICES[@]} physical Android device(s)..."

failures=0
for serial in "${PHYSICAL_DEVICES[@]}"; do
  echo "Installing to $serial ..."
  install_status=0
  if [ "$INSTALL_METHOD" = "pm" ]; then
    install_with_pm "$serial" || install_status=$?
  else
    install_with_adb_or_vivo_pm_fallback "$serial" || install_status=$?
  fi

  if [ "$install_status" -eq 0 ]; then
    echo "Installed to $serial"
    if [ "$LAUNCH" = true ]; then
      adb -s "$serial" shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null
      echo "Launched on $serial"
    fi
  else
    echo "Install failed on $serial" >&2
    failures=$((failures + 1))
  fi
done

if [ "$failures" -gt 0 ]; then
  echo "$failures device install(s) failed." >&2
  exit 1
fi

echo "All physical Android devices installed successfully."
