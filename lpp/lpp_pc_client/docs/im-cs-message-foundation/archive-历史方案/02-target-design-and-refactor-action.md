# 目标设计与重构行动

## 1. 目标架构

目标不是把 IM 和在线客服强行合并，而是建立统一工程边界：

```text
Gateway / API / UI facts / Send success
        |
        v
ConversationOwnershipResolver
        |
        +--> IM ownership --------> ImConversationReadModel --------> ImConversationView
        |
        +--> Customer service ----> CustomerServiceUnreadLedger ----> CustomerServiceThreadView
        |
        v
ReminderDecision / BadgeDecision / Diagnostics
```

## 2. 核心原则

- IM 和在线客服共享底层 runtime，不共享业务未读状态源。
- 归属判定必须先于 cache 写入和提醒。
- 所有归属索引必须按 `scopeKey` 隔离。
- UI 只展示 view model，不直接计算 raw unread。
- Gateway 只提交事实，不直接拥有 read/unread policy。
- 在线客服 compat raw unread 只是候选，不是权威。

## 3. 分层目标

### Layer A: Ownership

Owner 文件：

- `src/renderer/data/gateway/conversation-ownership-resolver.ts`

目标：

- 输入必须包含 `scopeKey`、`source`、`payload`。
- 输出 `owner/confidence/conversationId/threadId/reason/scopeKey`。
- 禁止无 scope 全局索引查找。
- unknown 默认 IM。

### Layer B: IM read/unread

Owner 文件：

- `src/renderer/data/im-read-model.ts`
- `src/renderer/data/im-read/*`

目标：

- `ImConversationReadModel` 成为唯一 IM read/unread policy。
- `message-display.ts` 只做兼容 facade，不保留独立规则。
- gateway 不再用 active id 直接 mark read。
- UI 通过 `paneVisible + messagesLoaded` 提交 visible fact。

### Layer C: Customer service unread

Owner 文件：

- 新增或收敛为 `src/renderer/data/customer-service/customer-service-unread-ledger.ts`

目标：

- 替代当前 `cs-conversation-index.ts` 中混合的 unread 规则。
- 按 `scopeKey + threadId + conversationId` 记录状态。
- 输出 `effectiveUnread/effectivePreview/shouldNotify/reason`。
- staff send 不增加 unread。
- visitor gateway/detail/workbench 才是可信 unread 来源。

### Layer D: Send runtime

Owner 文件：

- `src/renderer/data/send/send-outbox.ts`
- `src/renderer/data/send/send-state-machine.ts`
- 可新增 `src/renderer/data/send/chat-send-runtime.ts`

目标：

- 共享上传、outbox、状态机、诊断、媒体缓存。
- IM 和客服分别提供 adapter：
  - `ImMessageSendAdapter`
  - `CustomerServiceMessageSendAdapter`
- 不合并 endpoint 和业务 cache。

### Layer E: Reminder and badge

Owner 文件：

- `src/renderer/data/reminder/reminder-service.ts`
- `src/renderer/data/customer-service/cs-reminder-model.ts`
- IM read view / customer service ledger view

目标：

- badge 是 effective unread 聚合。
- desktop notification 是新事件决策。
- 两者不能叠加。
- IM 和客服 dedupe key 隔离。

## 4. 重构行动顺序

### Action 1: 文档和边界测试先行

产出：

- 本目录三份文档。
- 新增架构边界测试，锁住：
  - ownership resolver 必须 scoped。
  - IM 不直接写客服 ledger。
  - 客服不写 IM cache。
  - unknown gateway message 默认 IM。

验收：

- `architecture-boundaries.spec.ts` 新增断言通过。

### Action 2: Ownership scoped 化

改动：

- `resolveConversationOwnership(input)` 改为对象参数。
- 所有调用点传入 `scopeKey`。
- `getCustomerServiceConversationIndex()` 删除无 scope 全局 fallback。
- `messages-client.ts` 只产出 dropped temp session facts，不直接写客服状态。

验收：

- tempSession 不进 IM。
- direct/group 不被误过滤。
- 同 conversationId 不同 scope 不串线。

### Action 3: IM effective unread 单一化

改动：

- `message-display.ts` 委托 `ImConversationReadModel` 或 `im-read-service` 的唯一规则。
- `MessageConversationSidebar`、`useMessageCenterViewModel`、`Sidebar`、未读 tab/filter/sort 全部使用统一 effective unread。
- `gateway-im-side-effects.ts` 不基于 active id 发 mark read；只写消息事实和 read reducer 结果。
- `useImReadCommandExecutor` 负责 UI visible fact 和 mark read command。

验收：

- 当前可见会话无未读提醒。
- 非当前会话未读不消失。
- 自己发送不闪未读。

### Action 4: CustomerServiceUnreadLedger

改动：

- 从 `cs-conversation-index.ts` 拆出 ledger。
- compat index 只保留归属和摘要。
- ledger 接收：
  - `gateway.visitor_message`
  - `send.staff_message`
  - `workbench.snapshot`
  - `detail.loaded`
  - `compat.snapshot`
  - `read.clear`
- `applyCustomerServiceThreadOverlay()` 改成读取 ledger output。

验收：

- 访客消息产生客服 unread。
- 客服自己消息不增加 unread。
- compat raw unread 不直接污染最终值。
- 进入详情后清零。

### Action 5: Send runtime 整理

改动：

- 抽出公共 `ChatSendRuntime`：
  - local id/clientMsgId
  - outbox record
  - media upload/progress
  - video poster
  - diagnostics
  - failure state
- IM adapter 保留 direct/group endpoint 和 IM cache。
- 客服 adapter 保留 thread endpoint 和客服 cache/ledger。

验收：

- 文本、图片、文件、视频发送路径不退化。
- IM 名片仍只属于 IM。
- 客服工具和客服权限不被 IM 影响。

### Action 6: Reminder/badge 收敛

改动：

- Sidebar 只读：
  - IM aggregate effective unread
  - CS aggregate ledger effective unread
  - queue count
- 桌面通知只读 reminder decision。
- realtime reminder 不参与 badge 数字叠加。

验收：

- IM 和在线客服 badge 不互相污染。
- 同一消息多来源只提醒一次。
- 当前可见会话不弹桌面通知。

## 5. 成功标准

- 所有 IM 未读数字来自一个 effective unread 函数或 view。
- 所有客服未读数字来自 CustomerServiceUnreadLedger。
- tempSession 不出现在 IM 会话列表。
- 普通 IM 不触发客服提醒。
- 客服自己发送不触发客服未读。
- 任何 unread 改变都能在日志里看到来源和原因。
- 单测覆盖场景矩阵，不靠人工反复试错。
