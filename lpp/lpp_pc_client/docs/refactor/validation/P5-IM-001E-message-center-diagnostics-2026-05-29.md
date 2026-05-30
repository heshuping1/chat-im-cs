# P5-IM-001E MessageCenter Diagnostics

日期：2026-05-29

## 变更

新增页面级诊断模块：

- `src/renderer/messages/diagnostics/message-center-diagnostics.ts`
- `tests/unit/message-center-diagnostics.spec.ts`

接入点：

- active conversation selection。
- `messageCenterCommands` 命令入口：
  - send text
  - send media
  - upload pause/resume/cancel/retry
  - unread jump
  - message context menu action
  - batch delete selected

运行时缓冲：

- `window.__lppMessageCenterDiagnostics`

诊断开关：

- 开发环境默认打印。
- 生产可用 `localStorage.lpp.messageCenterDiagnostics=1` 开启。

## 日志字段

- `traceId`
- `module: message-center`
- `taskId: P5-IM-001E`
- `event`
- `phase`
- `result`
- `reason`
- `context`

## 敏感信息处理

- Authorization/Bearer 脱敏。
- 本地路径和文件名输出为 `[local-path]`。
- 发送文本只记录长度，不记录正文。
- 媒体发送只记录 kind、mimeType、sizeBytes，不记录本地路径。

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-center-diagnostics.spec.ts tests/unit/message-center-view-model.spec.ts tests/unit/message-view-model.spec.ts tests/unit/send-state-machine.spec.ts
```

结果：通过，10 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## Codex 检索方式

```bash
rg "__lppMessageCenterDiagnostics|P5-IM-001E|logMessageCenterDiagnostic" src/renderer tests/unit
```

## 遗留风险

页面级诊断已经覆盖入口，但命令实现仍在 `MessageCenter.tsx`。后续 P5-IM-004/P5-IM-005 继续拆发送用例和 action map。
