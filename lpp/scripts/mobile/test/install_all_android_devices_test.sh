#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LPP_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INSTALL_SCRIPT="$LPP_ROOT/scripts/mobile/dev/install_all_android_devices.sh"

export LPP_INSTALL_ANDROID_DEVICES_SOURCE_ONLY=true
# shellcheck source=/dev/null
source "$INSTALL_SCRIPT"

xml='<hierarchy>
  <node text="重复安装" resource-id="" bounds="[40,100][1040,180]" />
  <node text="清除数据后安装" resource-id="com.android.packageinstaller:id/choice_clear_data" bounds="[80,420][1000,520]" />
  <node text="保留数据安装" resource-id="com.android.packageinstaller:id/choice_keep_data" bounds="[80,540][1000,640]" />
  <node text="继续安装" resource-id="android:id/button1" bounds="[760,2050][1030,2160]" />
</hierarchy>'

reinstall_xml='<hierarchy>
  <node text="重新安装" resource-id="android:id/button1" bounds="[760,1820][1030,1930]" />
</hierarchy>'

content_desc_reinstall_xml='<hierarchy>
  <node text="" content-desc="重新安装" resource-id="android:id/button1" bounds="[720,1800][1040,1930]" />
</hierarchy>'

keep_bounds="$(extract_uiautomator_bounds_by_text_regex "$xml" "$VIVO_INSTALL_CHOICE_TEXT_REGEX")"
reinstall_bounds="$(extract_uiautomator_bounds_by_text_regex "$reinstall_xml" "$VIVO_INSTALL_CONFIRM_TEXT_REGEX")"
content_desc_reinstall_bounds="$(extract_uiautomator_bounds_by_text_regex "$content_desc_reinstall_xml" "$VIVO_INSTALL_CONFIRM_TEXT_REGEX")"
button_bounds="$(extract_uiautomator_bounds_by_text_regex "$xml" "$VIVO_INSTALL_CONFIRM_TEXT_REGEX")"

if [ "$keep_bounds" != "80 540 1000 640" ]; then
  echo "Expected keep-data duplicate install option bounds, got: $keep_bounds" >&2
  exit 1
fi

if [ "$reinstall_bounds" != "760 1820 1030 1930" ]; then
  echo "Expected reinstall/continue install button bounds, got: $reinstall_bounds" >&2
  exit 1
fi

if [ "$content_desc_reinstall_bounds" != "720 1800 1040 1930" ]; then
  echo "Expected content-desc reinstall button bounds, got: $content_desc_reinstall_bounds" >&2
  exit 1
fi

if [ "$button_bounds" != "760 2050 1030 2160" ]; then
  echo "Expected continue install button bounds, got: $button_bounds" >&2
  exit 1
fi

is_vivo_device() { return 0; }
if ! should_retry_vivo_pm_install "vivo-serial" 1 "Failure [INSTALL_FAILED_ABORTED: User rejected permissions]"; then
  echo "Expected vivo user-rejected adb install to retry with pm install" >&2
  exit 1
fi

is_vivo_device() { return 1; }
if should_retry_vivo_pm_install "other-serial" 1 "Failure [INSTALL_FAILED_ABORTED: User rejected permissions]"; then
  echo "Expected non-vivo user-rejected adb install not to retry with pm install" >&2
  exit 1
fi

echo "install_all_android_devices shell tests passed."
