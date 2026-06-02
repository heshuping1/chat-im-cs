# IM + 在线客服消息系统最终落地方案

日期：2026-06-02

## 1. 最终结论

PC 端消息系统不能继续靠局部补丁修 IM 未读、在线客服提醒、临时会话归属。最终方案是建立一个稳定地基：

- IM 和在线客服是两个业务域。
- 二者共享底层工程能力，不共享业务未读状态。
- 所有消息和会话必须先判定归属，再写 cache、未读、提醒。
- UI 不直接解释 raw unread，只展示 domain view model 的 effective unread。
- 发送底层能力可以复用，但 endpoint、cache merge、unread policy 必须独立。

最终执行方案不是一次性重写 8 层架构，而是按 5 个工程切面逐步落地：

1. `Contract Normalizer`
2. `ConversationOwnershipResolver(scopeKey)`
3. `ImConversationReadView`
4. `CustomerServiceUnreadLedger`
5. `ChatSendRuntime`

## 2. 当前最核心的问题

### 2.1 IM 和在线客服边界不够硬

临时会话曾经进入 IM 会话列表，说明 gateway/API side effect 发生在 ownership 判定之前，或 ownership indexed lookup 没有严格 scope。

### 2.2 IM 未读状态源不唯一

当前 IM 已经有 read model，但 `message-display.ts` 仍是展示未读入口。Sidebar、会话列表、Header、未读筛选如果分别解释 unread，就会出现“状态机正确但 UI 错误”的问题。

### 2.3 在线客服未读来源混乱

`pc-im-conversations.tempSession.unreadCount` 只能作为兼容数据，不能直接成为客服未读。它可能包含客服自己发送的消息，也可能缺少 sender/direction，无法保证访客未读准确。

### 2.4 badge/reminder 口径曾经叠加

未读数、realtime reminder 数、workbench unread、overlay unread 如果叠加，会导致在线客服提醒数量累计错误。

### 2.5 发送底层半共享

上传、outbox、发送状态机、媒体缓存可以共享；但 IM 和在线客服的发送 endpoint、cache、权限工具、未读联动不能合并。

## 3. 最终目标架构

```text
API / Gateway / UI visible facts / Send success
        |
        v
Contract Normalizer
        |
        v
ConversationOwnershipResolver(scopeKey)
        |
        +-- owner=im -------------------> ImConversationReadView
        |                                 |
        |                                 +--> IM cache
        |                                 +--> IM conversation list
        |                                 +--> IM badge/reminder
        |
        +-- owner=customerService -------> CustomerServiceUnreadLedger
        |                                 |
        |                                 +--> CS workbench threads
        |                                 +--> CS badge/reminder
        |
        +-- owner=unknown --------------> default IM + diagnostic
```

发送链路：

```text
UI submit
  -> ChatSendRuntime
  -> local echo / outbox / upload / media cache / diagnostics
  -> BusinessSendAdapter
       +-- IM adapter: direct/group endpoint + IM cache
       +-- CS adapter: workbench thread endpoint + CS ledger/cache
```

## 4. 五个工程切面

### 4.1 Contract Normalizer

职责：

- 统一 normalize API 和 Gateway payload。
- 输出字段存在性、枚举类型、ID、seq、sender/direction。
- 标记 contract level：`ok | degraded | blocking`。

要求：

- blocking payload 不能输出伪精确 unread。
- degraded payload 可以补 preview，但不能冒充可信未读。
- normalize 只负责数据整理，不写 cache、不发提醒。

建议新增：

```ts
interface NormalizedMessageIdentity {
  senderIds: string[];
  senderDisplayName?: string;
  senderRole?: "self" | "peer" | "visitor" | "staff" | "system" | "unknown";
  direction?: "in" | "out" | "unknown";
  selfEvidence: "flag" | "direction" | "sender-id" | "display-name" | "none";
}
```

### 4.2 ConversationOwnershipResolver(scopeKey)

职责：

- 判定消息或会话属于 IM、在线客服或 unknown。
- 是所有 cache write、badge、reminder 之前的第一道门。

目标接口：

```ts
interface ResolveOwnershipInput {
  scopeKey: string;
  source: "gateway" | "imList" | "csWorkbench" | "csDetail";
  eventName?: string;
  payload: Record<string, unknown>;
}

interface ConversationOwnershipResult {
  owner: "im" | "customerService" | "unknown";
  confidence: "explicit" | "indexed" | "unknown";
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
- `direct_customer/customer_direct` 没有明确 `tempSession` 时保护为 IM。
- 无明确客服证据的 `msg.new` 默认 IM，并写 `unknown-default-im` 诊断。
- indexed temp session 必须同 `scopeKey` 命中。
- 无 scope 时禁止 indexed lookup。

### 4.3 ImConversationReadView

职责：

- 统一 IM 当前用户 unread。
- 统一 read cursor、peer read cursor、stale snapshot 保护。
- 输出 IM 会话列表、Sidebar、Header、未读筛选使用的唯一 view。

必须拆成两个输出：

```ts
interface ImConversationReadView {
  effectiveUnread: number;
  shouldShowBadge: boolean;
  shouldNotify: boolean;
  reason: string;
}

