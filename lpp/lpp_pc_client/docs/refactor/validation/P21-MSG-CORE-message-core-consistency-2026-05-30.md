# 验证记录：P21-MSG-CORE 普通 IM 消息内核一致性治理

日期：2026-05-30

任务编号：P21-MSG-CORE-001 / P21-MSG-CORE-002 / P21-MSG-CORE-003 / P21-MSG-CORE-004

修改范围：

- 新增普通 IM `message-core` 纯 reducer。
- Gateway cache、本地发送 cache mutation、撤回/删除、read cache 和消息列表轮询归约接入 `message-core`。
- 新增 focused 单测覆盖核心时序和会话摘要重算。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/message-core.spec.ts tests/unit/message-cache-mutation-model.spec.ts tests/unit/im-gateway-cache.spec.ts tests/unit/im-core.spec.ts` | 通过 | 4 files / 87 tests，覆盖新 reducer、cache facade、Gateway cache、已读规则。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | Renderer TypeScript 检查通过。 |
| `npm run lint:core` | 通过 | 核心 lint 无 warning。 |
| `npm run test:core` | 通过 | 58 files / 274 tests。 |
| `npm run test:coverage:core` | 通过 | 62 files / 284 tests；已把 `src/renderer/data/message-core/**/*.ts` 纳入覆盖率门禁。全局 Statements 66.34%、Branches 57.84%、Functions 75.83%、Lines 69.74%；`message-core.ts` Statements 88.05%、Branches 80.13%、Functions 89.65%、Lines 91.73%。 |
| `npm run test:browser -- tests/browser/im-read-full-scenarios.spec.ts` | 通过 | 首次因 sandbox 端口绑定失败；授权后首次因缺 Playwright Chromium 失败；安装 chromium 后重跑通过，2 passed。 |
| `npm run check:quick` | 通过 | typecheck、Electron typecheck、lint、边界测试、docs、P19 audit、shape 全部通过。 |
| `git diff --check` | 通过 | 无空白错误。 |

## 手工验证

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| Gateway + 轮询同一消息去重 | 通过 | `message-core.spec.ts` 的 `deduplicates gateway and polled messages by server message id`。 |
| 本地发送与服务端确认合并 | 通过 | `message-core.spec.ts` 的 `merges a local message with server confirmation by client id`。 |
| 服务端缺少 client id 时内容签名兜底 | 通过 | `message-core.spec.ts` 的 `uses content signature only as a fallback for pending local echoes`。 |
| 旧 seq 不覆盖会话 preview | 通过 | `message-core.spec.ts` 的 `does not let an older sequence overwrite the conversation preview`。 |
| 撤回/删除最后一条重算会话摘要 | 通过 | `message-core.spec.ts` 与 `message-cache-mutation-model.spec.ts`。 |
| read seq 清未读并更新自己消息已读 | 通过 | `message-core.spec.ts` 与 `message-cache-mutation-model.spec.ts`。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 新增 reducer 返回的诊断事件，不直接写全局日志。 |
| 日志入口 | `src/renderer/data/message-core/message-core.ts` 的 `MessageCoreDiagnostic`。 |
| traceId/correlationId | 本轮 reducer 为纯函数，未生成 traceId；调用层可在后续统一附加。 |
| 可排查问题 | event reduced、duplicate ignored、out-of-order ignored、last message recomputed。 |
| Codex 检索方式 | `rg -n "message_core\\.|MessageCoreDiagnostic|reduceMessageCoreEvent" src/renderer tests/unit`。 |
| 敏感信息处理 | 诊断只包含 conversationId、messageId、reason，不记录完整消息正文、token、文件路径或 raw payload。 |

## 遗留风险

1. `message-core` 当前通过 React Query facade 渐进接入，尚未替换为全局 normalized map 存储。
2. 诊断事件目前只作为 reducer 返回值存在，后续如需导出到诊断包，需要在 cache facade 汇总。
3. Playwright 浏览器缓存已在本机安装，用于完成 Browser IM 回归验证。

## 下一步

1. 后续如继续扩展消息状态，应先在 `message-core.spec.ts` 添加 RED 用例。
2. 如需让诊断包包含 message-core 事件，在 cache facade 汇总 reducer diagnostics，仍禁止记录完整消息正文。
