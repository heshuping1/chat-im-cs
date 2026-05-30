# P4-MSG-005C IM Send Diagnostics Validation

日期：2026-05-29

## 变更

普通 IM 首批发送入口接入统一发送状态与诊断：

- 文本 local echo 使用 `initialChatSendStatusForKind("text")`，保持现有 `sending` 行为。
- 媒体 local echo 使用 `initialChatSendStatusForKind(kind)`，保持现有 `uploading` 行为。
- 文本发送成功/失败记录 `send_succeeded` / `send_failed`。
- 媒体上传开始、上传成功、发送成功/失败记录结构化日志。
- 媒体 pause/cancel/resume/retry 记录状态迁移日志。

## 诊断日志

- 是否新增日志：是。
- 日志入口：`logChatSendDiagnostic`。
- taskId：`P4-MSG-005C`。
- module：`send`。
- channel：`im`。
- 关键 context：`conversationId`、`conversationType`、`localMessageId`、`localTaskId`、`messageId`、`messageKind`。
- 敏感信息处理：底层诊断统一脱敏，不记录 token、完整 raw payload、本地文件路径。
- Codex 可检索方式：`rg "P4-MSG-005C|logChatSendDiagnostic" src/renderer/components/MessageCenter.tsx src/renderer/data/send`

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/send-state-machine.spec.ts tests/unit/message-domain.spec.ts tests/unit/media-message.spec.ts
```

结果：通过，14 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 遗留风险

本任务只接入诊断和统一初始状态，不重写 IM 发送队列。`MessageCenter.tsx` 仍承载发送 command/cache patch，后续 P5 页面瘦身继续迁移。
