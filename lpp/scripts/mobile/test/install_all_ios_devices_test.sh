#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LPP_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
INSTALL_SCRIPT="$LPP_ROOT/scripts/mobile/dev/install_all_ios_devices.sh"

export LPP_INSTALL_IOS_DEVICES_SOURCE_ONLY=true
# shellcheck source=/dev/null
source "$INSTALL_SCRIPT"

devices_output='Found 5 connected devices:
  PENM00 (mobile)          • ce8c42ac                  • android-arm64  • Android 13 (API 33)
  iPhone (mobile)          • 00008150-0018194A3C85401C • ios            • iOS 26.5.2 23F84
  Tangming的iPhone (mobile) • 00008110-000858580E9A801E • ios            • iOS 16.3.1 20D67
  macOS (desktop)          • macos                     • darwin-arm64   • macOS 26.5.2 25F84 darwin-arm64
  Chrome (web)             • chrome                    • web-javascript • Google Chrome 149.0.7827.201'

parsed="$(parse_flutter_ios_devices <<<"$devices_output")"
expected=$'00008150-0018194A3C85401C\tiPhone\tiOS 26.5.2 23F84\n00008110-000858580E9A801E\tTangming的iPhone\tiOS 16.3.1 20D67'

if [ "$parsed" != "$expected" ]; then
  echo "Expected parsed iOS devices:" >&2
  printf '%s\n' "$expected" >&2
  echo "Got:" >&2
  printf '%s\n' "$parsed" >&2
  exit 1
fi

selected="$(filter_ios_devices "00008110-000858580E9A801E" <<<"$parsed")"
expected_selected=$'00008110-000858580E9A801E\tTangming的iPhone\tiOS 16.3.1 20D67'

if [ "$selected" != "$expected_selected" ]; then
  echo "Expected selected iPhone 13, got:" >&2
  printf '%s\n' "$selected" >&2
  exit 1
fi

if filter_ios_devices "missing-device" <<<"$parsed" | grep -q .; then
  echo "Expected missing target to produce no devices" >&2
  exit 1
fi

echo "install_all_ios_devices shell tests passed."
