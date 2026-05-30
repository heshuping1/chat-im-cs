# P5-IM-002B Conversation List Model

日期：2026-05-29

## 变更

新增会话列表模型：

- `src/renderer/messages/models/messageConversationListModel.ts`

迁移规则：

- 置顶排序。
- 未读排序。
- 最近消息时间排序。
- friends/groups/unread tab 筛选。
- keyword 搜索，复用 `chatConversationEntityFromImConversation` 的 title/preview。

`MessageCenter.tsx` 已删除本地 `sortConversations`、`filterConversations`、`conversationTime`。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-conversation-list-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-center-diagnostics.spec.ts
```

结果：通过，6 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

本任务不新增运行时日志。会话列表入口诊断由 `P5-IM-001E` 覆盖。

## 遗留风险

列表 group avatar、draft preview、右键菜单仍由 `MessageCenter` 传入。后续可以在 P7 公共头像/身份能力中继续收敛。
