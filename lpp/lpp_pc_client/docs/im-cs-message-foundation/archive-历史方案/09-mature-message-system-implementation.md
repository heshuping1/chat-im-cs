# PC IM + 在线客服成熟消息系统完整落地方案

日期：2026-06-02

## 1. 目标结论

PC IM 与在线客服的实时消息入口必须是 `/ws/client` 长连接 push。HTTP snapshot、会话列表 refetch、在线客服 workbench refetch 只承担初始化、重连补偿和一致性校验，不再承担实时消息发现职责。

成熟地基不只是“长连接 + 重试”。完整方案必须同时覆盖协议契约、transport、delivery、gap sync、IM read model、客服 unread ledger、发送状态机、badge/notification effective view、缓存一致性和诊断闭环。

## 2. 成熟分层

```text
Transport Layer
  SignalR/WebSocket connection, retry, reconnect, heartbeat, health state

Delivery Layer
  event normalize, ownership resolve, idempotency, seq guard, gap detection

Domain Layer
  IM domain state
  CustomerService domain state

Read / Reminder Layer
  IM read view
  CustomerService unread ledger
  badge/reminder decision

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

- Transport 只管连接、重试、心跳和健康状态，不写业务 cache。
- Delivery 只管归一、归属、幂等、seq guard 和投递，不解释 UI。
- Domain 才能写 IM cache 或客服 ledger。
- UI 只能读 effective view，不能直接解释 raw unread。
- Snapshot 不能覆盖本地 push 已经写入的新状态，除非有更新的 server seq/version 证据。

## 3. 当前前端已落地能力

- `GatewayConnectionManager`：初始 start 失败持续重试；连接关闭后继续 backoff retry。
- Gateway 健康状态进入 workspace store 和侧边栏 UI：`connecting/reconnecting/retrying/stopped` 可见。
- `gateway-health.jsonl`：记录 start、failed、retry、reconnecting、reconnected、closed、stopped。
- `MessageDeliveryService`：收敛 gateway push 对 IM/客服 domain 的写入入口。
- `message-delivery.jsonl`：记录 push received、delivery guard、cache write、latency。
- `MessageGapSyncCoordinator`：连接成功、重连、snapshot seq gap、push seq gap 时触发补偿。
- `message-gap-sync.jsonl`：记录缺口触发原因和当前补偿模式。
- IM read view 和客服 unread ledger 已初步隔离，badge 不再直接叠加 realtime reminder 数。
- `ChatSendRuntime` 已作为 IM/客服发送底座的公共 runtime。

## 4. 必须继续补齐的服务端契约

所有实时事件必须携带稳定字段：

- 消息定位：`messageId`、`conversationId/threadId`、`conversationType/threadType`。
- 顺序定位：全局 `cursor` 或会话级 `seq/conversationSeq`。
- 发送方：`senderId/fromUserId/platformUserId/lppId`、`direction/isMine/isSelf`。
- 时间：可信 `serverTime/sentAt/createdAt`。

Gap sync 至少需要一种服务端能力：

1. 全局 cursor：`GET /api/client/v1/messages/sync?afterCursor=...`
2. 会话级 seq：`GET /api/client/v1/conversations/{conversationId}/messages?afterSeq=...&limit=...`
3. Gateway reconnect resume：客户端重连提交 last cursor，服务端通过 gateway 补发断线事件。

如果服务端短期只能提供历史消息列表，前端只能做会话级 refetch 过渡，不能宣称已经具备完整成熟 gap sync。

## 5. 前端实现规则

### Transport

- 一个登录 scope 只允许一个有效 connection。
- session 切换必须停止旧 connection、取消旧 retry、阻止旧连接继续写状态。
- 初始连接失败不能静默退化为轮询，必须持续重试并写健康日志。
- 重连成功必须触发 gap sync。

### Delivery

- `msg.new` 不得在 ownership 之前写 IM cache。
- 普通 IM direct/group 只进入 IM domain。
- 在线客服 temp session 只进入客服 domain，不进入 IM 会话列表。
- 未知消息默认保护 IM。
- 同一 `messageId` 或 `conversationId + seq` 只处理一次。
- seq 倒退或重复不写 domain cache；seq 跳号触发 gap sync，但不阻塞当前 push。

### Snapshot

- Snapshot 只做 startup/reconcile/gap-detection。
- Snapshot 不得绕过 ownership 写 IM/客服状态。
- Snapshot 不得把 `pc-im-conversations.tempSession.unreadCount` 直接当客服最终未读。
- Snapshot 不得覆盖 push 新摘要、新未读、新发送状态。

### IM

- IM 未读只由 IM read model 管理。
- 对方 read receipt 只更新 peer read，不清当前账号 unread。
- 只有 `paneVisible && messagesLoaded` 才能自动 mark read。
- 默认选中、query 存在、列表刷新、snapshot reconcile 都不能触发已读。
- IM 列表、侧栏 badge、任务栏 badge 必须读取同一个 IM effective unread view。

### 在线客服

- 客服未读只统计访客消息。
- 客服自己发送只更新摘要和 self marker，不增加未读、不提醒。
- 点击“在线客服”菜单不清临时会话未读。
- 只有点击具体临时会话或从提醒打开，并且详情加载成功后，才按 `threadId + conversationId` 清 ledger、badge、taskbar、realtime reminder。
- Workbench 空摘要时可用兼容 preview 兜底；不可信 raw unread 不能进入最终 badge。

### 发送

- IM 与客服共用 `ChatSendRuntime` 的 outbox、附件、截图、失败重试、诊断和发送状态机能力。
- IM 与客服保留各自 API endpoint、权限校验、协议适配、domain merge、未读影响规则。
- 自己发送成功不制造未读、不触发桌面提醒。
- 失败、重发、撤回、编辑必须通过统一状态机更新，UI 不自行拼状态。

## 6. 诊断与验收

核心日志：

- `gateway-health.jsonl`：连接、失败、重试、重连、heartbeat。
- `message-delivery.jsonl`：push received、delivery guard、ownership、cache write、latency。
- `message-gap-sync.jsonl`：缺口检测、补偿范围、补偿结果。
- `im-read.jsonl`：IM read/unread/reconcile 决策。
- `customer-service-reminder.jsonl`：客服 ledger、badge、read clear、提醒决策。

验收标准：

- 正常 IM/客服收消息必须出现 `gateway.push.received`。
- Push 到 effective badge 更新目标耗时小于 500ms。
- 初始 gateway 失败后无需重启客户端，日志持续出现 retry。
- 重连成功后必须出现 `message.gap-sync.triggered`。
- Snapshot 发现的新消息必须标记为 reconcile/source，不允许伪装成 realtime push。
- 临时会话不进入 IM；客服未读只统计访客消息。

## 7. 回归测试

必须保留以下回归：

- `npx.cmd vitest run tests/unit`
- `npm.cmd run typecheck -- --pretty false`
- `npm.cmd run build`

关键单测场景：

- 初始 gateway start 失败持续 retry。
- 连接 close 后 manager 继续 retry。
- session 切换取消旧 retry 和旧 connection。
- IM push 只写 IM domain，不立即刷新旧 snapshot 覆盖 push 状态。
- 客服 temp session push 只写客服 domain，不进入 IM 会话列表。
- 重复 `messageId` 不重复写 cache。
- seq 倒退不写 cache。
- seq 跳号触发 gap sync。
- 非当前 IM 会话保留未读；当前详情可见才自动已读。
- 客服点击菜单不清未读；点击具体线程并详情加载成功才清未读。
- 客服自己发送不增加未读、不提醒。

## 8. 顶级系统能力清单

一个顶级 IM + 在线客服系统，不能只解决“能收到消息”。必须同时做到：

- **实时性**：正常网络下 push 到 UI 变化小于 500ms；弱网下自动恢复，不需要用户刷新。
- **一致性**：push、snapshot、history、workbench、detail 多来源进入同一套 delivery/reconcile 规则。
- **幂等性**：同一消息、同一读回执、同一客服事件重复到达不会重复写 cache、重复提醒或重复计未读。
- **可恢复性**：断线、重连、客户端重启后能通过 cursor/seq 补齐缺口。
- **边界清晰**：IM direct/group 与客服 temp session 在归属、未读、提醒、已读、发送状态上完全隔离。
- **用户体验正确**：当前正在看的会话不制造未读；未看的会话不被自动清未读；客服自己发送不算访客未读。
- **可观测性**：每一次消息延迟、未读变化、提醒决策、gap sync 都能从日志串起来。
- **可演进性**：新增撤回、编辑、引用、已读人数、客服转接、SLA 等能力时，不破坏地基。

## 9. 服务端协议契约详细设计

### 9.1 通用事件信封

所有 gateway 事件建议统一为以下信封，字段名可以兼容现有协议，但 normalize 后必须得到同一模型：

```ts
interface GatewayEventEnvelope<TPayload> {
  eventId: string;
  eventName: string;
  ownerHint?: "im" | "customerService";
  tenantId?: string;
  workspaceId?: string;
  accountId?: string;
  cursor?: string;
  serverTime: string;
  payload: TPayload;
}
```

规则：

- `eventId` 用于事件级幂等；没有时前端退化到 payload 内 `messageId` 或 `conversationId + seq`。
- `cursor` 是全局顺序游标；如果服务端暂不支持，必须至少有会话级 `seq`。
- `serverTime` 必须由服务端生成，不使用客户端时间判断顺序。
- `ownerHint` 只能作为提示，最终仍由 `ConversationOwnershipResolver` 判定。

### 9.2 消息事件契约

```ts
interface MessageCreatedEvent {
  messageId: string;
  clientMsgId?: string;
  conversationId: string;
  conversationType: "direct" | "group" | "temp_session";
  threadId?: string;
  threadType?: "temp_session" | "customer_service";
  seq: number;
  senderId: string;
  senderRole?: "user" | "visitor" | "staff" | "system";
  direction?: "in" | "out";
  isMine?: boolean;
  messageType: "text" | "image" | "file" | "video" | "audio" | "system" | "card";
  body: unknown;
  sentAt: string;
}
```

规则：

- IM direct/group 必须有 `conversationId + conversationType + seq`。
- 客服 temp session 必须有 `threadId` 或可从 `conversationId` 映射到 `threadId` 的明确证据。
- 客服访客消息必须能被识别为非自己：`senderRole=visitor`、`direction=in` 或 sender 与当前客服身份不匹配。
- 客服自己消息必须能被识别为自己：`senderRole=staff`、`direction=out`、`isMine=true` 或 sender 命中当前客服身份。

### 9.3 Read Receipt 契约

```ts
interface ReadReceiptEvent {
  conversationId: string;
  conversationType: "direct" | "group";
  readerId: string;
  readerRole?: "user" | "visitor" | "staff";
  readSeq: number;
  readAt: string;
}
```

规则：

- 当前用户 read receipt 才能推进 `myReadSeq` 并清当前账号 unread。
- 对方 read receipt 只能更新 `peerReadSeq` 或已读展示，不清当前账号 unread。
- 客服 read clear 不复用 IM read receipt；客服按 `threadId + conversationId` 清 ledger。

### 9.4 Gap Sync 契约

优先级：

1. 全局 cursor sync。
2. 会话级 afterSeq sync。
3. Gateway reconnect resume。
4. 现有 history/refetch 过渡兜底。

全局 cursor 推荐响应：

```ts
interface MessageSyncResponse {
  events: GatewayEventEnvelope<unknown>[];
  nextCursor: string;
  hasMore: boolean;
  serverTime: string;
}
```

会话级 afterSeq 推荐响应：

```ts
interface ConversationGapResponse {
  conversationId: string;
  messages: MessageCreatedEvent[];
  readReceipts?: ReadReceiptEvent[];
  serverLastSeq: number;
  hasMore: boolean;
}
```

规则：

- 补偿事件必须继续走 `MessageDeliveryService`，不能直接写 cache。
- gap sync 返回的旧消息如果被 delivery guard 判定为重复，应跳过。
- gap sync 失败只影响补偿，不影响当前 push；必须记录失败并重试。

## 10. 客户端状态机详细设计

### 10.1 GatewayConnectionManager

状态：

```text
idle -> connecting -> connected
connecting -> retrying
connected -> reconnecting -> connected
reconnecting -> retrying
retrying -> connecting
* -> stopped
```

规则：

- `connecting` 初始失败进入 `retrying`，按 `1s, 2s, 5s, 10s, 30s` backoff，之后维持 30s。
- SignalR 自动 reconnect 成功后触发 `gateway-reconnected` gap sync。
- SignalR reconnect 失败进入最终 close 后，manager 接管继续 retry。
- session scope 变化必须递增 generation，旧 connection 的回调不得写新 session 状态。
- 每次状态变化写 `gateway-health.jsonl`，UI 同步展示连接状态。

### 10.2 MessageDeliveryService

统一投递状态：

```text
received -> normalized -> ownershipResolved -> guardChecked -> domainWritten -> viewResolved
                                      |             |
                                      |             -> skippedDuplicate/skippedStale
                                      -> routedUnknownDefaultIm
