#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RUN_ANDROID=false
RUN_IOS=false
RUN_PC=false
COMMON_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --android) RUN_ANDROID=true ;;
    --ios) RUN_IOS=true ;;
    --pc) RUN_PC=true ;;
    --all) RUN_ANDROID=true; RUN_IOS=true; RUN_PC=true ;;
    --no-pub-get|--no-analyze|--no-tests|--no-build)
      COMMON_ARGS+=("$arg")
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: ../scripts/mobile/test/run_platform_tests.sh [options]

Runs platform repeatable test suites. Pick one or more targets.

Options:
  --android      Run Android suite.
  --ios          Run iOS suite.
  --pc           Run PC suite (web + host desktop).
  --all          Run Android, iOS, and PC suites.
  --no-pub-get   Forwarded to platform scripts.
  --no-analyze   Forwarded to platform scripts.
  --no-tests     Forwarded to platform scripts.
  --no-build     Forwarded to mobile platform scripts.
  -h, --help     Show this help.

Examples:
  ../scripts/mobile/test/run_platform_tests.sh --android
  ../scripts/mobile/test/run_platform_tests.sh --pc --no-pub-get
  ../scripts/mobile/test/run_platform_tests.sh --all --no-pub-get
USAGE
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [ "$RUN_ANDROID" = false ] && [ "$RUN_IOS" = false ] && [ "$RUN_PC" = false ]; then
  RUN_ANDROID=true
fi

if [ "$RUN_ANDROID" = true ]; then
  "$SCRIPT_DIR/run_android_tests.sh" "${COMMON_ARGS[@]}"
fi

if [ "$RUN_IOS" = true ]; then
  "$SCRIPT_DIR/run_ios_tests.sh" "${COMMON_ARGS[@]}"
fi

if [ "$RUN_PC" = true ]; then
  PC_ARGS=()
  for arg in "${COMMON_ARGS[@]}"; do
    if [ "$arg" != "--no-build" ]; then PC_ARGS+=("$arg"); fi
  done
  if [[ " ${COMMON_ARGS[*]} " == *" --no-build "* ]]; then
    PC_ARGS+=("--no-web" "--no-desktop")
  fi
  "$SCRIPT_DIR/run_pc_tests.sh" "${PC_ARGS[@]}"
fi

