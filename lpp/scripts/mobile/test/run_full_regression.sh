#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

REPEAT=1
CONCURRENCY=1
REPORT_ROOT="$LPP_ROOT/reports/mobile/full-regression/$(date +%Y%m%d_%H%M%S)"

RUN_DOCS=true
RUN_PUB_GET=true
RUN_ANALYZE=true
RUN_TESTS=true
RUN_DEBUG_BUILD=true
RUN_RELEASE_BUILD=false
RUN_INSTALL=false
RUN_LAUNCH=false
RUN_CLEAN=false
CONTINUE_ON_FAIL=false

DEVICE_ID=""
S3_CONFIGFILE_URL="${LPP_S3_CONFIGFILE_URL:-}"
TEST_TARGET="../scripts/mobile/test/flutter"

usage() {
  cat <<'USAGE'
Usage: ../scripts/mobile/test/run_full_regression.sh [options]

Repeatable full mobile regression entrypoint. It writes per-step logs and a
summary report under reports/mobile/full-regression/<timestamp>/.

Default steps per iteration:
  1. docs structure/link check
  2. flutter pub get
  3. flutter analyze --no-fatal-warnings --no-fatal-infos
  4. flutter test --concurrency=1 ../scripts/mobile/test/flutter
  5. flutter build apk --debug

Options:
  --repeat=N              Run the full suite N times. Default: 1.
  --concurrency=N         Flutter test concurrency. Default: 1 for stability.
  --report-dir=DIR        Custom report directory.
  --clean                 Run flutter clean before the first iteration.
  --continue-on-fail      Keep running later steps/iterations after failures.

  --no-docs               Skip docs check.
  --no-pub-get            Skip flutter pub get.
  --no-analyze            Skip static analysis.
  --no-tests              Skip Flutter tests.
  --no-debug-build        Skip debug APK build.
  --release               Also build release APK.
  --no-build              Skip all APK builds.
  --test-target=PATH      Flutter test target. Default: ../scripts/mobile/test/flutter.
  --automated-only        Same as --test-target=../scripts/mobile/test/flutter/automated.

  --install               Install the debug APK to a connected Android device.
  --launch                Install and launch the debug APK.
  --device=ID             adb device id for install/launch.

  --s3-configfile-url=URL Pass LPP_S3_CONFIGFILE_URL to Flutter build/test.
  -h, --help              Show this help.

Examples:
  ../scripts/mobile/test/run_full_regression.sh
  ../scripts/mobile/test/run_full_regression.sh --repeat=3 --continue-on-fail
  ../scripts/mobile/test/run_full_regression.sh --release --install --device=ce8c42ac
  ../scripts/mobile/test/run_full_regression.sh --s3-configfile-url=https://example.com/config.json
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --repeat=*) REPEAT="${arg#--repeat=}" ;;
    --concurrency=*) CONCURRENCY="${arg#--concurrency=}" ;;
    --report-dir=*) REPORT_ROOT="${arg#--report-dir=}" ;;
    --clean) RUN_CLEAN=true ;;
    --continue-on-fail) CONTINUE_ON_FAIL=true ;;
    --no-docs) RUN_DOCS=false ;;
    --no-pub-get) RUN_PUB_GET=false ;;
    --no-analyze) RUN_ANALYZE=false ;;
    --no-tests) RUN_TESTS=false ;;
    --no-debug-build) RUN_DEBUG_BUILD=false ;;
    --release) RUN_RELEASE_BUILD=true ;;
    --no-build) RUN_DEBUG_BUILD=false; RUN_RELEASE_BUILD=false ;;
    --test-target=*) TEST_TARGET="${arg#--test-target=}" ;;
    --automated-only) TEST_TARGET="../scripts/mobile/test/flutter/automated" ;;
    --install) RUN_INSTALL=true ;;
    --launch) RUN_INSTALL=true; RUN_LAUNCH=true ;;
    --device=*) DEVICE_ID="${arg#--device=}" ;;
    --s3-configfile-url=*) S3_CONFIGFILE_URL="${arg#--s3-configfile-url=}" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

if ! [[ "$REPEAT" =~ ^[1-9][0-9]*$ ]]; then
  echo "--repeat must be a positive integer, got: $REPEAT" >&2
  exit 2
fi

if ! [[ "$CONCURRENCY" =~ ^[1-9][0-9]*$ ]]; then
  echo "--concurrency must be a positive integer, got: $CONCURRENCY" >&2
  exit 2
fi

ensure_flutter
mkdir -p "$REPORT_ROOT"

SUMMARY="$REPORT_ROOT/summary.md"
STATUS_TSV="$REPORT_ROOT/status.tsv"
START_EPOCH="$(date +%s)"

cat >"$SUMMARY" <<EOF
# LPP Mobile Full Regression

- Started: $(date '+%Y-%m-%d %H:%M:%S %z')
- Repeat: $REPEAT
- Flutter test concurrency: $CONCURRENCY
- Flutter test target: $TEST_TARGET
- Report directory: $REPORT_ROOT
- S3 configfile URL: ${S3_CONFIGFILE_URL:-"(not set)"}

| Iteration | Step | Status | Seconds | Log |
| --- | --- | --- | ---: | --- |
EOF

printf 'iteration\tstep\tstatus\tseconds\tlog\n' >"$STATUS_TSV"

