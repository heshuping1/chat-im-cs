#!/usr/bin/env python3
"""Create real Widget temp sessions for customer-service testing.

Default target:
  tenantCode: mouse-corp
  staff:      lpp_gs9fn2c7 / 123123123

The script logs in as the staff account, switches to the tenant, marks the
staff online, then creates Widget visitor sessions through real API calls.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import uuid
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_CHAT = "https://chat.hearteasechat.com"
DEFAULT_TENANT_CODE = "mouse-corp"
DEFAULT_TENANT_ID = "019da0ce-9cd2-7623-8808-a0ab11da318a"
DEFAULT_STAFF_LOGIN = "lpp_gs9fn2c7"
DEFAULT_STAFF_PASSWORD = "123123123"
DEFAULT_STAFF_LOGIN_TYPE = "lpp_id"
DEFAULT_ORIGIN = "https://chat.hearteasechat.com"


class ApiFailure(RuntimeError):
    def __init__(self, message: str, payload: dict[str, Any] | None = None):
        super().__init__(message)
        self.payload = payload or {}


def request_json(
    method: str,
    url: str,
    *,
    token: str | None = None,
    origin: str | None = None,
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if origin:
        headers["Origin"] = origin

    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"code": f"HTTP_{exc.code}", "message": raw}
        raise ApiFailure(
            f"{method} {url} failed: HTTP {exc.code} {payload.get('message', '')}",
            payload,
        ) from exc
    except URLError as exc:
        raise ApiFailure(f"{method} {url} failed: {exc.reason}") from exc

    if not raw.strip():
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ApiFailure(f"{method} {url} returned non-json: {raw[:200]}") from exc


def require_ok(payload: dict[str, Any], label: str) -> dict[str, Any]:
    if payload.get("code") == "OK":
        data = payload.get("data")
        return data if isinstance(data, dict) else {"value": data}
    raise ApiFailure(
        f"{label} failed: {payload.get('code')} {payload.get('message', '')}",
        payload,
    )


def solve_captcha(question: str) -> str:
    numbers = [int(x) for x in re.findall(r"-?\d+", question)]
    if len(numbers) < 2:
        return "0"
    if "+" in question or "加" in question:
        return str(numbers[0] + numbers[1])
    if "-" in question or "减" in question:
        return str(numbers[0] - numbers[1])
    if "*" in question or "×" in question or "x" in question.lower() or "乘" in question:
        return str(numbers[0] * numbers[1])
    if "/" in question or "÷" in question or "除" in question:
        return str(numbers[0] // numbers[1])
    return "0"


def generate_captcha(base_chat: str) -> tuple[str, str]:
    payload = request_json(
        "POST",
        f"{base_chat}/api/client/v1/auth/captcha/generate",
        body={},
    )
    data = require_ok(payload, "generate captcha")
    token = data.get("token") or data.get("captchaToken")
    question = data.get("question") or data.get("captchaQuestion") or ""
    if not token:
        raise ApiFailure("captcha response missing token", payload)
    return str(token), str(question)


def platform_login(args: argparse.Namespace) -> dict[str, Any]:
    body = {
        "identifier": args.staff_login,
        "password": args.staff_password,
        "loginType": args.staff_login_type,
    }
    payload = request_json(
        "POST",
        f"{args.base_chat}/api/platform/v1/auth/login",
        body=body,
    )
    if payload.get("code") == "OK":
        return require_ok(payload, "platform login")

    print(
        f"首次登录未成功，尝试自动验证码: {payload.get('code')} {payload.get('message', '')}"
    )
    captcha_token, question = generate_captcha(args.base_chat)
    body["captchaToken"] = captcha_token
    body["captchaAnswer"] = solve_captcha(question)
    payload = request_json(
        "POST",
        f"{args.base_chat}/api/platform/v1/auth/login",
        body=body,
    )
    return require_ok(payload, "platform login with captcha")


def select_tenant(args: argparse.Namespace, login_data: dict[str, Any]) -> dict[str, Any]:
    if login_data.get("accessToken") and (
        not args.tenant_id or login_data.get("tenantId") == args.tenant_id
    ):
        return login_data

    platform_token = login_data.get("platformToken")
    if not platform_token:
        raise ApiFailure("platform login response missing platformToken", login_data)

    tenant_id = args.tenant_id
    tenants = login_data.get("tenants") if isinstance(login_data.get("tenants"), list) else []
    if not tenant_id:
        for item in tenants:
            if item.get("tenantCode") == args.tenant_code:
                tenant_id = item.get("tenantId")
                break
    if not tenant_id:
        tenants_payload = request_json(
            "GET",
            f"{args.base_chat}/api/platform/v1/my/tenants",
            token=platform_token,
        )
        tenants_data = tenants_payload.get("data") or []
        for item in tenants_data:
            if item.get("tenantCode") == args.tenant_code:
                tenant_id = item.get("tenantId")
                break
    if not tenant_id:
        raise ApiFailure(f"tenant not found: {args.tenant_code}")

    payload = request_json(
        "POST",
        f"{args.base_chat}/api/platform/v1/auth/select-tenant",
        token=platform_token,
        body={"tenantId": tenant_id},
    )
    return require_ok(payload, "select tenant")


def set_staff_online(args: argparse.Namespace, access_token: str) -> None:
    payload = request_json(
        "PUT",
        f"{args.base_chat}/api/client/v1/customer-service/reception/status",
        token=access_token,
        body={
            "serviceStatus": "online",
            "queueAcceptEnabled": True,
            "maxConcurrentSessions": args.max_concurrent_sessions,
        },
    )
    data = require_ok(payload, "set staff online")
    print(
        "客服状态:",
        data.get("serviceStatus"),
        f"queueAcceptEnabled={data.get('queueAcceptEnabled')}",
        f"active={data.get('activeSessionCount')}",
    )


def create_widget_session(
    args: argparse.Namespace,
    index: int,
    visitor_name: str,
) -> dict[str, Any]:
    fingerprint = f"codex-temp-{int(time.time())}-{index}-{uuid.uuid4().hex[:8]}"
    payload = request_json(
        "POST",
        f"{args.base_chat}/api/widget/v1/{args.tenant_code}/sessions",
        origin=args.origin,
        body={
            "fingerprint": fingerprint,
            "locale": "zh-CN",
            "from": "codex-script",
            "ref": "mobile-workbench-test",
            "category": args.category,
            "priority": args.priority,
            "visitorName": visitor_name,
            "sourceUrl": "https://chat.hearteasechat.com/codex-temp-session-test",
            "pageTitle": "Codex 临时会话模拟",
            "initialMessage": args.initial_message.format(index=index, visitor=visitor_name),
            "metadata": {
                "source": "scripts/mobile/dev/simulate_temp_sessions.py",
                "runId": args.run_id,
                "index": index,
            },
        },
    )
    data = require_ok(payload, f"create widget session #{index}")
    if args.followup_message:
        send_visitor_message(args, data, index, visitor_name)
    return data


def send_visitor_message(
    args: argparse.Namespace,
    session: dict[str, Any],
    index: int,
    visitor_name: str,
) -> None:
    session_id = session.get("sessionId")
    visitor_token = session.get("visitorToken")
    if not session_id or not visitor_token:
        return
    request_json(
        "POST",
        f"{args.base_chat}/api/widget/v1/sessions/{session_id}/messages",
        token=visitor_token,
        body={
            "clientMsgId": f"codex-{args.run_id}-{index}-{uuid.uuid4().hex[:8]}",
            "messageType": "text",
            "body": {
                "text": args.followup_message.format(
                    index=index,
                    visitor=visitor_name,
                )
            },
        },
    )


def print_workbench_snapshot(args: argparse.Namespace, access_token: str) -> None:
    print("\n工作台快照:")
    try:
        payload = request_json(
            "GET",
            f"{args.base_chat}/api/client/v1/customer-service/workbench/threads",
            token=access_token,
        )
    except ApiFailure as exc:
        payload = exc.payload
    if payload.get("code") == "OK":
        data = payload.get("data") or {}
        queue = data.get("queueItems") or []
        active = data.get("activeItems") or []
        print(f"  workbench/threads: queue={len(queue)} active={len(active)}")
        for item in [*queue[:5], *active[:5]]:
            print(
                "  -",
                item.get("threadType"),
                item.get("status"),
                item.get("title"),
                item.get("threadId"),
            )
        return

    print(f"  workbench/threads: {payload.get('code')} {payload.get('message', '')}")
    for path in ("queue", "mine"):
        try:
            fallback = request_json(
                "GET",
                f"{args.base_chat}/api/client/v1/customer-service/temp-sessions/{path}",
                token=access_token,
            )
        except ApiFailure as exc:
            fallback = exc.payload
        if fallback.get("code") == "OK":
            data = fallback.get("data")
            items = data.get("items") if isinstance(data, dict) else data
            items = items if isinstance(items, list) else []
            print(f"  temp-sessions/{path}: {len(items)}")
            for item in items[:5]:
                print(
                    "  -",
                    item.get("status"),
                    item.get("visitorName") or item.get("title"),
                    item.get("sessionId") or item.get("threadId"),
                )
        else:
            print(f"  temp-sessions/{path}: {fallback.get('code')} {fallback.get('message', '')}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create real Widget temp sessions for LPP customer-service testing."
    )
    parser.add_argument("--base-chat", default=BASE_CHAT)
    parser.add_argument("--tenant-code", default=DEFAULT_TENANT_CODE)
    parser.add_argument("--tenant-id", default=DEFAULT_TENANT_ID)
    parser.add_argument("--staff-login", default=DEFAULT_STAFF_LOGIN)
    parser.add_argument("--staff-password", default=DEFAULT_STAFF_PASSWORD)
    parser.add_argument("--staff-login-type", default=DEFAULT_STAFF_LOGIN_TYPE)
    parser.add_argument("--origin", default=DEFAULT_ORIGIN)
    parser.add_argument("--count", type=int, default=2)
    parser.add_argument("--max-concurrent-sessions", type=int, default=10)
    parser.add_argument("--category", default="售前咨询")
    parser.add_argument("--priority", default="normal")
    parser.add_argument(
        "--visitor-names",
        default="临时访客-陈先生,临时访客-王女士,临时访客-刘先生,临时访客-赵女士",
    )
    parser.add_argument(
        "--initial-message",
        default="你好，我是{visitor}，想咨询一下产品和开户流程。",
    )
    parser.add_argument(
        "--followup-message",
        default="我这边比较着急，麻烦客服看一下。",
    )
    parser.add_argument("--skip-online", action="store_true")
    parser.add_argument("--skip-snapshot", action="store_true")
    parser.add_argument("--run-id", default=uuid.uuid4().hex[:10])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.count < 1:
        raise ApiFailure("--count must be >= 1")

    print("登录客服:", args.staff_login)
    login_data = platform_login(args)
    tenant_data = select_tenant(args, login_data)
    access_token = tenant_data.get("accessToken")
    if not access_token:
        raise ApiFailure("select tenant response missing accessToken", tenant_data)
    print(
        "租户会话:",
        tenant_data.get("displayName"),
        tenant_data.get("tenantId"),
        f"userId={tenant_data.get('userId')}",
    )

    if not args.skip_online:
        set_staff_online(args, access_token)

    names = [name.strip() for name in args.visitor_names.split(",") if name.strip()]
    if not names:
        names = ["临时访客"]

    print(f"\n开始创建 {args.count} 个 Widget 临时会话:")
    sessions: list[dict[str, Any]] = []
    for i in range(1, args.count + 1):
        visitor_name = names[(i - 1) % len(names)]
        data = create_widget_session(args, i, visitor_name)
        sessions.append(data)
        print(
            f"  #{i} {visitor_name}:",
            f"status={data.get('status')}",
            f"queuePosition={data.get('queuePosition')}",
            f"sessionId={data.get('sessionId')}",
            f"conversationId={data.get('conversationId')}",
        )

    if not args.skip_snapshot:
        print_workbench_snapshot(args, access_token)

    print("\n完成。请在 App 打开：工作台 > 在线客服。普通消息首页不应展示这些临时会话。")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ApiFailure as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        if exc.payload:
            print(json.dumps(exc.payload, ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(1)
