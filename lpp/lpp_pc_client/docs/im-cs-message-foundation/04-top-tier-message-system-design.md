# PC IM + 在线客服消息系统顶级设计

日期：2026-06-02

## 1. 设计定位

本设计不是对现有方案的覆盖，而是在真实代码分析基础上定义目标形态。它用于指导后续重构、测试和验收，避免继续围绕单个 bug 做局部补丁。

PC 端消息系统应当被拆成两个业务域和一组共享基础设施：

- 普通 IM 域：好友私聊、群聊、普通消息未读、已读回执、IM 发送、IM 会话列表。
- 在线客服域：临时会话、排队、接待中、客服工作台、访客未读、客服提醒。
- 共享基础设施：上传、outbox、发送状态机、媒体缓存、桌面通知、诊断、API contract normalize。

核心判断：**IM 和在线客服不能共用业务状态模型，但应该共用底层工程能力。**

## 2. 顶级分层

目标系统分为 8 层。

### Layer 1: Transport And Backend Contract

职责：

- HTTP API。
- Gateway event。
- DTO normalize。
- contract validation。

设计要求：

- 每个 API/Gateway payload 进入业务前必须 normalize。
- normalize 结果必须带 contract level：`ok | degraded | blocking`。
- blocking 状态不能输出伪精确 unread。
- Gateway 事件不能直接写 UI cache，必须先过 ownership。

### Layer 2: Conversation Ownership

职责：

- 判断消息或会话属于 IM、在线客服，还是 unknown。

目标接口：

```ts
type ConversationOwner = "im" | "customerService" | "unknown";
type OwnershipConfidence = "explicit" | "indexed" | "unknown";

interface ResolveOwnershipInput {
  scopeKey: string;
  source: "gateway" | "imList" | "csWorkbench" | "csDetail";
  eventName?: string;
  payload: Record<string, unknown>;
}

interface ConversationOwnershipResult {
  owner: ConversationOwner;
  confidence: OwnershipConfidence;
  conversationId?: string;
  threadId?: string;
  threadType?: "temp_session" | "im_direct";
  reason:
    | "explicit-im"
    | "explicit-temp-session"
    | "indexed-temp-session"
    | "unknown-default-im"
    | "blocking-missing-scope";
  scopeKey: string;
}
```

规则：

- 明确 `direct/group/im_direct/im_group/direct_chat/group_chat` 归 IM。
- 明确 `tempSession/temp_session/threadType=temp_session` 归在线客服。
- `direct_customer/customer_direct` 没有明确 `tempSession` 时归 IM，保护普通 IM 主链路。
- 无明确证据的 `msg.new` 默认归 IM，并写 `unknown-default-im` 诊断。
- indexed temp session 必须同 `scopeKey` 命中，禁止跨账号、跨租户、跨工作区查找。

### Layer 3: Domain Core

分为两个独立 core。

#### IM Core

Owner：

- `ImConversationReadModel`

职责：

- 当前用户 read cursor。
- 对方 read cursor。
- effective unread。
- outgoing bubble read/sent。
- mark read command。
- snapshot merge。
- stale snapshot 防回退。

IM Core 只接受事实，不访问 React、QueryClient、localStorage、API client。

核心事实：

```ts
type ImCoreEvent =
  | "api.conversation_snapshot"
  | "gateway.message_received"
  | "gateway.read_received"
  | "send.message_succeeded"
  | "ui.conversation_visible";
```

核心输出：

```ts
interface ImConversationView {
  conversationKey: string;
  conversationId: string;
  conversationType: "direct" | "group";
  effectiveUnread: number;
  shouldShowUnreadBadge: boolean;
  shouldNotify: boolean;
  shouldMarkRead: boolean;
  readReason: string;
}
```

#### Customer Service Core

Owner：

- `CustomerServiceUnreadLedger`

职责：

- 访客未读。
- 客服自己发送抑制。
- workbench server unread 合并。
- detail visitor count 兜底。
- tempSession compat candidate。
- effective preview。
- service badge 和 notification decision。

客服 core 只计算客服视角的未读。它不计算 IM 未读，也不写 IM cache。

核心事实：

```ts
type CustomerServiceLedgerEvent =
  | "gateway.visitor_message"
  | "gateway.staff_echo"
  | "send.staff_message"
  | "workbench.snapshot"
  | "detail.loaded"
  | "compat.temp_session_snapshot"
  | "ui.thread_detail_loaded"
  | "read.clear";
```

核心输出：

```ts
interface CustomerServiceThreadView {
  scopeKey: string;
  threadId: string;
  conversationId?: string;
  effectiveUnread: number;
  effectivePreview?: string;
  effectiveLastMessageAt?: string | null;
  shouldShowUnreadBadge: boolean;
  shouldNotify: boolean;
  unreadReason:
    | "gateway-visitor"
    | "detail-visitor-count"
    | "workbench-trusted"
    | "compat-bounded"
    | "read-clear"
    | "none";
}
```

