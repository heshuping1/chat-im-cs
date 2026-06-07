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

keep_bounds="$(extract_uiautomator_bounds_by_text_regex "$xml" '保留数据|覆盖安装|替换安装')"
button_bounds="$(extract_uiautomator_bounds_by_text_regex "$xml" '继续安装|仍要安装|安装|确定')"

if [ "$keep_bounds" != "80 540 1000 640" ]; then
  echo "Expected keep-data duplicate install option bounds, got: $keep_bounds" >&2
  exit 1
fi

if [ "$button_bounds" != "760 2050 1030 2160" ]; then
  echo "Expected continue install button bounds, got: $button_bounds" >&2
  exit 1
fi

echo "install_all_android_devices shell tests passed."
