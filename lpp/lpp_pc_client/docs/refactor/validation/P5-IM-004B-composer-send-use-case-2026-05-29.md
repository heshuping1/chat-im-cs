# P5-IM-004B Composer Send Use Case

日期：2026-05-29

## 变更

已完成：

- `MessageComposer` 继续只接收 `onSendText` / `onSendMedia`，不理解 API/Gateway/cache。
- `MessageCenter` 的 Composer 调用统一通过 `messageCenterCommands.sendText` 和 `messageCenterCommands.sendMedia`。
- 删除未使用的旧 `sendTextMutation` / `sendMediaMutation`，避免维护者误判存在两套发送链路。

现行发送 use case：

- 文本：`sendTextOptimistically`
- 媒体：`sendMediaOptimistically`
- 上传控制：`handleUploadAction`
- 页面入口：`useMessageCenterCommandModel`
- 底层诊断：`logChatSendDiagnostic` + `logMessageCenterDiagnostic`

## 边界控制

本任务不迁移：

- optimistic cache patch。
- upload task registry。
- read model command。
- media poster upload。

这些仍在 `MessageCenter.tsx`，后续可以继续拆到发送 application/use case 层。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/send-queue.spec.ts tests/unit/send-state-machine.spec.ts tests/unit/message-center-diagnostics.spec.ts
```

结果：通过，8 tests。

## 诊断日志

- 页面入口：`window.__lppMessageCenterDiagnostics`
- 发送链路：`window.__lppSendDiagnostics`
- Codex 检索：`rg "send_text|send_media|P4-MSG-005C|P5-IM-001E" src/renderer`

## 遗留风险

发送实现仍在 `MessageCenter.tsx`。本任务只收敛入口和删除死链路，下一轮如继续细拆，应拆 `useImSendUseCase` 或 `messages/application/imSendUseCase`。
