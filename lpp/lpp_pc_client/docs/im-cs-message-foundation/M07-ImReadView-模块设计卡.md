模块编号：M07

模块名称：IM 领域层 - ImReadView

模块职责：
- 统一解释 IM 会话的未读、已读和 effective unread 视图。
- 将服务端会话快照、当前账号身份、可见性和消息加载状态折叠为 UI 可消费的 badge/notify/count 决策。
- 保持 IM 未读与在线客服未读隔离，不读取客服 ledger、badge view 或业务状态。

上游输入：
- `ConversationListItem` 标准 IM 会话字段：`conversationId`、`conversationType`、`lastMessageSeq`、`lastReadSeq`、`unreadCount`、`lastMessage`。
- 当前账号身份：`userId`、`platformUserId`。
- UI 可见性：`hidden`、`listOnly`、`paneVisible`。
- 当前会话消息是否已加载完成。

下游输出：
- `ImConversationReadView.effectiveUnread`。
- `shouldShowBadge`、`shouldNotify`。
- `reason` 与 `diagnostic`，供诊断和 UI view-model 使用。

边界：
- UI 只消费 `ImReadView` 输出，不直接解释 raw `conversation.unreadCount`。
- `paneVisible && messagesLoaded` 只影响 view 层展示，不直接写 read store，也不伪造 mark read 成功。
- 当前用户 read receipt 清当前账号未读；对端 read receipt 只更新对端已读状态，不清当前账号未读。
- 自己发送的最后一条消息不产生未读和提醒。
- 默认选中、query 存在或列表可见不等于已读。

不做：
- 不在 PC 端兼容字段别名。
- 不读取或修改在线客服未读 ledger。
- 不把 UI 可见性伪造成服务端已读回执。
- 不改发送 runtime、delivery 或 gateway 补偿策略。

测试：
- `tests/unit/im-conversation-read-view.spec.ts`
- `tests/unit/im-core.spec.ts`
- `tests/unit/im-read-service.spec.ts`
- `tests/unit/message-center-view-model.spec.ts`
- `tests/unit/message-conversation-list-model.spec.ts`
- `tests/unit/architecture-boundaries.spec.ts`
