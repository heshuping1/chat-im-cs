# P4-MSG-005D Customer Service Send Diagnostics Validation

日期：2026-05-29

## 变更

在线客服首批发送入口接入统一发送状态与诊断：

- 客服文本发送成功/失败记录 `send_succeeded` / `send_failed`。
- 客服媒体 local echo 使用 `initialChatSendStatusForKind(kind)`，保持现有 `uploading` 行为。
- 客服媒体上传开始、上传成功、发送成功/失败记录结构化日志。
- 客服媒体 pause/cancel/resume/retry 记录状态迁移日志。

## 诊断日志

- 是否新增日志：是。
- 日志入口：`logChatSendDiagnostic`。
- taskId：`P4-MSG-005D`。
- module：`send`。
- channel：`customer_service`。
- 关键 context：`threadId`、`threadType`、`localMessageId`、`localTaskId`、`messageId`、`messageKind`。
- 敏感信息处理：底层诊断统一脱敏，不记录 token、完整 raw payload、本地文件路径。
- Codex 可检索方式：`rg "P4-MSG-005D|logChatSendDiagnostic" src/renderer/components/ChatWorkspace.tsx src/renderer/data/send`

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

客服文本仍没有统一 local echo；这涉及客服会话终态、只读态和工单侧 UX，建议在 P6 在线客服核心重构中单独确认行为后迁移。
