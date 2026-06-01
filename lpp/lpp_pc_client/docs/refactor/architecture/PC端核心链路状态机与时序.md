# PC 端核心链路状态机与时序

状态：冷参考

来源：从 `PC端核心架构技术方案.md` 拆出，供 L2/L3 核心链路任务按需读取。

适用范围：普通 IM、在线客服、Gateway 的状态机和时序判断。

---

## 20. 核心状态机

本节定义 PC 端必须稳定收敛的核心状态机。后续代码实现可以拆分文件，但状态转换口径不能散落在 UI 组件中。

### 20.1 普通 IM 消息发送状态机

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Uploading: 发送图片/文件
  Draft --> Sending: 发送文本
  Uploading --> Sending: 上传成功
  Uploading --> UploadFailed: 上传失败/取消
  UploadFailed --> Uploading: 重试上传
  UploadFailed --> Canceled: 删除本地待发
  Sending --> Sent: 服务端返回 messageId/seq
  Sending --> SendFailed: 网络失败/服务端拒绝/超时
  SendFailed --> Sending: 重试发送
  SendFailed --> Canceled: 删除本地失败消息
  Sent --> Recalled: 撤回成功
  Sent --> DeletedLocal: 本地删除
  Recalled --> DeletedLocal: 本地删除
```

规则：

- `Draft` 只存在于输入区或草稿存储，不进入消息 timeline。
- `Uploading` 表示媒体资源未完成上传，不能调用消息发送接口。
- `Sending` 表示消息体已经具备服务端可接收结构。
- `Sent` 必须具备服务端 `messageId`，有条件时必须具备 `conversationSeq`。
- `UploadFailed` 和 `SendFailed` 必须区分，UI 文案和重试动作不同。
- `Canceled` 和 `DeletedLocal` 都是本机视觉状态，不代表服务端事实。
- `Recalled` 是服务端事实，刷新后必须仍可恢复。

### 20.2 普通 IM 已读状态机

```mermaid
stateDiagram-v2
  [*] --> Unknown
  Unknown --> SnapshotLoaded: 会话快照/本地 read state 加载
  SnapshotLoaded --> HasUnread: incoming seq > myReadSeq
  SnapshotLoaded --> ReadUpToDate: myReadSeq >= lastMessageSeq
  HasUnread --> PendingLocalRead: 打开会话/当前会话可见收到 incoming
  PendingLocalRead --> ReadUpToDate: markRead 成功
  PendingLocalRead --> PendingLocalRead: markRead 失败，保留 pendingReadSeq
  ReadUpToDate --> HasUnread: 非当前会话收到 incoming
  ReadUpToDate --> ReadUpToDate: 自己发送消息/自己消息回显
```

规则：

- `myReadSeq` 只能前进。
- `pendingReadSeq` 表示本地已经认为读到，但服务端未确认。
- UI 不能直接把 `serverUnreadCount` 展示为最终未读；必须经过 read model 派生。
- 自己发送的消息必须推进本端 read cursor 到该消息 seq。
- 当前会话可见时收到 incoming，应生成幂等 mark read command。

### 20.3 在线客服线程状态机

```mermaid
stateDiagram-v2
  [*] --> Unknown
  Unknown --> Queued: workbench snapshot queued/waiting
  Unknown --> AiHandling: snapshot ai/bot
  Unknown --> Active: snapshot active/assigned/manual
  Unknown --> Closed: snapshot closed/archived
  Queued --> Claiming: 点击接入
  Claiming --> Active: 接入成功
  Claiming --> Queued: 接入失败可重试
  Claiming --> Closed: 服务端返回终态
  AiHandling --> TakingOver: 点击人工接管
  TakingOver --> Active: 接管成功
  TakingOver --> AiHandling: 接管失败可重试
  TakingOver --> Closed: 服务端返回终态
  Active --> Closing: 点击关闭
  Closing --> Closed: 关闭成功
  Closing --> Active: 关闭失败可重试
  Active --> Closed: Gateway/轮询返回终态
  Queued --> Closed: Gateway/轮询返回终态
  AiHandling --> Closed: Gateway/轮询返回终态
