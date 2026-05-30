# P9-EL-002 electron runtime diagnostics 验证记录

日期：2026-05-30

## 目标

- 补齐 Electron crash/uncaught error 诊断能力，让 Codex 能通过导出的诊断包排查主进程和渲染进程异常。
- 不新增外部依赖，不上传诊断数据，不扩大 IPC 能力面。

## 变更

- 新增 `src/main/runtime-diagnostics.ts`：
  - 记录 `main.uncaught_exception`、`main.unhandled_rejection`、`renderer.render_process_gone`、`app.child_process_gone`。
  - 内存保留最近 120 条。
  - app ready 后追加写入 `userData/diagnostics/electron-runtime.jsonl`。
  - 对 bearer token、token query、password query 做脱敏。
- `main.ts` 接入 main/renderer/child process 诊断事件。
- `exportDiagnostics` 写文件前合并 `electron-runtime` 快照和错误摘要。
- 新增 `runtime-error-diagnostics.ts`，renderer 监听 `window.error` 与 `unhandledrejection`，写入现有诊断包来源。
- `diagnostics-package.ts` 纳入 `runtime-error` 模块。
- 新增单测：
  - `electron-runtime-diagnostics.spec.ts`
  - `runtime-error-diagnostics.spec.ts`
  - 更新 `diagnostics-package.spec.ts`

## 验证

- `npx tsc --noEmit --pretty false --skipLibCheck`
  - 结果：通过。
- `npx tsc -p tsconfig.electron.json --noEmit --pretty false`
  - 结果：通过。
- `npx vitest run tests/unit/electron-runtime-diagnostics.spec.ts tests/unit/runtime-error-diagnostics.spec.ts tests/unit/diagnostics-package.spec.ts tests/unit/desktop-api-validation.spec.ts`
  - 结果：通过，4 个测试文件，13 个测试用例。

## 安全边界

- 未新增 IPC channel。
- 未新增外部服务或上传行为。
- 未记录 token、password、Bearer 原文。
- `uncaughtException` 使用 `uncaughtExceptionMonitor`，避免改变 Node 默认异常退出语义。

## 结论

P9-EL-002 已完成。Electron/Security 已具备本地 crash/uncaught error 诊断闭环，剩余为 Windows 打包态实机验证和截图 selector window 拆分专项。
