# P9-IM-014 message media send controller 验证记录

日期：2026-05-30

## 目标

- 将媒体消息发送和上传控制从 `MessageCenter.tsx` 迁出。
- 保留图片、视频、文件本地回显，上传进度，暂停、取消、恢复、重试，视频封面上传和发送成功/失败诊断日志。

## 变更

- 新增 `src/renderer/messages/hooks/useMessageMediaSendController.ts`。
- `MessageCenter.tsx` 改为通过 hook 获取 `sendMediaOptimistically` 与 `handleUploadAction`。
- `MessageCenter.tsx` 行数从 2321 降到 1979。

## 验证

- `tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `vitest run tests/unit/message-composer-model.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/message-center-view-model.spec.ts`
  - 结果：通过，3 个测试文件，12 个测试用例。

## 诊断日志

- 保留既有 `logChatSendDiagnostic` 链路。
- 覆盖 `local_echo`、`upload`、`send`、`transition` 阶段，以及 `start_upload`、`upload_succeeded`、`send_succeeded`、`send_failed`、`pause`、`cancel`、`retry_upload` 等 action。
- 本次未新增日志字段，避免改变现有诊断消费方。

## 结论

P9-IM-014 已完成。媒体发送/上传编排已从页面迁入消息 hook 层，后续媒体发送链路变更应优先修改 `useMessageMediaSendController`。
