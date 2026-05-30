# 验证记录：P2-ST-004D IM Read 诊断日志与测试

日期：2026-05-29

任务编号：P2-ST-004D

## 修改范围

- `src/renderer/data/im-read/im-read-diagnostics.ts`
- `src/renderer/data/store.ts`
- `src/renderer/vite-env.d.ts`
- `tests/unit/im-read-diagnostics.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

补齐 IM read 结构化诊断日志，覆盖本地已读、对端已读、read state upsert、pending read 清理等关键动作，并通过现有 read model 测试验证当前会话、非当前会话、自己消息等核心行为。

## 实现内容

| 项 | 说明 |
| --- | --- |
| 结构化记录 | 新增 `ImReadDiagnosticRecord`，包含 `traceId/module/taskId/event/phase/result/timestamp/reason/context/error`。 |
| 事件范围 | 覆盖 `im-read.mark-local`、`im-read.mark-peer`、`im-read.upsert-state`、`im-read.clear-pending`。 |
| 日志位置 | 日志能力集中在 `data/im-read/im-read-diagnostics.ts`，页面和 Gateway 不直接写日志。 |
| 缓冲区 | 浏览器环境写入 `window.__lppImReadDiagnostics`，最多保留 120 条。 |
| 控制台输出 | 开发环境或 `localStorage.lpp.imReadDiagnostics=1` 时输出 `[lpp:im-read]`。 |
| 敏感信息 | 只记录 conversationId、conversationType、readSeq 等 read 元数据，不记录消息正文或 token。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/im-read-diagnostics.spec.ts tests/unit/im-read-storage.spec.ts tests/unit/im-read-store.spec.ts tests/unit/im-core.spec.ts tests/unit/gateway-event-adapter.spec.ts tests/unit/im-gateway-cache.spec.ts tests/unit/im-gateway-handler.spec.ts` | 通过 | 7 个测试文件，82 个用例通过，耗时约 256ms；`im-core.spec.ts` 现有 localStorage 用法在 Node 26 下有 ExperimentalWarning。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |
| `git diff --check` | 通过 | diff 格式无尾随空白。 |

## 手工验证

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| 当前会话消息已读 | 通过 | `im-core.spec.ts` 覆盖 active conversation read 推进。 |
| 非当前会话未读增加 | 通过 | `im-core.spec.ts` 覆盖 inactive conversation unread。 |
| 自己消息不产生未读 | 通过 | `im-core.spec.ts` 覆盖 send/message self 场景。 |
| 诊断记录结构 | 通过 | `im-read-diagnostics.spec.ts` 覆盖 `taskId`、`traceId`、`context`。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 是 |
| 日志入口 | `src/renderer/data/im-read/im-read-diagnostics.ts` |
| traceId/correlationId | `im-read-<phase>-<timestamp>-<random>` |
| 可排查问题 | 本地已读是否触发、对端已读是否触发、read state 是否更新、pending read 是否清理。 |
| Codex 检索方式 | `rg -n "logImReadDiagnostic|__lppImReadDiagnostics|lpp.imReadDiagnostics" src/renderer` |
| 敏感信息处理 | 不记录 token、消息正文、用户资料详情；只记录 read 元数据。 |

## 结论

P2-ST-004D 已完成。P2-ST-004 IM Read 第一组任务闭环：有 storage owner、store selectors/actions、调用方迁移、诊断日志和 read model 测试验证。

## 下一步

1. 继续 P2-ST-005A：盘点 realtime reminders、toast、桌面提醒、未读提示的触发点。