```

规则：

- `message.delivery.guard` 必须先于 domain writer。
- `messageId` 重复：跳过。
- `seq <= highestSeq`：跳过，防止旧 snapshot 或旧 push 回滚 UI。
- `seq > highestSeq + 1`：写当前消息，同时触发 `push-seq-gap`。
- 没有 `seq` 的消息允许写入，但日志标记 `seqMissing`；这类消息不能作为强一致依据。

### 10.3 Snapshot Reconcile

Snapshot 输入必须先标记来源：

- `startup-snapshot`：启动首屏。
- `consistency-check`：低频校验。
- `gap-fallback-refetch`：gap sync 过渡补偿。

规则：

- Snapshot 可以补齐缺失会话，但不能覆盖本地更高 seq 的 push 状态。
- Snapshot 发现 `serverLastSeq > localLastSeq + 1` 时触发 gap sync。
- Snapshot 发现 `serverLastSeq <= localLastSeq` 时只做非破坏性字段合并，如头像、标题、成员信息。
- Snapshot 不能直接弹桌面通知；通知必须由 delivery/reminder 决策产生。

## 11. IM 领域详细设计

### 11.1 IM 会话归属

- `direct/group/im_direct/im_group` 明确归 IM。
- `temp_session/customer_service` 明确归客服。
- `direct_customer/customer_direct` 不自动归客服，除非同条 payload 有明确 temp session 证据。
- 无明确客服证据的 `msg.new` 默认 IM，并记录 `unknown-default-im`。

### 11.2 IM 未读

IM effective unread 输入：

- 服务端 conversation unread。
- 本地 read state：`myReadSeq`、`peerReadSeq`、`lastMessageSeq`。
- push message reducer。
- current-user read receipt。
- visible read command。

清未读条件：

- 当前用户发送成功，推进自身发送消息 readSeq。
- 当前用户 read receipt。
- 用户真实看到会话：`activeModule=messages && activeConversationId=conversationId && paneVisible && messagesLoaded`。

禁止清未读条件：

- 会话列表默认选中。
- query 已存在。
- snapshot 返回 unread=0，但本地有更高 seq 的未读 push。
- 对方 read receipt。

### 11.3 IM 提醒

- 当前可见会话不弹桌面通知。
- 非当前会话收到对方消息：更新 IM badge、任务栏、提醒中心，并按设置决定桌面通知。
- 自己消息不提醒。
- 同一 `conversationId + messageId` 只提醒一次。

## 12. 在线客服领域详细设计

### 12.1 客服线程归属

客服 temp session 归属证据：

- eventName 是客服事件。
- payload 明确 `threadType=temp_session`。
- payload 有 `tempSession.sessionId`。
- `conversationId` 命中同账号/工作区下由明确 temp session 建立的索引。

非证据：

- 字段名里出现 `service/customer` 但没有 temp session/threadType。
- `direct_customer/customer_direct` 单独出现。
- `pc-im-conversations.unreadCount` 单独出现。

### 12.2 CustomerServiceUnreadLedger

Ledger 输入：

- `gatewayVisitorUnread`：gateway 明确访客消息，按 messageId 去重 +1。
- `detailVisitorUnread`：详情加载后按消息列表统计非自己访客消息。
- `workbenchServerUnread`：workbench 明确可信 unread。
- `compatRawUnread`：兼容列表原始 unread，只做诊断。
- `compatTrustedUnreadCandidate`：只有 lastMessage 明确入站/访客时才可作为候选。
- `localStaffSentSeqs`：客服自己发送 marker，用于压制兼容回流假未读。
- `readClearSeq/readClearAt`：进入详情加载成功后的清理水位。

优先级：

```text
detailVisitorUnread
  > gatewayVisitorUnread
  > workbenchServerUnread
  > compatTrustedUnreadCandidate
  > 0
