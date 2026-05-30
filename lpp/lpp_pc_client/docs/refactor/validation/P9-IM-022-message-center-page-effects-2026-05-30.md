# P9-IM-022 message center page effects 验证记录

日期：2026-05-30

## 目标

- 将消息页页面级生命周期副作用从 `MessageCenter.tsx` 迁出。
- 保留 composer 高度随容器变化约束、图片预览 URL 卸载清理、toast 自动消失、会话选择诊断、切换会话时关闭临时 UI 的行为。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageCenterPageEffects.ts`。
- `MessageCenter.tsx` 通过 hook 注册页面生命周期副作用，页面主体只保留状态与渲染编排。
- `MessageCenter.tsx` 行数从 1206 降到 1146。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/message-center-view-model.spec.ts tests/unit/message-display-model.spec.ts tests/unit/architecture-boundaries.spec.ts`
  - 结果：通过，3 个测试文件，11 个测试用例。

## 诊断日志

- 本次未新增日志字段，但会话选择诊断入口从页面内联迁入 `useMessageCenterPageEffects`，事件字段保持不变。
- 日志入口仍为 `logMessageCenterDiagnostic`，可继续按 `event=conversation.selected` 检索。

## 结论

P9-IM-022 已完成。后续消息页页面级生命周期副作用应优先修改 `useMessageCenterPageEffects`。