interface ImReadCommandDecision {
  shouldMarkRead: boolean;
  readSeq?: number;
  reason: string;
}
```

关键规则：

- 当前会话 `paneVisible && messagesLoaded` 时，展示层 effective unread 为 0。
- 只有 `paneVisible && messagesLoaded` 才允许发 `mark_read`。
- auto selected 不是已读证据。
- query 存在不是已读证据。
- `activeConversationId` 单独不是已读证据。
- self message 不产生 unread。
- peer read receipt 只更新 peerReadSeq，不清当前用户 unread。
- `readAt` 不能覆盖明确 `serverUnread > 0` 且 seq gap 存在的新消息。

### 4.4 CustomerServiceUnreadLedger

职责：

- 统一在线客服访客未读。
- 排除客服自己发送消息。
- 合并 gateway、workbench、detail、compat 信息。
- 输出客服卡片、在线客服菜单、任务栏、桌面通知使用的唯一 view。

推荐状态：

```ts
interface CustomerServiceUnreadLedgerEntry {
  scopeKey: string;
  threadId: string;
  conversationId?: string;
  gatewayVisitorUnread: number;
  detailVisitorUnread?: number;
  workbenchServerUnread?: number;
  compatRawUnread?: number;
  compatCandidateUnread?: number;
  localStaffSentMessageIds: string[];
  localStaffSentSeqs: number[];
  readClearSeq?: number;
  readClearMessageId?: string;
  lastMessagePreview?: string;
  lastMessageAt?: string | null;
}
```

来源等级：

| 来源 | 等级 | 用途 |
| --- | --- | --- |
| gateway visitor message | trusted | unread + reminder |
| workbench `visitorUnreadCount` 或明确可信 unread | trusted | unread |
| detail visitor message count | trusted | unread correction |
| compat tempSession explicit inbound | candidate | bounded unread |
| compat tempSession unknown direction | displayOnly 或 boundedCandidate | preview 优先，未读保守兜底 |

关键规则：

- 在线客服未读只代表访客未读。
- 客服自己发送只更新 preview 和 staff sent marker，不增加 unread。
- `pc-im-conversations.tempSession.unreadCount` 不直接成为最终 unread。
- workbench preview 为空时，可以用 gateway/detail/compat preview 兜底。
- 进入客服详情且详情加载成功后，按 `threadId + conversationId + scopeKey` 清理 ledger、badge、realtime reminder。
- badge 数字只聚合 ledger effective unread，不叠加 realtime reminder 数。

### 4.5 ChatSendRuntime

职责：

- local id / clientMsgId。
- local echo。
- outbox。
- upload。
- video poster。
- media cache。
- send diagnostics。
- retry / failed / cancel。

接口：

```ts
interface ChatSendRuntimeAdapter<TTarget, TResult> {
  channel: "im" | "customer_service";
  buildLocalMessage(input: ChatSendInput<TTarget>): MessageItemDto;
  sendToServer(input: ChatSendInput<TTarget>): Promise<TResult>;
  mergeSucceeded(result: TResult): void;
  mergeFailed(error: unknown): void;
}
```

落地顺序上，`ChatSendRuntime` 后置。先把 ownership、IM unread、客服 ledger、badge/reminder 稳住，再抽发送底座。

## 5. 严禁事项

- UI 组件直接展示 raw `unreadCount`。
- Gateway 在 ownership 前写 IM cache 或客服 ledger。
- IM route 写客服 ledger。
- 客服 route 写 IM cache。
- 用 `activeConversationId`、query 存在、默认选中作为已读证据。
- 用 `peerUserId === currentUser` 判断自己最后一条消息。
- 用 `readAt` 覆盖明确 `serverUnread > 0` 的新消息。
- 把 `pc-im-conversations.tempSession.unreadCount` 直接当客服未读。
- badge 数字叠加 realtime reminder 数量。
- 无 scope 查询 indexed temp session。
- 建全局 event bus。
- 把 IM message 和客服 message 强行合成一个大 DTO。
- 一次性重写所有 API client。

## 6. 最终落地路线

### P0: 冻结边界

先加 architecture boundary tests，防止继续引入互相污染。

验收：

- IM 不写客服 ledger。
- 客服不写 IM cache。
- Gateway router 必须先 ownership 再 side effect。
- Sidebar 不读取 raw tempSession unread。

### P1: Ownership scope 化

改造 `ConversationOwnershipResolver`：

- 对象参数。
- 强制 `scopeKey`。
- indexed tempSession 只同 scope 命中。
- 删除无 scope 全局 fallback。
- unknown 默认 IM。

验收：

- tempSession 不进 IM。
- direct/group 不被误过滤。
- 不同账号/租户/工作区相同 conversationId 不串线。

### P2: IM effective unread 唯一化

改造方向：

- `message-display.ts` 降级为 facade。
- 会话列表、未读筛选、Sidebar、Header 都读 `ImConversationReadView`。
- `useImReadCommandExecutor` 只负责 visible fact 和 `mark_read` command。

验收：

- IM 当前可见会话不显示未读。
- IM 非当前会话未读不消失。
- 自己发送不产生未读。
- peer read 不清当前用户 unread。

### P3: CustomerServiceUnreadLedger 正名

改造方向：

- 从 `cs-conversation-index.ts` 拆出 ledger。
- index 只管归属和摘要。
- ledger 只管访客未读、自发消息抑制、read clear。
- compat raw unread 改为候选或 displayOnly。

验收：

- 访客消息产生在线客服 unread。
- 客服自己消息不增加 unread。
- 临时会话不回流 IM。
- workbench 空摘要时卡片可被 preview 兜底。
- 进入详情后清零。

### P4: Badge/reminder 统一

改造方向：

- IM badge 只聚合 IM effective unread。
- 在线客服 badge 只聚合 CS ledger effective unread 和队列必要计数。
- desktop notification 只消费 reminder decision。
- realtime reminder 不参与数字叠加。

验收：

- IM 和在线客服 badge 不互相污染。
- 同一 messageId 多来源只提醒一次。
- 当前可见会话不弹桌面通知。
- 在线客服连续访客消息按有效访客未读计数。

### P5: 抽 ChatSendRuntime

改造方向：

- 共享上传、outbox、状态机、诊断、媒体缓存。
- IM adapter 保留 direct/group endpoint 和 IM cache。
- 客服 adapter 保留 workbench endpoint 和客服 ledger/cache。

验收：

- IM 文本/图片/文件/视频发送不退化。
- 在线客服文本/图片/文件发送不退化。
- IM 名片仍只属于 IM。
- 客服快捷话术、知识库、AI 起草仍只属于客服。

## 7. 测试矩阵

### 7.1 Architecture Boundary Tests

- resolver 必须接收 `scopeKey`。
- 无 scope 禁止 indexed lookup。
- IM route 不 import 或调用客服 ledger 写入。
- 客服 route 不 import 或调用 IM cache 写入。
- Sidebar 不读取 raw tempSession unread。
- Gateway router 先 ownership 后 side effect。

### 7.2 IM Tests

- 当前 `paneVisible + messagesLoaded` 会话收到消息：effective unread = 0，允许 mark read。
- auto selected 但 pane 不可见：不 mark read。
- 非当前会话 incoming：unread 保留。
- self message：unread = 0。
- peer read receipt：不清我的 unread。
- current user read receipt：清我的 unread。
- stale snapshot：不回退本地更新。
- `readAt` 不覆盖明确 server unread。

### 7.3 Customer Service Tests

- visitor message：ledger unread +1。
- staff message：只更新 preview，不加 unread。
- workbench trusted unread > 0：参与 final unread。
- detail loaded：按非自己访客消息修正 visitor unread。
- compat raw unknown：不直接成为 final unread。
- compat explicit inbound：可作为 bounded candidate。
- visitor 2 条 + staff 2 条：final unread 只统计访客。
- 进入详情：ledger、badge、taskbar、realtime reminder 清零。

### 7.4 Send Tests

- IM 文本发送。
- IM 图片/文件/视频发送。
- IM 名片发送。
- 客服文本发送。
- 客服图片/文件发送。
- 发送失败重试。
- outbox 重启恢复按 channel + target 隔离。

## 8. 人工验收场景

1. IM 当前打开会话收到对方消息：不显示未读，不弹提醒。
2. IM 非当前会话收到对方消息：消息菜单和任务栏显示未读。
3. IM 自己发送文本/图片/文件：不产生未读。
4. 临时会话访客消息：只进入在线客服，不闪进 IM。
5. 在线客服访客消息：在线客服菜单、任务栏、卡片未读一致。
6. 在线客服自己回复：不增加客服未读，不弹提醒。
7. 在线客服卡片有最新摘要，不显示错误的“暂无消息”。
8. 进入客服详情后，在线客服未读和任务栏清零。
9. 连续访客消息按有效访客未读计数，不叠加 realtime reminder。

## 9. 后端协议建议

为了减少前端兼容兜底，后端应补齐：

IM：

- `conversationType`
- `conversationId`
- `lastMessageSeq`
- `lastReadSeq`
- `unreadCount`
- `peerReadSeq`
- message `conversationSeq`
- message sender identity
- message direction

在线客服：

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

如果后端不提供 `visitorUnreadCount` 和 sender role，前端只能做 bounded compat candidate，不能保证所有边界完全精确。

## 10. 最终成功标准

满足以下条件，才算消息地基完成：

- 普通 IM 和在线客服不会互相污染会话列表。
- IM 当前可见会话不会出现未读提醒。
- IM 非当前会话未读不会立刻消失。
- 在线客服访客消息一定归在线客服提醒。
- 在线客服自己消息永远不产生客服未读。
- badge 数字只来自 effective unread，不叠加 reminder 数。
- 底层发送能力复用，但 endpoint/cache/unread policy 独立。
- 所有 unread 数字都能追溯到唯一模型。
- 所有提醒都能追溯到唯一 decision。
- 任一真实问题都能通过日志串起 payload -> ownership -> model -> view -> reminder。

