# P9-IM-020 message unread jump controller 验证记录

日期：2026-05-30

## 目标

- 将会话自动选中、用户点击会话、未读跳转状态创建、第一条未读定位从 `MessageCenter.tsx` 迁出。
- 保留自动选中会话不弹未读跳转、用户主动点击会话刷新消息 query、搜索态跳转前自动清理等行为。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageUnreadJumpController.ts`。
- `MessageCenter.tsx` 改为通过 hook 获取 `openConversationFromUserClick` 和 `handleUnreadJump`。
- `MessageCenter.tsx` 行数从 1353 降到 1257。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/message-display-model.spec.ts tests/unit/message-conversation-list-model.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/im-read-view-model.spec.ts`
  - 结果：通过，4 个测试文件，11 个测试用例。

## 诊断日志

- 本次为未读跳转 UI orchestration 抽离，不新增运行时日志字段。
- 会话选择诊断仍保留在 `MessageCenter.tsx` 既有 `logMessageCenterDiagnostic` 链路；后续若要追踪未读跳转失败，可在 `useMessageUnreadJumpController` 内集中补结构化日志。

## 结论

P9-IM-020 已完成。后续会话点击、未读跳转和第一条未读定位逻辑应优先修改 `useMessageUnreadJumpController`。
