# IM + 在线客服消息系统设计自审与优化建议

日期：2026-06-02

## 1. 自审结论

`04-top-tier-message-system-design.md` 的方向是正确的：IM 和在线客服必须拆成两个业务域，归属判定必须先于 cache side effect，未读和提醒必须来自唯一模型，底层发送能力可以共享。

但这份设计还需要做一次落地裁剪。当前代码已经有不少局部模型和测试，如果直接按 8 层完整重构，容易变成“大重写”，风险比收益高。更合理的做法是：保留顶层原则，把实际实施收敛成 5 个稳定切面，先锁住边界和状态源，再逐步替换旧入口。

## 2. 当前设计做得对的地方

### 2.1 IM 和在线客服不共用业务状态

这是最重要的判断。IM 的 unread 是当前用户与 direct/group 会话的 read cursor 问题；在线客服 unread 是客服视角下访客未读、排队、接待线程的问题。两者可以共享上传、outbox、通知能力，但不能共享 unread model。

### 2.2 Conversation ownership 是第一道门

临时会话闪进 IM 列表，本质是 ownership 判定太晚或 side effect 先发生。新设计把 ownership 放在 Gateway/API 写 cache 之前，这个原则必须保留。

### 2.3 UI 不能直接读 raw unread

之前出现过 IM 当前会话未读、客服累计未读，根因都是多个 UI/overlay/realtime 入口各自解释 unread。最终必须做到 Sidebar、列表、未读 tab、Header 全部只读同一个 effective view。

### 2.4 诊断方向正确

`im-read.jsonl`、`customer-service-reminder.jsonl`、`cs-routing.jsonl` 分层是必要的。复杂消息系统不能只靠猜，必须能串起 payload -> ownership -> model -> view -> reminder。

## 3. 需要优化的地方

### 3.1 8 层是架构视角，不应成为一次性实施结构

8 层设计适合描述目标，但实施时不应一次性新建大量 service/core/adapter。当前更稳的实施切面是 5 个：

1. `Contract Normalizer`
2. `ConversationOwnershipResolver`
3. `ImConversationReadView`
4. `CustomerServiceUnreadLedger`
5. `ChatSendRuntime`

Diagnostics 是横切能力，不单独驱动业务重构。

### 3.2 Ownership 必须补上 scopeKey，这比继续调字段更重要

当前真实代码里 `resolveConversationOwnership(payload, source)` 还没有强制 `scopeKey`，并且 `getCustomerServiceConversationIndex()` 仍支持无 scope 全局 fallback。这是串线风险。

优化要求：

- 新 API 必须是 `resolveConversationOwnership({ scopeKey, source, eventName, payload })`。
- indexed temp session 只能在同 scope 命中。
- 无 scope 时只能 explicit 判断，不能 indexed 判断。
- unknown `msg.new` 默认 IM，并记录 `unknown-default-im`。

### 3.3 需要一个轻量 MessageIdentityNormalizer

当前 `message-display.ts` 里 sender/self 判断字段非常长，客服侧也有类似判断。继续复制字段兼容链，会反复制造“自己消息被当对方消息”或“对方消息被当自己消息”。

建议新增轻量纯函数模块：

```ts
interface NormalizedMessageIdentity {
  senderIds: string[];
  senderDisplayName?: string;
  senderRole?: "self" | "peer" | "visitor" | "staff" | "system" | "unknown";
  direction?: "in" | "out" | "unknown";
  selfEvidence: "flag" | "direction" | "sender-id" | "display-name" | "none";
}
```

注意：这个模块只做身份提取和判断，不做 unread，不写 cache。

### 3.4 IM read model 应输出两类结果，避免把 UI view 和 command 混在一起

当前文档里的 `ImConversationView` 同时包含 `effectiveUnread` 和 `shouldMarkRead`。这在实现上容易让 UI 展示和服务端命令混在一起。

建议拆成：

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

这样当前会话可见时可以显示 unread=0，但是否发 `mark_read` 仍必须由 `paneVisible && messagesLoaded` 和 readSeq 证据决定。

### 3.5 客服 compat unread 要分等级，不要承诺绝对准确

`pc-im-conversations.tempSession.unreadCount` 是兼容来源，已经证明可能包含客服自己发送消息。它不能直接当客服未读。

建议 ledger source 分级：

| 来源 | 等级 | 用途 |
| --- | --- | --- |
| gateway visitor message | trusted | unread + reminder |
| workbench visitorUnreadCount | trusted | unread |
| detail visitor message count | trusted | unread correction |
| compat tempSession with explicit inbound | candidate | bounded unread |
| compat tempSession unknown direction | displayOnly 或 boundedCandidate | preview 优先，unread 只做保守兜底 |

如果后端不给 `senderRole/direction/visitorUnreadCount`，前端不能保证所有边界完全精确，只能做保守兼容并记录 degraded diagnostic。

