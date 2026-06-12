#!/usr/bin/env python3
"""Interactive command-line visitor chat for Widget temp sessions."""

from __future__ import annotations

import argparse
import json
import queue
import sys
import threading
import time
import uuid
from typing import Any

from simulate_temp_sessions import (
    ApiFailure,
    BASE_CHAT,
    DEFAULT_ORIGIN,
    DEFAULT_TENANT_CODE,
    request_json,
    require_ok,
)

TERMINAL_SESSION_STATUSES = {
    "closed",
    "closed_by_visitor",
    "closed_by_staff",
    "closed_timeout",
    "closed_system",
    "archived",
    "ended",
    "finished",
    "resolved",
    "terminated",
    "cancelled",
    "canceled",
    "expired",
    "5",
    "6",
    "7",
    "8",
    "9",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Start a real Widget temp session and chat as the visitor."
    )
    parser.add_argument("--base-chat", default=BASE_CHAT)
    parser.add_argument("--tenant-code", default=DEFAULT_TENANT_CODE)
    parser.add_argument("--origin", default=DEFAULT_ORIGIN)
    parser.add_argument("--visitor-name", default="命令行访客")
    parser.add_argument("--category", default="售前咨询")
    parser.add_argument("--priority", default="normal")
    parser.add_argument(
        "--initial-message",
        default="你好，我是命令行访客，想测试在线客服聊天。",
    )
    parser.add_argument("--session-id", default="")
    parser.add_argument("--visitor-token", default="")
    parser.add_argument("--poll-seconds", type=float, default=2.5)
    return parser.parse_args()


def create_session(args: argparse.Namespace) -> dict[str, Any]:
    payload = request_json(
        "POST",
        f"{args.base_chat}/api/widget/v1/{args.tenant_code}/sessions",
        origin=args.origin,
        body={
            "fingerprint": f"cli-chat-{int(time.time())}-{uuid.uuid4().hex[:8]}",
            "locale": "zh-CN",
            "from": "cli-temp-window",
            "ref": "manual-chat-test",
            "category": args.category,
            "priority": args.priority,
            "visitorName": args.visitor_name,
            "sourceUrl": "https://chat.hearteasechat.com/cli-temp-window",
            "pageTitle": "命令行临时聊天窗口",
            "initialMessage": args.initial_message,
            "metadata": {
                "source": "scripts/mobile/dev/temp_session_chat.py",
                "runId": uuid.uuid4().hex[:10],
            },
        },
    )
    return require_ok(payload, "create widget session")


def get_session(args: argparse.Namespace, session_id: str, token: str) -> dict[str, Any]:
    payload = request_json(
        "GET",
        f"{args.base_chat}/api/widget/v1/sessions/{session_id}",
        token=token,
    )
    return require_ok(payload, "get widget session")


def extract_session_status(session: dict[str, Any]) -> str:
    value = (
        session.get("status")
        or session.get("session_status")
        or session.get("sessionStatus")
        or ""
    )
    return str(value).strip()


def is_terminal_session_status(status: str | None) -> bool:
    normalized = str(status or "").strip().lower().replace("-", "_")
    return normalized in TERMINAL_SESSION_STATUSES or normalized.startswith("closed")


def mark_session_closed(
    terminal_ref: dict[str, Any],
    status: str | None,
    *,
    reason: str = "",
) -> None:
    if terminal_ref.get("closed"):
        return
    normalized_status = extract_session_status({"status": status}) or "closed"
    terminal_ref["closed"] = True
    terminal_ref["status"] = normalized_status
    suffix = f"（{reason}）" if reason else ""
    print(f'\n[会话已结束{suffix}，状态：{normalized_status}。输入 /continue 可继续对话。]')
    print("> ", end="", flush=True)


def mark_session_open(
    terminal_ref: dict[str, Any],
    status: str | None,
) -> None:
    terminal_ref["closed"] = False
    terminal_ref["status"] = extract_session_status({"status": status}) or "active"
    print(f'\n[会话已继续，状态：{terminal_ref["status"]}]')
    print("> ", end="", flush=True)


def get_messages(args: argparse.Namespace, session_id: str, token: str) -> list[dict[str, Any]]:
    payload = request_json(
        "GET",
        f"{args.base_chat}/api/widget/v1/sessions/{session_id}/messages",
        token=token,
    )
    if payload.get("code") != "OK":
        raise ApiFailure(
            f"get messages failed: {payload.get('code')} {payload.get('message', '')}",
            payload,
        )
    data = payload.get("data")
    return data if isinstance(data, list) else []