### Layer 4: Application Services

职责：

- 把 API/Gateway/UI/send facts 转成 core event。
- 执行 core command。
- 写 Query cache。
- 写本地 store。
- 触发 reminder decision。

目标服务：

- `ImMessageApplicationService`
- `CustomerServiceApplicationService`
- `ConversationOwnershipApplicationService`

设计要求：

- Application service 可以 import QueryClient/API/runtime。
- Domain core 不允许 import QueryClient/API/runtime。
- UI hook 只调用 application service，不直接决定 unread。

### Layer 5: Cache And Store

职责：

- Query cache 写入。
- 本地 read state。
- outbox state。
- ledger state。

设计要求：

- IM cache 只包含普通 IM direct/group。
- 客服 cache 只包含客服 thread/detail/workbench。
- tempSession compat 数据先进入客服 bridge，再进入客服 ledger。
- 所有本地状态 key 必须包含 `scopeKey`。

### Layer 6: Shared Send Runtime

职责：

- clientMsgId/localMessageId。
- local echo 生命周期。
- upload。
- video poster。
- local media cache。
- outbox。
- send diagnostics。
- retry/pause/cancel。

目标接口：

```ts
interface ChatSendRuntimeAdapter<TTarget, TResult> {
  channel: "im" | "customer_service";
  buildLocalMessage(input: ChatSendInput<TTarget>): MessageItemDto;
  sendToServer(input: ChatSendInput<TTarget>): Promise<TResult>;
  mergeSucceeded(result: TResult): void;
  mergeFailed(error: unknown): void;
}
```

规则：

- runtime 公用流程。
- adapter 保留业务差异。
- IM adapter 调 direct/group endpoint。
- 客服 adapter 调 workbench thread endpoint。
- IM 名片入口不默认暴露给客服。
- 客服快捷话术/知识库/AI 起草不暴露给 IM。

### Layer 7: UI View Models

职责：

- 把 domain view 转换成组件 props。
- 控制布局、空态、按钮可见性。
- 不拥有 unread/read/reminder policy。

设计要求：

- 会话列表、未读筛选、Sidebar badge、Header badge 必须来自同一 view model。
- 当前会话可见性必须统一：`hidden | listOnly | paneVisible`。
- `paneVisible && messagesLoaded` 才代表用户真实正在看该会话。

### Layer 8: Diagnostics And Observability

职责：

- 落盘诊断。
- 事件链路追踪。
- 重复/异常状态定位。

诊断文件：

- `cs-routing.jsonl`
- `im-read.jsonl`
- `customer-service-reminder.jsonl`
- `message-reminder.jsonl` 高层摘要。

每条 unread 变化必须能回答：

- 哪个 payload 进入系统。
- ownership 判定是什么。
- 进入哪个 core。
- before/after unread 是什么。
- 是否 self message。
- 是否 active visible。
- 是否发 mark read。
- 是否触发 badge。
- 是否触发 desktop notification。

## 3. 关键数据流

### 3.1 Gateway `msg.new`

```text
Gateway msg.new
  -> normalize payload
  -> resolve ownership(scopeKey)
  -> IM core or CustomerService ledger
  -> write domain cache
  -> derive badge/reminder
  -> write diagnostics
```

约束：

- ownership 之前不能写 IM cache。
- customer service route 不能 invalidate `pc-im-conversations`。
- IM route 不能写客服 ledger。

### 3.2 IM 当前会话收到消息

```text
gateway.message_received
  -> IM core appends message fact
  -> UI visible fact exists only if paneVisible + messagesLoaded
  -> if visible: effectiveUnread=0 and emit mark_read
  -> if not visible: effectiveUnread>0 and may notify
```

约束：

- `activeConversationId` 不是已读证据。
- auto selected 不是已读证据。
- Query 存在不是已读证据。

### 3.3 在线客服访客消息

```text
gateway/tempSession/workbench/compat
  -> ownership customerService
  -> CustomerServiceUnreadLedger
  -> effective thread view
  -> onlineService badge / taskbar / notification
```

约束：

- 客服自己发送不增加 unread。
- compat raw unread 不直接当最终 unread。
- workbench empty preview 可以被 compat preview 补齐。
- 进入详情加载成功后 read clear。

### 3.4 发送消息

```text
UI submit
  -> ChatSendRuntime
  -> local echo
  -> outbox
  -> upload if needed
  -> business adapter sendToServer
  -> adapter mergeSucceeded
  -> domain event send.message_succeeded / send.staff_message
```

约束：

- 发送 runtime 共享。
- 业务 endpoint 不共享。
- cache merge 不共享。
- unread policy 不在 send hook 里手写。

## 4. 状态源定义

### IM 权威状态源

| 状态 | 权威来源 |
| --- | --- |
| 归属 | `ConversationOwnershipResolver` |
| 消息列表 | IM API/Gateway + IM cache |
| 当前用户 unread | `ImConversationReadModel` |
| 当前用户 read cursor | IM read state + server readSeq |
| 对方 read cursor | read receipt / direct read status |
| badge | IM conversation view aggregate |
| desktop notification | IM reminder decision |