### 3.6 ChatSendRuntime 应后置，不要作为第一阶段

底层发送确实可以共享，但当前最严重的问题在 ownership、unread、badge。过早抽发送 runtime 会扩大改动面。

建议顺序：

1. ownership + boundary tests
2. IM effective read view 收敛
3. CS ledger 收敛
4. badge/reminder 读取唯一 view
5. 再抽 ChatSendRuntime

### 3.7 Diagnostics 要有稳定 schema 和生命周期

明文诊断适合排查期，但不能长期默认打开。

建议：

- 每条日志都有 `schemaVersion`。
- 关键链路有 `traceId` 或 `messageId/conversationId/threadId`。
- 默认脱敏，调试开关开启明文。
- 高频 compat/workbench 轮询只记变化和摘要，不刷屏。
- 日志最多保留固定条数，并通过串行 writer 写入。

## 4. 建议的最小可落地架构

```text
API/Gateway Payload
        |
        v
Contract Normalizer
        |
        v
ConversationOwnershipResolver(scopeKey)
        |
        +-- IM -----------------> ImConversationReadView
        |                         |
        |                         +--> IM cache/view/badge/notification
        |
        +-- Customer Service ----> CustomerServiceUnreadLedger
                                  |
                                  +--> CS workbench view/badge/notification
```

发送链路暂时保持现状，只要求发送成功后输出事实：

- IM：`send.message_succeeded`
- 在线客服：`send.staff_message`

后续再把上传、outbox、状态机抽为 `ChatSendRuntime`。

## 5. 不应做的过度设计

- 不引入全局 event bus。
- 不把 IM message 和客服 message 强行合成一个大 DTO。
- 不一次性重写所有 API client。
- 不让所有 hook 都绕到一个万能 service。
- 不把 diagnostics 变成业务依赖。
- 不把 compat index 做成长期权威数据库。
- 不为了“统一”把 IM 群 @、名片入口暴露给客服。
- 不为了“统一”把客服快捷话术、知识库、AI 起草暴露给 IM。

## 6. 需要补强的测试

### 6.1 架构边界测试优先

这些测试比单个 bug 回归更重要：

- `ConversationOwnershipResolver` 必须接收 scopeKey。
- 无 scope 时不能 indexed temp session lookup。
- IM route 不 import 或调用客服 ledger 写入。
- 客服 route 不 import 或调用 IM cache 写入。
- Sidebar 不读取 raw `tempSession.unreadCount`。
- Gateway router 必须先 ownership 再 side effect。

### 6.2 IM 不变量测试

- 当前 paneVisible + messagesLoaded 的会话：effective unread 为 0，可发 mark read。
- auto selected 但 pane 不可见：不 mark read。
- 非当前会话：incoming unread 保留。
- self message：不产生 unread。
- peer read receipt：不清当前用户 unread。
- stale snapshot：不覆盖本地更新后的 unread。

### 6.3 在线客服不变量测试

- 访客消息增加客服 unread。
- 客服自己消息只更新 preview，不增加 unread。
- compat raw unread 不直接成为 final unread。
- workbench trusted unread 大于 0 时被尊重。
- detail loaded 后用消息角色修正 visitor unread。
- 进入详情成功后清理 ledger、badge、realtime reminder。

## 7. 更新后的落地优先级

### P0: 冻结边界

先加 architecture boundary tests，不改大逻辑。目标是防止后续继续引入 IM/客服互写。

### P1: Ownership scope 化

把 resolver 改成对象参数并强制 scope。删除无 scope indexed fallback。`messages-client` 只产出 tempSession fact，不直接决定客服未读。

### P2: IM effective unread 唯一化

让 `message-display.ts` 成为 facade，所有展示入口都走同一 read view。`useImReadCommandExecutor` 只负责 visible fact 和 read command。

### P3: CustomerServiceUnreadLedger 正名

从 `cs-conversation-index.ts` 拆出 ledger。index 只管归属和摘要，ledger 只管访客未读和客服自发消息抑制。

### P4: Badge/reminder 统一读取

Sidebar、任务栏、桌面通知全部从 IM view 和 CS ledger view 派生，不叠加 realtime reminder 数。

### P5: 抽 ChatSendRuntime

在 unread 和 ownership 稳定后，再抽发送 runtime。共享上传/outbox/状态机，保留 IM/客服 endpoint、cache、权限工具差异。

## 8. 最终判断

当前 `04` 方案的方向是专业且合理的，但需要把“顶级架构描述”降维成“可执行工程切面”。最优解不是继续打补丁，也不是一次性重写，而是：

1. 先用边界测试锁死 IM/客服互不污染。
2. 再把 ownership scope 化。
3. 然后分别收敛 IM read view 和客服 unread ledger。
4. 最后统一 badge/reminder 和发送 runtime。

这样既不过度设计，又能真正把地基做稳。
