# P5-IM-003A Message List Panel

日期：2026-05-29

## 变更

新增消息列表 container：

- `src/renderer/messages/components/MessageListPanel.tsx`

迁移范围：

- 当前会话内搜索栏。
- 历史记录筛选面板。
- 未读跳转按钮。
- 新消息跳转按钮。
- 消息列表渲染。
- 多选 checkbox。
- 事件消息 pill。
- `ChatMessageBubble` 装配。
- loading/empty。

## 边界控制

本任务只迁移消息列表 JSX 和事件接线，不迁移：

- 消息 query。
- 发送/撤回/删除等命令实现。
- React Query cache patch。
- read model。
- `useWechatBottomFollow` 底部跟随 hook。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-list-model.spec.ts tests/unit/message-conversation-list-model.spec.ts tests/unit/message-center-view-model.spec.ts
```

结果：通过，8 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 诊断日志

本任务不新增运行时日志。页面级入口诊断由 `P5-IM-001E` 覆盖。

## 遗留风险

消息列表 container props 较多，这是按“先搬边界、不改行为”的策略接受的中间态。后续发送、菜单、滚动、选择状态继续拆小后，props 会自然减少。
