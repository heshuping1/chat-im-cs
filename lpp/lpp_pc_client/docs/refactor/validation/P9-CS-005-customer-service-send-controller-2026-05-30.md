# P9-CS-005 customer service send controller 验证记录

日期：2026-05-30

## 目标

- 将客服文本发送、媒体上传、乐观回显、暂停/取消/重试、视频封面和发送诊断从 `ChatWorkspace.tsx` 迁出。
- 保留客服发送状态机日志、local message cache patch、terminal write error 处理、发送成功后的 query invalidation 和滚动到底部行为。

## 变更

- 新增 `src/renderer/customer-service/hooks/useCustomerServiceSendController.ts`。
- `ChatWorkspace.tsx` 改为通过 hook 获取 `sendTextMutation`、`sendMediaMutation`、`sendServiceMediaOptimistically`、`handleServiceUploadAction`。
- 清空 `scripts/check-code-shape.mjs` 的大文件 allowlist；当前 `MessageCenter.tsx`、`ChatWorkspace.tsx`、`MePage.tsx`、`main.ts` 均低于 900 行。
- `ChatWorkspace.tsx` 行数从 881 降到 465。

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx vitest run tests/unit/cs-cache-adapter.spec.ts tests/unit/cs-workspace-view-model.spec.ts tests/unit/cs-action-service.spec.ts tests/unit/message-composer-model.spec.ts tests/unit/send-state-machine.spec.ts`
  - 结果：通过，5 个测试文件，19 个测试用例。

## 诊断日志

- 本次未新增日志字段，但发送诊断入口整体迁入 `useCustomerServiceSendController`。
- 日志仍通过 `logChatSendDiagnostic` 输出，字段保持 `taskId=P4-MSG-005D`、`channel=customer_service`、`phase`、`result`、`action`、`from/to`、`context`。

## 结论

P9-CS-005 已完成。后续客服发送、上传、暂停/取消/重试和发送诊断应优先修改 `useCustomerServiceSendController`，不得回填到 `ChatWorkspace.tsx`。
