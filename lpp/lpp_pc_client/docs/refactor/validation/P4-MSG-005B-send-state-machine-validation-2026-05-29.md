# P4-MSG-005B Send State Machine Validation

日期：2026-05-29

## 变更

新增底层发送状态机：

- `src/renderer/data/send/send-state-machine.ts`
- `tests/unit/send-state-machine.spec.ts`

状态机覆盖：

- 初始状态：文本 `sending`，媒体 `uploading`，可选 `queued`。
- 媒体生命周期：`uploading -> paused -> uploading -> sending -> sent`。
- 失败与重试：`sending/uploading -> failed`，`failed -> uploading/sending`。
- 终态：`sent`、`canceled`、`recalled`。
- 非法迁移：返回 `accepted=false`，不改当前状态。

## 诊断日志

- 是否新增日志：是。
- 日志入口：`logChatSendDiagnostic`。
- 运行时缓冲：`window.__lppSendDiagnostics`。
- 开关：开发环境默认打印；生产可用 `localStorage.lpp.sendDiagnostics=1`。
- traceId：`send-{channel}-{phase}-{timestamp}-{random}`。
- 可排查问题：local echo 是否创建、上传是否开始/成功、发送是否成功/失败、暂停/取消/重试是否进入状态迁移。
- 敏感信息处理：Authorization 脱敏；本地路径和文件名输出为 `[local-path]`。
- Codex 可检索方式：`rg "__lppSendDiagnostics|logChatSendDiagnostic|P4-MSG-005B" src/renderer tests/unit`

## 验证命令

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/send-state-machine.spec.ts
```

结果：通过，4 tests。

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck
```

结果：通过。

## 遗留风险

状态机已经定义，但页面发送逻辑仍在原位置；后续 P5/P6 需要把发送命令、任务注册和 cache patch 继续下沉。
