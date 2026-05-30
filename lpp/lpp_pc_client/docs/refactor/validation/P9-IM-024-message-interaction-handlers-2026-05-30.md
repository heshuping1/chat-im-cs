# P9-IM-024 message interaction handlers 验证记录

日期：2026-05-30

## 目标

- 将消息/会话右键菜单定位、会话隐藏/免打扰、头像/名片浮层、消息滚动定位、批量删除从 `MessageCenter.tsx` 迁出。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageInteractionHandlers.ts`。
- `MessageCenter.tsx` 通过 hook 获取交互 handler。
- `MessageCenter.tsx` 行数从 1102 降到 995。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/message-context-menu-model.spec.ts tests/unit/message-display-model.spec.ts tests/unit/message-conversation-list-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，4 个测试文件，15 个测试用例。

## 诊断日志

- 本次为 UI 交互 handler 抽离，不新增运行时日志字段。

## 结论

P9-IM-024 已完成。后续消息页交互 handler 应优先修改 `useMessageInteractionHandlers`。
