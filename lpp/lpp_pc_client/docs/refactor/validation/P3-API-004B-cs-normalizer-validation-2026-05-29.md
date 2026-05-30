# 验证记录：P3-API-004B CS Thread/Profile Normalizer

日期：2026-05-29

任务编号：P3-API-004B

## 修改范围

- `src/renderer/data/customer-service/cs-contract.ts`
- `src/renderer/data/api/customer-service-client.ts`
- `tests/unit/cs-contract.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立客服 thread/customer profile normalizer，隔离页面对 raw DTO 的直接依赖，并以兼容方式接入客服 API client。

## 实现内容

| 项 | 说明 |
| --- | --- |
| Thread entity | 新增 `CustomerServiceThreadEntity`，覆盖 type/id/conversationId/status/title/source/avatar/lastMessage/unread。 |
| Profile entity | 新增 `CustomerProfileEntity`，覆盖身份、展示名、头像、等级、风险/合规摘要和扩展区域。 |
| Thread normalizer | 支持 `threadId/session_id/visitorSessionId/tempSessionId`、多套 title/source/avatar 字段。 |
| Profile normalizer | 支持 `displayName/customerDisplayName/customerName/nickname` 等展示名字段。 |
| 终态摘要 | normalizer 输出 `normalizedStatus/isTerminal`，但不替代 P6 状态机。 |
| API 接入 | `getWorkbenchThreads`、`getThreadProfileCard`、`getWorkbenchThreadDetail` 兼容接入 normalizer。 |
| 诊断接入 | API client 调用 `logApiContractDiagnostic`，只记录 threadId/conversationId/issue 摘要。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/cs-contract.spec.ts tests/unit/contract-diagnostics.spec.ts tests/unit/im-message-contract.spec.ts` | 通过 | 3 个测试文件，11 个用例通过，耗时约 143ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 是，接入已有 `api-contract` 诊断入口。 |
| 日志入口 | `src/renderer/data/api-contract/contract-diagnostics.ts` |
| traceId/correlationId | `api-contract-normalize-<timestamp>-<random>` |
| 可排查问题 | 客服线程缺 ID、缺状态、缺标题、profile 缺展示名等。 |
| Codex 检索方式 | `rg -n "normalizeCustomerServiceThreadDto|normalizeCustomerProfileDto|cs.thread|cs.profile" src/renderer` |
| 敏感信息处理 | 日志不记录电话、邮箱、交易数据、风险明细、消息正文或 token。 |

## 遗留风险

| 风险 | 说明 | 后续任务 |
| --- | --- | --- |
| 状态机未替换 | 本任务只输出 `normalizedStatus/isTerminal` 摘要，不改动作权限。 | P6-CS-002。 |
| Cache merge 仍在页面 | `ChatWorkspace` 仍有多处客服 query cache patch。 | P6-CS-004。 |
| 客服消息仍复用普通 `MessageItemDto` | 未做客服消息 entity。 | P4/P6 消息底座。 |

## 结论

P3-API-004B 已完成。客服 thread/profile 已有 contract/entity 入口，并兼容接入 API client。