```

规则：

- `Queued` 只能接入，不能发送人工消息。
- `AiHandling` 只能人工接管，不能直接人工发送。
- `Active` 可以发送，可以关闭。
- `Closed` 永远只读。
- 所有点击动作进入 pending 状态，防止重复点击。
- 任何写操作返回终态错误时，线程立即进入只读并触发 refetch。

### 20.4 Gateway 连接状态机

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Connecting: session available
  Connecting --> Connected: start success
  Connecting --> Failed: start failed
  Connected --> Reconnecting: transport lost
  Reconnecting --> Connected: reconnect success
  Reconnecting --> Disconnected: reconnect exhausted/session invalid
  Failed --> Connecting: retry/session refresh
  Disconnected --> Connecting: manual retry/network restored
  Connected --> ClosedByAuth: auth force logout/session revoked
  ClosedByAuth --> Idle: clear session
```

规则：

- Gateway 是实时加速器，不是唯一数据源；断开时 UI 仍使用 HTTP。
- `Connected` 后必须 heartbeat 或保持服务端要求的活跃机制。
- `Reconnecting -> Connected` 后必须刷新 IM 和客服关键 query，必要时执行 `/sync`。
- `ClosedByAuth` 必须清理 QueryClient、session、敏感本地状态。

---

---

## 21. 核心链路时序图

### 21.1 普通 IM 文本发送

```mermaid
sequenceDiagram
  participant U as User
  participant UI as MessageComposer
  participant App as messages/application
  participant Cache as messagesCache
  participant API as Messages API
  participant GW as Gateway

  U->>UI: 输入文本并点击发送
  UI->>App: sendText(conversation, text, reply?)
  App->>Cache: insert local outgoing(sending)
  App->>API: POST direct/group messages
  API-->>App: server message(messageId, seq)
  App->>Cache: replace local with server message
  GW-->>App: message echo
  App->>Cache: dedupe echo by messageId/client signature
```

必须满足：

- local outgoing 先出现，提升响应速度。
- 服务端返回后收敛为服务端事实。
- Gateway echo 不重复显示。
- API 成功但 Gateway 丢失时不影响最终显示。

### 21.2 普通 IM 媒体发送

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Composer
  participant App as messages/application
  participant Media as Media API
  participant API as Messages API
  participant Cache as messagesCache

  U->>UI: 选择/粘贴/拖拽文件
  UI->>App: prepareMediaAttachment(file)
  App->>Cache: show attachment queued
  App->>Media: POST /media/upload
  Media-->>App: MediaResource
  App->>Cache: update local message uploading -> sending
  App->>API: POST message body {image|file}
  API-->>App: server message
  App->>Cache: mark sent and preserve local preview if needed
```

必须满足：

- 上传失败不丢附件。
- 发送失败不重复上传已成功的媒体。
- 图片本地预览优先，服务端资源回填后仍能展示。
- 文件名、大小、mimeType 来自稳定 media model。

### 21.3 在线客服接入并发送

```mermaid
sequenceDiagram
  participant U as Staff
  participant UI as CustomerService UI
  participant Core as customer-service/application
  participant API as Customer Service API
  participant Cache as customerServiceCache
  participant GW as Gateway

  U->>UI: 点击排队会话
  UI->>Core: selectThread(threadKey)
  Core->>Cache: mark selected and clear local unread
  U->>UI: 点击接入
  UI->>Core: startAction(claim)
  Core->>API: POST claim
  API-->>Core: active thread snapshot
  Core->>Cache: queued -> active, canReply=true
  U->>UI: 输入并发送
  UI->>Core: sendCustomerServiceMessage
  Core->>API: POST thread messages
  API-->>Core: server message
  Core->>Cache: append sent message
  GW-->>Core: temp_session.message echo
  Core->>Cache: dedupe
```

必须满足：

- 接入成功前输入区禁用。
- 接入失败不应本地伪造成 active。
- 接入后服务端状态为准。
- 当前会话的自己消息不产生未读。

### 21.4 Gateway 收到非当前会话消息

```mermaid
sequenceDiagram
  participant GW as SignalR
  participant Adapter as Gateway Adapter
  participant App as Feature Application
  participant Cache as React Query Cache
  participant Store as Reminder Store
  participant Desktop as desktopApi.notify

  GW-->>Adapter: raw event(eventName, payload)
  Adapter-->>App: domain event(message_received)
  App->>Cache: append or update conversation summary
  App->>Store: push reminder if eligible
  Store->>Desktop: system notification if setting enabled
```

必须满足：

- Adapter 对原始字段兼容，但输出稳定 domain event。
- 当前会话和非当前会话提醒规则不同。
- 系统通知必须走统一 notification service，不在 adapter 中直接调用。

---
