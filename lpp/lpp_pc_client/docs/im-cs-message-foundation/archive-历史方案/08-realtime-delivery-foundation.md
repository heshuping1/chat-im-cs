# PC IM + 在线客服实时消息投递地基方案

日期：2026-06-02

## 1. 最终结论

PC 消息系统的实时入口必须是 `/ws/client` 长连接 push。HTTP snapshot、会话列表 refetch、在线客服 workbench refetch 只能承担初始化、重连补偿和一致性校验，不能作为实时消息的主要发现路径。

当前代码已经有 SignalR 长连接，但历史实现把 Gateway 当成“加速器”：初始 `connection.start()` 失败只记录 `start-failed`，没有持续重试；因此运行时会静默退化到 snapshot/refetch，出现 5 秒级延迟。这不是成熟 IM 方案，必须修正为“长连接强主链路 + 重连 + gap sync”。

## 2. 成熟分层

```text
Transport Layer
  SignalR/WebSocket connection, reconnect, heartbeat

Delivery Layer
  push event normalize, ownership, idempotency, seq check, gap detection

Domain Layer
  IM domain state
  CustomerService domain state

Read / Reminder Layer
  IM read view
  CustomerService unread ledger
  Badge/reminder decision

Snapshot Reconcile Layer
  startup snapshot
  consistency reconcile
  stale snapshot protection

UI Layer
  conversation list
  thread list
  chat pane
  notification surfaces
```

边界：

- Transport 只管连接、重试、心跳，不写业务 cache。
- Delivery 只管事件归一、归属、去重、投递。
- Domain 才能写 IM cache 或客服 ledger。
- UI 只能读 effective view，不能直接解释 raw unread。
- Snapshot 不能覆盖本地已收到的新消息，除非有更新的 server seq/version 证据。

## 3. 当前落地

本轮落地内容：

- 新增 `GatewayConnectionManager`，初始 start 失败后持续重试。
- 新增 `gateway-health.jsonl`，记录连接、失败、重试、重连、停止。
- 新增 `MessageDeliveryService`，把 gateway push 的 cache/read/reminder 副作用从 router 收敛到统一入口。
- 新增 `message-delivery.jsonl`，记录 push 收到、投递、cache write。
- 新增 `MessageGapSyncCoordinator`，gateway 首次连接成功和重连成功后触发补偿同步。
- 新增 `message-gap-sync.jsonl`，记录补偿触发原因和当前补偿模式。

现有限制：

- 当前前端还没有专用“按 seq 区间拉缺失消息”的服务端接口。
- 因此本轮 gap sync 先使用现有 conversation/message refetch 做会话级补偿。
- 这不是最终成熟 gap sync，只是基于现有接口的安全过渡。

## 4. 后续服务端接口要求

成熟 gap sync 需要服务端支持至少一种能力：

1. 全局 cursor：
   - 请求：`GET /api/client/v1/messages/sync?afterCursor=...`
   - 返回：按全局顺序排列的消息事件、读事件、撤回事件和最新 cursor。

2. 会话级 seq：
   - 请求：`GET /api/client/v1/conversations/{conversationId}/messages?afterSeq=...&limit=...`
   - 返回：缺失区间消息、serverLastSeq、hasMore。

3. Gateway reconnect resume：
   - 客户端重连时提交 last cursor。
   - 服务端在 gateway 上补发断线期间事件。

如果服务端暂时只提供历史消息列表，前端只能做会话级 refetch 补偿，不能宣称已经具备完整 gap sync。

## 5. 验收标准

- 正常情况下，IM 收消息必须出现 `gateway.push.received`。
- Gateway 初始失败后，无需重启客户端，`gateway-health.jsonl` 必须持续出现 retry。
- Gateway 成功连接或重连后，必须出现 `message.gap-sync.triggered`。
- Push 到 UI cache 写入必须出现 `message.delivery`。
- Snapshot 发现的消息不能被当成实时消息；需要通过日志标记为 snapshot/reconcile 来源。
- 在线客服临时会话仍不能进入 IM 列表。
- 在线客服未读仍只统计访客消息。

## 6. 禁止项

- 禁止把 Gateway 继续描述为 accelerator。
- 禁止用高频轮询伪装实时消息。
- 禁止 snapshot 绕过 ownership 直接写 IM 或客服状态。
- 禁止把 `pc-im-conversations.tempSession.unreadCount` 直接当客服最终未读。
- 禁止 UI 直接读 raw unread。
