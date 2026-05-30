# 验证记录：P1-OBS-001 Gateway 诊断日志最小闭环

日期：2026-05-29

任务编号：P1-OBS-001

修改范围：

- `src/renderer/data/gateway/gateway-event-types.ts`
- `src/renderer/data/gateway/gateway-event-adapter.ts`
- `src/renderer/data/gateway/gateway-diagnostics.ts`
- `src/renderer/data/gateway/im-gateway-handler.ts`
- `src/renderer/vite-env.d.ts`
- `tests/unit/gateway-diagnostics.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `brew install node` | 通过 | 安装本机 Node/npm，避免 Codex 自带 Node 加载 Rollup 原生包时的 macOS 签名限制。 |
| `npm ci --no-audit --no-fund` | 通过 | 按 `package-lock.json` 安装 PC 端依赖。 |
| `./node_modules/.bin/vitest run tests/unit/gateway-diagnostics.spec.ts` | 通过 | 1 个测试文件，6 个用例通过，耗时约 120ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `/Applications/Codex.app/Contents/Resources/node --check src/renderer/data/gateway/gateway-diagnostics.ts` | 通过 | 轻量语法检查。 |
| `/Applications/Codex.app/Contents/Resources/node --check src/renderer/data/gateway/gateway-event-adapter.ts` | 通过 | 轻量语法检查。 |
| `/Applications/Codex.app/Contents/Resources/node --check src/renderer/data/gateway/gateway-event-types.ts` | 通过 | 轻量语法检查。 |
| `/Applications/Codex.app/Contents/Resources/node --check src/renderer/data/gateway/im-gateway-handler.ts` | 通过 | 轻量语法检查。 |
| `/Applications/Codex.app/Contents/Resources/node --check tests/unit/gateway-diagnostics.spec.ts` | 通过 | 轻量语法检查。 |
| `rg -n "__lppGatewayDiagnostics" src/renderer/vite-env.d.ts src/renderer/data/gateway/gateway-diagnostics.ts` | 通过 | 确认 renderer 诊断缓冲区类型和实现可检索。 |
| `git diff --check -- lpp/lpp_pc_client/src/renderer/data/gateway lpp/lpp_pc_client/tests/unit/gateway-diagnostics.spec.ts` | 通过 | 检查 diff 格式无尾随空白。 |

## 手工验证

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| 普通 IM message handled 诊断 | 静态验证通过 | `diagnosticFromHandledGatewayEvent` 输出 `phase=handled`、`result=ok`、conversation/message 上下文。 |
| 普通 IM read handled 诊断 | 静态验证通过 | `diagnosticFromHandledGatewayEvent` 输出 `readSeq` 和 reader 上下文。 |
| invalid 诊断 | 静态验证通过 | `diagnosticFromGatewayEvent` 输出 `phase=adapted`、`result=invalid`、稳定 reason。 |
| handler failed 诊断 | 静态验证通过 | `diagnosticFromDispatchError` 输出 `phase=failed`、`result=failed`、错误摘要。 |
| 敏感字段脱敏 | 静态验证通过 | `sanitizeDiagnosticContext` 对 token/password/authorization/secret/credential 字段脱敏。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 是 |
| 日志入口 | `logGatewayDiagnostic`，由 `handleFirstStageImGatewayEvent` 调用。 |
| traceId/correlationId | `adaptGatewayEvent` 为每个 Gateway event 生成 `traceId`，也支持调用方传入。 |
| 可排查问题 | 普通 IM Gateway event 是否被识别、是否 invalid/ignored、handler 是否失败、成功处理的 conversation/message/read 上下文。 |
| Codex 检索方式 | 代码检索：`rg -n "gateway:diagnostic|P1-OBS-001|diagnosticFromHandledGatewayEvent|traceId" lpp/lpp_pc_client/src/renderer/data/gateway`；运行时可在开发窗口读取 `window.__lppGatewayDiagnostics`。 |
| 敏感信息处理 | 不输出 raw payload；诊断 context 只输出必要 ID/seq/type；敏感 key 自动输出 `[redacted]`。 |

## 遗留风险

1. 生产环境只支持通过 `localStorage.lpp.gatewayDiagnostics=1` 打开诊断输出，完整诊断包仍在 P8-EL-006。
2. 目前运行时诊断保存在 renderer 内存和 console，尚未落本地文件；如需 Codex 直接读取运行时日志文件，需要后续接入 Electron 诊断包。

## 下一步

1. 完成 P1 Gateway 任务收口时，将本记录作为 P1-OBS-001 验收证据之一。
2. 后续 P8-EL-006 将 renderer 内存诊断升级为可导出的诊断包。
