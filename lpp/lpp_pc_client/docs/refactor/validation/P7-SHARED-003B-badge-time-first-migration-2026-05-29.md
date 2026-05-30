# P7-SHARED-003B Badge/Time 首批迁移

日期：2026-05-29

## 变更

复用已有 `formatBadgeCount`，迁移：

- `ConversationListParts` 会话头像未读 badge。
- `MessageConversationListPanel` 未读 tab 数量。
- `ThreadList` 客服线程头像未读 badge。

同时移除 `ThreadList` 中无额外价值的 `formatThreadTime` 包装，直接使用 `formatChatTime`。

## 验收

- 未读展示统一 `0/数字/99+` 规则。
- 不改变 unread 计算来源。
- 不改变会话排序和消息时间展示逻辑。
