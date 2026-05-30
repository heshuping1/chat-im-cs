# 验证记录：P2-ST-001F Auth 诊断日志与测试

日期：2026-05-29

任务编号：P2-ST-001F

## 修改范围

- `src/renderer/data/auth/auth-diagnostics.ts`
- `src/renderer/data/auth/auth-session.ts`
- `src/renderer/vite-env.d.ts`
- `tests/unit/auth-diagnostics.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

补齐 auth 生命周期结构化诊断能力，支持 Codex 通过日志排查登录态恢复、持久化、清理、解析失败等问题，同时避免 token 等敏感信息出现在日志中。

## 实现内容

| 项 | 说明 |
| --- | --- |
| 结构化记录 | 新增 `AuthDiagnosticRecord`，包含 `traceId/module/taskId/event/phase/result/timestamp/reason/context/error`。 |
| 事件范围 | 覆盖 `auth.session.restore`、`auth.session.persist`、`auth.session.clear`、`auth.session.parse`。 |
| 日志位置 | 日志能力集中在 `data/auth/auth-diagnostics.ts`，未在页面或业务功能中散落 `console`。 |
| 缓冲区 | 浏览器环境写入 `window.__lppAuthDiagnostics`，最多保留 100 条。 |
| 控制台输出 | 开发环境或 `localStorage.lpp.authDiagnostics=1` 时输出 `[lpp:auth]`。 |
| 敏感信息 | `token/password/authorization/secret/credential` 等字符串字段统一脱敏为 `[redacted]`。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/auth-session.spec.ts tests/unit/auth-workspace-bridge.spec.ts tests/unit/auth-store.spec.ts tests/unit/auth-diagnostics.spec.ts` | 通过 | 4 个测试文件，10 个用例通过，耗时约 143ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `git diff --check` | 通过 | diff 格式无尾随空白。 |

## 手工验证

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| 诊断记录结构 | 通过 | `auth-diagnostics.spec.ts` 覆盖 `taskId`、`traceId`、`context`。 |
| 敏感信息脱敏 | 通过 | `auth-diagnostics.spec.ts` 覆盖 `tenantToken`、`refreshToken` 脱敏。 |
| Node/测试环境兼容 | 通过 | 单测无 `localStorage` 警告，`tsc` 通过。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 是 |
| 日志入口 | `src/renderer/data/auth/auth-diagnostics.ts` |
| traceId/correlationId | `auth-<phase>-<timestamp>-<random>` |
| 可排查问题 | 登录态来自 env 还是本地存储、本地存储不可用、存储 JSON 解析失败、持久化失败、清理失败。 |
| Codex 检索方式 | `rg -n "logAuthDiagnostic|__lppAuthDiagnostics|lpp.authDiagnostics" src/renderer` |
| 敏感信息处理 | 不记录原始 session；字符串 token 类字段统一脱敏，业务上下文只记录布尔值和非敏感 id。 |

## 结论

P2-ST-001F 已完成。P2-ST-001 auth store 第一组任务闭环：有 owner 壳、生命周期桥、调用方迁移、旧入口兼容策略、诊断日志和快速测试。

## 下一步

1. 进入 P2-ST-002A：盘点 PC settings、窗口偏好、通知偏好的读写点和持久化位置。