```

规则：

- 不可信 `compatRawUnread` 不进入最终 badge。
- 自己发送只更新 preview 和 self marker。
- read clear 按 `threadId + conversationId + scopeKey` 双 key 清理。

### 12.3 客服已读

可见性：

```text
hidden      不在在线客服模块，或没有选中线程
listOnly    在在线客服模块，但只看到列表/自动选中
detailVisible 用户明确打开线程，且详情消息加载成功
```

清未读条件：

- `activeModule=onlineService`
- `activeThreadId=threadId`
- `activeThreadOpenSource in user/reminder/claim`
- detail query 成功加载

禁止清未读：

- 点击在线客服菜单。
- workbench 自动刷新。
- 线程列表自动选中。
- 兼容 overlay 更新。

### 12.4 客服提醒

- 访客消息更新在线客服 badge、任务栏、线程卡片、提醒中心。
- 当前 detailVisible 的线程不弹桌面通知，并在详情加载成功后清未读。
- 当前只是 onlineService/listOnly 时，仍保留菜单和线程未读。
- 客服自己发送不提醒。
- 同一 `threadId + messageId` 只提醒一次。

## 13. 发送链路详细设计

### 13.1 公共 runtime

`ChatSendRuntime` 负责：

- 生成 `clientMsgId/localMessageId`。
- outbox 写入、更新、删除。
- 附件 blob/poster key 管理。
- 上传状态、发送状态、失败诊断。
- 统一发送日志。

### 13.2 IM send use case

IM 自己负责：

- IM API endpoint。
- direct/group 目标校验。
- 乐观消息写 IM cache。
- 发送成功 merge server message。
- 发送失败标记并允许重发。
- 成功后不制造未读。

### 13.3 客服 send use case

客服自己负责：

- 客服 API endpoint。
- 线程是否可发送、是否已接入、是否已结束等权限校验。
- 乐观消息写客服详情和线程摘要。
- 记录 `localStaffSentSeqs/clientMsgId`，防止兼容 unread 把自己消息算访客未读。
- 成功后不提醒、不增加 unread。

## 14. UI 与产品体验细则

### 14.1 消息模块

- “消息”只展示 IM direct/group。
- 临时会话永远不在 IM 会话列表闪现。
- 当前右侧可见会话收到消息时，列表不显示该会话未读。
- 非当前会话收到消息时，列表和左侧菜单显示未读。

### 14.2 在线客服模块

- 点击在线客服菜单只进入工作台，不自动打开或读取某个临时会话。
- 工作台显示当前、排队、进行中、SLA、历史数量。
- 有新访客消息时，线程卡片必须显示最新摘要，不得显示“暂无消息”。
- 只有用户点击具体线程后，右侧详情才进入已读逻辑。

### 14.3 通知与任务栏

- badge 数字表示 effective unread，不表示 reminder 条数。
- reminder center 可以记录每条提醒，但不能叠加到 badge 数字。
- 桌面通知遵循设置、窗口焦点、当前可见目标。
- Gateway 异常时显示实时连接状态，避免用户误判系统正常。

## 15. 性能与可靠性指标

目标指标：

- Gateway push received 到 domain cache write：P95 < 100ms。
- Domain cache write 到 UI badge 更新：P95 < 300ms。
- Gateway push 到用户可见 badge：P95 < 500ms。
- 初始连接失败后首次 retry：<= 1s。
- 重连成功后 gap sync 触发：<= 500ms。
- 重复消息写 cache 次数：0。
- 客服自己消息误计未读次数：0。
- temp session 进入 IM 列表次数：0。

降级策略：

- Gateway 不可用：持续 retry + UI 显示同步中。
- Gap sync 接口不可用：使用现有 conversation/message refetch 过渡，并写 `fallback-refetch`。
- Snapshot 与 push 冲突：保留 seq 更新的一方，优先保护 push 新状态。
- 诊断写入失败：不得影响消息收发。

## 16. 安全、隐私与多账号隔离

- 所有 index、ledger、outbox、read state 必须按 `tenant/workspace/account` scope 隔离。
- 明文诊断只允许排查期使用；稳定后切回脱敏。
- 脱敏日志保留枚举、字段存在性、ID 后 6 位、seq、耗时，不记录正文、token、手机号、完整用户 ID。
- force logout 必须清 query、auth、gateway、ledger、outbox session scope 状态。
- 旧 session gateway 回调不得写新 session cache。

## 17. 分阶段落地路线

### Phase 1：前端地基稳定

- 完成 Gateway 强主链路、持续 retry、健康 UI。
- 完成 MessageDeliveryService 幂等、seq guard、gap 触发。
- 完成 IM read view 和客服 unread ledger 隔离。
- 完成 badge/effective view 收敛。
- 完成诊断分文件。

### Phase 2：服务端 gap sync 契约

- 服务端提供全局 cursor 或会话级 afterSeq。
- 前端 gap sync coordinator 接入真实缺口拉取。
- 补偿消息走 delivery service。
- 删除或降级 fallback refetch 的实时语义。

### Phase 3：发送状态机统一

- IM/客服发送 use case 全部接入 ChatSendRuntime。
- 附件、截图、失败重试、乐观消息、回执 merge 统一。
- 客服 self marker 与发送成功回流彻底闭环。

### Phase 4：高级 IM/客服能力

- 撤回、编辑、引用、转发、多端同步、typing。
- 群已读、成员变更、会话置顶/免打扰。
- 客服转接、结束、SLA 预警、排队状态、服务评价。
- 全链路性能看板和异常告警。

## 18. 最终验收清单

- 正常网络下 IM 和客服消息都通过 gateway push 到达。
- 断网后恢复无需重启客户端，消息能补齐。
- Push、snapshot、gap sync 同一消息只处理一次。
- IM direct/group 与客服 temp session 不串线。
- IM 当前可见会话不显示未读；非当前会话保留未读。
- 客服点击菜单不清未读；点击具体线程详情加载成功才清未读。
- 客服自己消息不算访客未读。
- Workbench 空摘要时线程卡片仍有兜底 preview。
- Badge 数字不叠加 reminder 数。
- 日志能串起：gateway received -> delivery guard -> domain write -> view resolve -> notification decision。

## 19. Push 与主动查询同步的协作合同

成熟系统不是只有长连接，也不是靠轮询伪装实时。正确关系是：

```text
长连接 push = 实时主链路
主动查询同步 = 初始化 + 补偿 + 校验 + 用户主动加载
轮询 = 最低优先级降级方案，不承担实时职责
```

### 19.1 主动查询同步的合法场景

主动查询必须存在，但只能在以下场景发挥作用：

- **启动初始化**：登录后拉会话列表、最近消息、未读、客服 workbench，让首屏可用。
- **重连补偿**：gateway 断开后重连成功，按 cursor/seq 主动补齐断线期间事件。
- **seq gap 补偿**：push 发现 seq 跳号时，主动查询缺失区间。
- **低频一致性校验**：校验本地摘要、未读、readSeq 是否落后。
- **用户主动加载**：打开会话详情、加载更早消息、搜索、翻页、打开客服资料和历史轨迹。

禁止事项：

- 禁止把高频 snapshot/refetch 当作实时消息入口。
- 禁止 query 结果绕过 ownership/delivery 直接写 IM 或客服状态。
- 禁止 snapshot 覆盖本地更高 seq 的 push 状态。
- 禁止 query raw unread 直接覆盖 IM read model 或客服 unread ledger。

### 19.2 统一入口原则

push 与主动查询必须进入同一个合并模型：

```text
gateway push
  -> MessageDeliveryService