def send_message(args: argparse.Namespace, session_id: str, token: str, text: str) -> None:
    payload = request_json(
        "POST",
        f"{args.base_chat}/api/widget/v1/sessions/{session_id}/messages",
        token=token,
        body={
            "clientMsgId": f"cli-{uuid.uuid4().hex}",
            "messageType": "text",
            "body": {"text": text},
        },
    )
    require_ok(payload, "send visitor message")


def refresh_visitor_token(args: argparse.Namespace, session_id: str, token: str) -> str:
    payload = request_json(
        "POST",
        f"{args.base_chat}/api/widget/v1/sessions/{session_id}/token/refresh",
        token=token,
    )
    data = require_ok(payload, "refresh visitor token")
    new_token = data.get("visitorToken")
    if not new_token:
        raise ApiFailure("refresh visitor token response missing visitorToken", payload)
    return str(new_token)


def reopen_session(
    args: argparse.Namespace,
    session_id: str,
    token: str,
) -> dict[str, Any]:
    payload = request_json(
        "POST",
        f"{args.base_chat}/api/widget/v1/sessions/{session_id}/reopen",
        token=token,
    )
    data = require_ok(payload, "reopen widget session")
    if not data.get("visitorToken"):
        raise ApiFailure("reopen widget session response missing visitorToken", payload)
    return data


def is_unauthorized(exc: Exception) -> bool:
    return isinstance(exc, ApiFailure) and (
        exc.payload.get("code") == "HTTP_401" or "HTTP 401" in str(exc)
    )


def message_text(message: dict[str, Any]) -> str:
    body = message.get("body")
    if isinstance(body, dict):
        text = body.get("text") or body.get("content")
        if text is not None:
            return str(text)
        return json.dumps(body, ensure_ascii=False)
    return str(body or "")


def print_message(message: dict[str, Any]) -> None:
    seq = message.get("conversationSeq", "?")
    sender = message.get("senderDisplayName") or message.get("senderType") or "unknown"
    sender_type = message.get("senderType") or "unknown"
    sent_at = str(message.get("sentAt") or "")[11:19]
    prefix = f"[{seq}]"
    if sent_at:
        prefix += f" {sent_at}"
    print(f"\n{prefix} {sender}({sender_type}): {message_text(message)}")
    print("> ", end="", flush=True)


def poll_loop(
    args: argparse.Namespace,
    session_id: str,
    token_ref: dict[str, str],
    terminal_ref: dict[str, Any],
    stop: threading.Event,
    errors: "queue.Queue[Exception]",
) -> None:
    seen_ids: set[str] = set()
    consecutive_errors = 0
    while not stop.is_set():
        try:
            session = get_session(args, session_id, token_ref["token"])
            status = extract_session_status(session)
            if is_terminal_session_status(status):
                mark_session_closed(terminal_ref, status, reason="轮询发现终态")
                stop.set()
                return
            messages = get_messages(args, session_id, token_ref["token"])
            consecutive_errors = 0
            for message in messages:
                message_id = str(message.get("messageId") or message.get("conversationSeq"))
                if message_id in seen_ids:
                    continue
                seen_ids.add(message_id)
                print_message(message)
        except Exception as exc:  # noqa: BLE001 - surface API errors to main loop.
            if is_unauthorized(exc):
                try:
                    token_ref["token"] = refresh_visitor_token(
                        args,
                        session_id,
                        token_ref["token"],
                    )
                    print("\n[访客 token 已刷新，继续轮询]")
                    print("> ", end="", flush=True)
                    consecutive_errors = 0
                    stop.wait(0.2)
                    continue
                except Exception as refresh_exc:  # noqa: BLE001
                    if is_unauthorized(refresh_exc):
                        mark_session_closed(
                            terminal_ref,
                            "closed",
                            reason="服务端拒绝继续访问",
                        )
                        stop.set()
                        return
                    errors.put(refresh_exc)
                    return
            consecutive_errors += 1
            print(f"\n[轮询暂时失败，稍后重试 #{consecutive_errors}: {exc}]")
            print("> ", end="", flush=True)
        stop.wait(args.poll_seconds)


def start_poller(
    args: argparse.Namespace,
    session_id: str,
    token_ref: dict[str, str],
    terminal_ref: dict[str, Any],
    errors: "queue.Queue[Exception]",
) -> tuple[threading.Event, threading.Thread]:
    stop = threading.Event()
    poller = threading.Thread(
        target=poll_loop,
        args=(args, session_id, token_ref, terminal_ref, stop, errors),
        daemon=True,
    )
    poller.start()
    return stop, poller


def print_help() -> None:
    print(
        "\n命令：\n"
        "  直接输入文字并回车：发送给客服\n"
        "  /status：查看会话状态\n"
        "  /refresh：立即刷新消息\n"
        "  /continue 或 /reopen：会话超时关闭后继续对话\n"
        "  /quit：退出临时聊天窗口\n"
    )