BUILD_DEFINES=()
if [ -n "$S3_CONFIGFILE_URL" ]; then
  BUILD_DEFINES+=(--dart-define "LPP_S3_CONFIGFILE_URL=$S3_CONFIGFILE_URL")
fi

overall_status=0

run_step() {
  local iteration="$1"
  local step_key="$2"
  local step_label="$3"
  shift 3

  local iteration_dir="$REPORT_ROOT/iteration-$iteration"
  mkdir -p "$iteration_dir"
  local log_file="$iteration_dir/${step_key}.log"
  local relative_log="iteration-$iteration/${step_key}.log"
  local started ended elapsed status
  started="$(date +%s)"

  echo
  echo "== [iteration $iteration/$REPEAT] $step_label =="
  echo "+ $*" | tee "$log_file"

  set +e
  "$@" 2>&1 | tee -a "$log_file"
  status="${PIPESTATUS[0]}"
  set -e

  ended="$(date +%s)"
  elapsed=$((ended - started))

  if [ "$status" -eq 0 ]; then
    echo "PASS $step_label (${elapsed}s)" | tee -a "$log_file"
    printf '| %s | %s | PASS | %s | [%s](%s) |\n' \
      "$iteration" "$step_label" "$elapsed" "$relative_log" "$relative_log" \
      >>"$SUMMARY"
    printf '%s\t%s\tPASS\t%s\t%s\n' \
      "$iteration" "$step_label" "$elapsed" "$relative_log" >>"$STATUS_TSV"
  else
    overall_status=1
    echo "FAIL $step_label (${elapsed}s, exit $status)" | tee -a "$log_file"
    printf '| %s | %s | FAIL(%s) | %s | [%s](%s) |\n' \
      "$iteration" "$step_label" "$status" "$elapsed" "$relative_log" "$relative_log" \
      >>"$SUMMARY"
    printf '%s\t%s\tFAIL(%s)\t%s\t%s\n' \
      "$iteration" "$step_label" "$status" "$elapsed" "$relative_log" >>"$STATUS_TSV"
    if [ "$CONTINUE_ON_FAIL" = false ]; then
      finalize_report
      exit "$status"
    fi
  fi
}

adb_cmd() {
  if [ -n "$DEVICE_ID" ]; then
    adb -s "$DEVICE_ID" "$@"
  else
    adb "$@"
  fi
}

finalize_report() {
  local ended total
  ended="$(date +%s)"
  total=$((ended - START_EPOCH))
  {
    echo
    echo "- Finished: $(date '+%Y-%m-%d %H:%M:%S %z')"
    echo "- Total seconds: $total"
    if [ "$overall_status" -eq 0 ]; then
      echo "- Overall: PASS"
    else
      echo "- Overall: FAIL"
    fi
  } >>"$SUMMARY"
  echo
  echo "Report: $SUMMARY"
}

cd_root

if [ "$RUN_CLEAN" = true ]; then
  run_step 0 "00_clean" "flutter clean" flutter clean
fi

if [ "$RUN_INSTALL" = true ]; then
  if ! command -v adb >/dev/null 2>&1; then
    echo "adb command not found; cannot install/launch Android app." >&2
    exit 127
  fi
fi

for iteration in $(seq 1 "$REPEAT"); do
  if [ "$RUN_DOCS" = true ]; then
    run_step "$iteration" "01_docs" "docs check" \
      "$LPP_ROOT/scripts/docs/check-docs.sh"
  fi

  if [ "$RUN_PUB_GET" = true ]; then
    run_step "$iteration" "02_pub_get" "flutter pub get" \
      flutter pub get
  fi

  if [ "$RUN_ANALYZE" = true ]; then
    run_step "$iteration" "03_analyze" "flutter analyze" \
      flutter analyze --no-fatal-warnings --no-fatal-infos \
        lib
  fi

  if [ "$RUN_TESTS" = true ]; then
    run_step "$iteration" "04_flutter_test" "flutter test" \
      flutter test --concurrency="$CONCURRENCY" \
        ${BUILD_DEFINES[@]+"${BUILD_DEFINES[@]}"} \
        "$TEST_TARGET"
  fi

  if [ "$RUN_DEBUG_BUILD" = true ]; then
    run_step "$iteration" "05_build_debug_apk" "flutter build apk debug" \
      flutter build apk --debug ${BUILD_DEFINES[@]+"${BUILD_DEFINES[@]}"}
  fi

  if [ "$RUN_RELEASE_BUILD" = true ]; then
    run_step "$iteration" "06_build_release_apk" "flutter build apk release" \
      flutter build apk --release ${BUILD_DEFINES[@]+"${BUILD_DEFINES[@]}"}
  fi

  if [ "$RUN_INSTALL" = true ]; then
    run_step "$iteration" "07_adb_install" "adb install debug apk" \
      adb_cmd install -r build/app/outputs/flutter-apk/app-debug.apk
  fi

  if [ "$RUN_LAUNCH" = true ]; then
    run_step "$iteration" "08_adb_launch" "adb launch smoke" \
      adb_cmd shell monkey -p com.lpp.mobile \
        -c android.intent.category.LAUNCHER 1
    sleep 2
    run_step "$iteration" "09_adb_pid_check" "adb process check" \
      adb_cmd shell pidof com.lpp.mobile
  fi
done

finalize_report
exit "$overall_status"