gap sync result
  -> MessageDeliveryService

history/detail messages
  -> MessageDeliveryService 或同等 domain merge guard

conversation/workbench snapshot
  -> SnapshotReconcileService
  -> ownership + seq/version guard
  -> domain/effective view
```

规则：

- UI 不能直接拿 query 结果覆盖本地 cache。
- IM 和客服 domain writer 之前必须经过 ownership resolve。
- 消息级数据必须经过 `messageId` / `conversationId + seq` 幂等。
- 会话摘要必须经过 `lastMessageSeq/serverVersion` 比较。
- 未读必须由 IM read model 或客服 unread ledger 计算，不能直接相信 raw unread。

### 19.3 顺序与覆盖规则

所有来源进入合并前必须比较顺序：

```text
incomingSeq > localSeq
  可以更新消息、摘要、未读输入，并触发 view resolve

incomingSeq === localSeq
  只补充非关键字段，例如头像、昵称、附件元信息、发送状态确认

incomingSeq < localSeq
  丢弃关键状态，不能覆盖摘要、未读、发送状态

incomingSeq 缺失
  只能作为弱数据，不能覆盖已有强 seq 状态
```

强状态包括：

- 最新消息摘要。
- lastMessageSeq / cursor。
- unread 输入。
- readSeq。
- 发送状态。
- 客服线程有效未读。

弱状态包括：

- 头像、昵称、来源渠道名称。
- UI 展示补充字段。
- 没有 seq/version 的 preview。

### 19.4 幂等规则

统一幂等 key：

- 消息：`scopeKey + owner + messageId`。
- 无 messageId 消息：`scopeKey + owner + conversationId/threadId + seq`。
- IM read receipt：`scopeKey + conversationId + readerId + readSeq`。
- 客服提醒：`scopeKey + threadId + messageId`。
- 客服状态事件：`scopeKey + threadId + eventId/statusVersion`。

结果：

- 重复消息不重复写 cache。
- 重复 read receipt 不重复清 unread。
- 重复客服事件不重复提醒。
- gap sync 返回已由 push 处理过的消息时直接跳过。

### 19.5 Push 与 Snapshot 的冲突示例

场景一：push 先到，snapshot 后到旧数据。

```text
本地收到 push: seq=105, unread=1
随后 snapshot 返回: lastSeq=104, unread=0
处理：保留 push 状态，丢弃 snapshot 的摘要/未读覆盖
```

场景二：重连后 gap sync 返回重复消息。

```text
本地已有 push: messageId=A, seq=105
gap sync 返回: seq=101..105
处理：101..104 补齐；105 因 messageId/seq 重复跳过
```

场景三：客服 gateway 有访客消息，workbench 返回空摘要。

```text
gateway: visitor messageId=A, thread unread +1
workbench: unread=0, preview=null
处理：保留 ledger 未读和 gateway preview；workbench 不覆盖
```

场景四：compat tempSession 有 rawUnread。

```text
pc-im-conversations.tempSession: rawUnread=5
lastMessage 缺 sender/direction
处理：只做诊断和 preview 兜底，不进入最终客服 badge
```

### 19.6 Reconcile Service 职责

后续应明确 `SnapshotReconcileService`，职责是：

- 接收 conversation/workbench/detail snapshot。
- 判定 owner。
- 比较 seq/version。
- 补充缺失弱字段。
- 发现本地落后时触发 gap sync。
- 拒绝旧 snapshot 覆盖 push 新状态。

它不能：

- 直接弹通知。
- 直接清未读。
- 直接把 raw unread 写入 UI。
- 直接绕过 MessageDeliveryService 写消息。

### 19.7 验收标准

- push 后 1 秒内到达的旧 snapshot 不得清掉新 unread。
- gap sync 返回重复消息不重复提醒。
- snapshot 返回客服 raw unread 不得直接进入客服 badge。
- detail/history 返回消息与 gateway push 同一 messageId 时只展示一条。
- 打开当前会话的 detail query 只能在 visibility 满足时触发已读。
- 日志能串起每次冲突处理：source、incomingSeq、localSeq、decision、reason。
