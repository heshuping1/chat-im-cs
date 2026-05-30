# P9-IM-015 message text send controller 验证记录

日期：2026-05-30

## 目标

- 将文本消息发送编排从 `MessageCenter.tsx` 迁出。
- 保留本地回显、引用回复、群 mention、发送成功替换、发送失败标记和诊断日志。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageTextSendController.ts`。
- `MessageCenter.tsx` 改为通过 hook 获取 `sendTextOptimistically`。
- `MessageCenter.tsx` 行数从 1979 降到 1854。

## 验证

- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `vitest run tests/unit/message-composer-model.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，3 个测试文件，12 个测试用例。

## 诊断日志

- 保留既有 `logChatSendDiagnostic` 链路。
- 覆盖 `local_echo` 与 `send` 阶段，以及 `enqueue_text`、`send_succeeded`、`send_failed` action。
- 本次未新增日志字段，避免改变现有诊断消费方。

## 结论

P9-IM-015 已完成。文本发送编排已进入消息 hook 层，后续文本发送链路变更应优先修改 `useMessageTextSendController`。