### 在线客服权威状态源

| 状态 | 权威来源 |
| --- | --- |
| 归属 | `ConversationOwnershipResolver` |
| thread 列表 | workbench API + CS ledger overlay |
| 访客未读 | `CustomerServiceUnreadLedger` |
| 摘要 | workbench preview，空时 compat/detail/gateway preview |
| 队列数量 | workbench queue |
| badge | CS thread view aggregate + queue count |
| desktop notification | CS reminder decision |

## 5. 严禁事项

- UI 组件直接显示 raw `unreadCount`。
- Gateway 在 ownership 之前写 cache。
- IM route 写客服 ledger。
- 客服 route 写 IM cache。
- 用 `activeConversationId`、query 存在、默认选中作为已读证据。
- 用 `peerUserId === currentUser` 判断自己最后一条消息。
- 用 `readAt` 覆盖明确 `serverUnread > 0` 的新消息。
- 把 `pc-im-conversations.tempSession.unreadCount` 直接当客服未读。
- badge 数字叠加 realtime reminder 数量。
- 无 scope 查询客服 indexed ownership。

## 6. 后端协议建议

为了让前端从兼容兜底升级为稳定协议，后端应补齐：

### IM

- `conversationType`
- `conversationId`
- `lastMessageSeq`
- `lastReadSeq`
- `unreadCount`
- direct `peerReadSeq`
- message `conversationSeq`
- message sender identity
- message direction

### 在线客服

- `threadType`
- `threadId`
- `conversationId`
- `visitorUnreadCount`
- `lastMessagePreview`
- `lastMessageAt`
- `lastMessageId`
- last message `senderRole: visitor | staff | system`
- last message `direction`
- detail messages sender role/direction

若后端不提供 `visitorUnreadCount` 和 sender role，前端只能做 bounded compat candidate，不能保证所有边界都精确。

## 7. 测试策略

### 7.1 Contract Tests

覆盖：

- IM conversation DTO。
- IM message DTO。
- customer service workbench DTO。
- tempSession compat DTO。
- gateway `msg.new`。
- gateway `msg.read`。

### 7.2 Domain Model Tests

IM：

- 非当前会话 incoming unread。
- 当前 paneVisible incoming auto read。
- auto selected listOnly 不 auto read。
- self message 不 unread。
- peer read 不清我的 unread。
- stale snapshot 不回退。

客服：

- visitor message +1。
- staff message +0。
- workbench unread trusted。
- compat raw bounded。
- detail visitor count。
- read clear。
- 多来源同 messageId 去重。

### 7.3 Boundary Tests

覆盖：

- IM 不 import 客服 ledger。
- 客服不 import IM cache mutation。
- ownership resolver 调用必须带 scope。
- Sidebar 不读取 tempSession raw unread。
- Gateway router 必须先 ownership 再 side effect。

### 7.4 UI Integration Tests

覆盖：

- IM 当前会话无未读。
- IM 后台会话有未读。
- tempSession 不闪进 IM。
- 在线客服访客消息有提醒。
- 在线客服自己消息不提醒。
- 进入客服详情清零。

## 8. 落地路线

### Phase 1: 锁边界

- 新增 architecture boundary tests。
- ownership resolver scoped 化。
- 禁止无 scope indexed lookup。

### Phase 2: IM effective unread 收敛

- `message-display.ts` 降级为 facade。
- Sidebar、会话列表、未读 tab、Header 全部用 IM view。
- Gateway 不再拥有 active read policy。

### Phase 3: 客服 ledger 正名

- 从 `cs-conversation-index.ts` 拆出 `CustomerServiceUnreadLedger`。
- compat index 只保留归属和摘要。
- workbench merge 读取 ledger view。

### Phase 4: Send runtime 抽象

- 提取 `ChatSendRuntime`。
- IM/客服分别实现 adapter。
- 发送 hook 去业务状态机化。

### Phase 5: Reminder/badge 统一

- badge 只聚合 effective unread。
- desktop notification 只消费 reminder decision。
- realtime reminder 不参与数字叠加。

### Phase 6: 诊断与验收

- 明文诊断在验证阶段保留。
- 稳定后切回脱敏。
- 全量单测、typecheck、build、人工场景通过。

## 9. 成功标准

全部满足才算地基完成：

- 普通 IM 和在线客服不会互相污染会话列表。
- IM 当前可见会话不会出现未读提醒。
- IM 非当前会话未读不会立刻消失。
- 在线客服访客消息一定归在线客服提醒。
- 在线客服自己消息永远不产生客服未读。
- 底层发送能力复用，但 endpoint/cache/unread policy 独立。
- 所有 unread 数字都能追溯到唯一模型。
- 所有提醒都能追溯到唯一 decision。
- 任一真实问题都能通过日志串起 payload -> ownership -> model -> view -> reminder。