def main() -> int:
    args = parse_args()

    if args.session_id or args.visitor_token:
        if not args.session_id or not args.visitor_token:
            raise ApiFailure("--session-id and --visitor-token must be provided together")
        session = {
            "sessionId": args.session_id,
            "visitorToken": args.visitor_token,
        }
    else:
        session = create_session(args)

    session_id = str(session["sessionId"])
    token_ref = {"token": str(session["visitorToken"])}
    print("临时聊天窗口已启动")
    print("sessionId:", session_id)
    print("conversationId:", session.get("conversationId"))
    print("status:", session.get("status"), "queuePosition:", session.get("queuePosition"))
    print("请在 App 打开：工作台 > 在线客服，然后进入这个临时会话。")
    print_help()

    terminal_ref: dict[str, Any] = {
        "closed": is_terminal_session_status(extract_session_status(session)),
        "status": extract_session_status(session),
    }
    if terminal_ref["closed"]:
        print(f'会话已结束，状态：{terminal_ref["status"] or "closed"}')
    errors: "queue.Queue[Exception]" = queue.Queue()
    stop, poller = start_poller(args, session_id, token_ref, terminal_ref, errors)

    try:
        while True:
            if not errors.empty():
                raise errors.get()
            try:
                text = input("> ").strip()
            except EOFError:
                break
            if not text:
                continue
            if text in {"/quit", "/exit"}:
                break
            if text == "/help":
                print_help()
                continue
            if text in {"/continue", "/reopen", "/resume"}:
                if not terminal_ref.get("closed"):
                    print("会话仍在进行中，无需继续对话。")
                    continue
                reopened = reopen_session(args, session_id, token_ref["token"])
                next_session_id = str(reopened.get("sessionId") or session_id)
                token_ref["token"] = str(reopened["visitorToken"])
                mark_session_open(terminal_ref, extract_session_status(reopened))
                stop.set()
                poller.join(timeout=1)
                session_id = next_session_id
                stop, poller = start_poller(
                    args,
                    session_id,
                    token_ref,
                    terminal_ref,
                    errors,
                )
                continue
            if text == "/status":
                if terminal_ref.get("closed"):
                    print(
                        f'会话已结束，状态：{terminal_ref.get("status") or "closed"}。'
                        "输入 /continue 可继续对话。"
                    )
                    continue
                try:
                    status = get_session(args, session_id, token_ref["token"])
                except Exception as exc:  # noqa: BLE001
                    if not is_unauthorized(exc):
                        raise
                    token_ref["token"] = refresh_visitor_token(
                        args,
                        session_id,
                        token_ref["token"],
                    )
                    status = get_session(args, session_id, token_ref["token"])
                session_status = extract_session_status(status)
                if is_terminal_session_status(session_status):
                    mark_session_closed(terminal_ref, session_status, reason="状态查询发现终态")
                    stop.set()
                print(
                    "status:",
                    session_status,
                    "owner:",
                    status.get("currentOwnerStaffDisplayName"),
                    "responder:",
                    status.get("currentResponderType"),
                )
                continue
            if text == "/refresh":
                if terminal_ref.get("closed"):
                    print(
                        f'会话已结束，状态：{terminal_ref.get("status") or "closed"}。'
                        "输入 /continue 可继续对话。"
                    )
                    continue
                try:
                    messages = get_messages(args, session_id, token_ref["token"])
                except Exception as exc:  # noqa: BLE001
                    if not is_unauthorized(exc):
                        raise
                    token_ref["token"] = refresh_visitor_token(
                        args,
                        session_id,
                        token_ref["token"],
                    )
                    messages = get_messages(args, session_id, token_ref["token"])
                for message in messages:
                    print_message(message)
                continue
            if terminal_ref.get("closed"):
                print(
                    f'会话已结束，消息未发送。状态：{terminal_ref.get("status") or "closed"}。'
                    "输入 /continue 可继续对话。"
                )
                continue
            try:
                send_message(args, session_id, token_ref["token"], text)
            except Exception as exc:  # noqa: BLE001
                if not is_unauthorized(exc):
                    raise
                try:
                    token_ref["token"] = refresh_visitor_token(
                        args,
                        session_id,
                        token_ref["token"],
                    )
                    send_message(args, session_id, token_ref["token"], text)
                except Exception as refresh_exc:  # noqa: BLE001
                    if is_unauthorized(refresh_exc):
                        mark_session_closed(
                            terminal_ref,
                            "closed",
                            reason="发送被服务端拒绝",
                        )
                        stop.set()
                        continue
                    raise
    finally:
        stop.set()
        poller.join(timeout=1)

    print("\n已退出临时聊天窗口。")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ApiFailure as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        if exc.payload:
            print(json.dumps(exc.payload, ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(1)
