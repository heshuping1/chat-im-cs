#!/usr/bin/env bash
set -euo pipefail

PACKAGE="com.lpp.mobile"
SERIAL=""
SPACE_ID=""
CONVERSATION_ID=""
LIMIT=20
DB_PATH=""

usage() {
  cat <<'USAGE'
Usage:
  inspect_android_video_messages.sh --space-id SPACE_ID --conversation-id CONVERSATION_ID [options]

Options:
  --package PACKAGE        Android applicationId. Default: com.lpp.mobile
  --serial SERIAL          adb device serial.
  --limit LIMIT            Number of video rows to print. Default: 20
  --db-path PATH           Override database path inside app sandbox.
  -h, --help               Show this help.

Prints message_id, conversation_seq, body, and status for local video rows in:
  lpp_chat_{spaceId}.db / messages_{sanitizedConversationId}
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --package)
      PACKAGE="${2:-}"
      shift 2
      ;;
    --serial)
      SERIAL="${2:-}"
      shift 2
      ;;
    --space-id)
      SPACE_ID="${2:-}"
      shift 2
      ;;
    --conversation-id)
      CONVERSATION_ID="${2:-}"
      shift 2
      ;;
    --limit)
      LIMIT="${2:-}"
      shift 2
      ;;
    --db-path)
      DB_PATH="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$SPACE_ID" || -z "$CONVERSATION_ID" ]]; then
  usage >&2
  exit 2
fi

if ! [[ "$LIMIT" =~ ^[0-9]+$ ]] || [[ "$LIMIT" -eq 0 ]]; then
  echo "--limit must be a positive integer" >&2
  exit 2
fi

ADB=(adb)
if [[ -n "$SERIAL" ]]; then
  ADB+=( -s "$SERIAL" )
fi

if [[ -z "$DB_PATH" ]]; then
  DB_PATH="/data/user/0/$PACKAGE/app_flutter/lpp_chat_$SPACE_ID.db"
fi

TABLE="messages_$(printf '%s' "$CONVERSATION_ID" | sed 's/[^a-zA-Z0-9]/_/g')"
SQL=$(cat <<SQL
.headers on
.mode tabs
SELECT message_id, conversation_seq, body, status
FROM $TABLE
WHERE message_type = 'video'
ORDER BY conversation_seq DESC
LIMIT $LIMIT;
SQL
)

run_as() {
  "${ADB[@]}" shell run-as "$PACKAGE" "$@"
}

if ! run_as sh -c "test -f '$DB_PATH'"; then
  echo "Database not found or run-as denied: $DB_PATH" >&2
  echo "Make sure this is a debuggable Android build and the spaceId is correct." >&2
  exit 1
fi

if run_as sh -c 'command -v sqlite3 >/dev/null 2>&1'; then
  echo "package=$PACKAGE"
  echo "database=$DB_PATH"
  echo "table=$TABLE"
  printf '%s\n' "$SQL" | run_as sqlite3 "$DB_PATH"
  exit 0
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 is unavailable both on device and host." >&2
  echo "Install host sqlite3 or use a device image that includes sqlite3." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
LOCAL_DB="$TMP_DIR/$(basename "$DB_PATH")"

"${ADB[@]}" exec-out run-as "$PACKAGE" cat "$DB_PATH" > "$LOCAL_DB"
for suffix in -wal -shm; do
  if run_as sh -c "test -f '$DB_PATH$suffix'"; then
    "${ADB[@]}" exec-out run-as "$PACKAGE" cat "$DB_PATH$suffix" > "$LOCAL_DB$suffix"
  fi
done

echo "package=$PACKAGE"
echo "database=$DB_PATH"
echo "table=$TABLE"
echo "copied_to=$LOCAL_DB"
printf '%s\n' "$SQL" | sqlite3 "$LOCAL_DB"
