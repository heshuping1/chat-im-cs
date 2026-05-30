# 验证记录：P3-API-002B IM Conversation Normalizer

日期：2026-05-29

任务编号：P3-API-002B

## 修改范围

- `src/renderer/data/im/im-conversation-contract.ts`
- `src/renderer/data/api/messages-client.ts`
- `tests/unit/im-conversation-contract.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立普通 IM 会话 DTO normalizer，输出稳定 `ImConversationEntity`，并以兼容方式接入 `MessagesApiClient.getConversations`，让页面暂时继续消费旧 `ConversationListItem` 形状，但字段兼容、缺省值、invalid/degraded 判断开始下沉到 contract 层。

## 实现内容

| 项 | 说明 |
| --- | --- |
| Entity | 新增 `ImConversationEntity`，覆盖 id/type/title/avatar/group avatar/lastMessage/read/unread/peer/group meta。 |
| Normalizer | 新增 `normalizeImConversationDto`，支持 camelCase/snake_case 兼容字段。 |
| 状态 | 使用 `ContractResult` 输出 `ok/degraded/invalid/failed`。 |
| 类型归一 | `im_direct/direct_chat/direct_customer/customer_direct` -> `direct`，`im_group/group_chat` -> `group`。 |
| 兼容输出 | `imConversationEntityToListItem` 把 entity 转回 `ConversationListItem`，降低页面迁移风险。 |
| API 接入 | `getConversations` 使用新 normalizer，invalid/failed 数据不进入列表。 |
| 诊断接入 | `getConversations` 调用 `logApiContractDiagnostic`，记录 status/issues/context/error。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/im-conversation-contract.spec.ts tests/unit/contract-result.spec.ts tests/unit/contract-diagnostics.spec.ts` | 通过 | 3 个测试文件，7 个用例通过，耗时约 127ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 是，接入已有 `api-contract` 诊断入口。 |
| 日志入口 | `src/renderer/data/api-contract/contract-diagnostics.ts` |
| traceId/correlationId | `api-contract-normalize-<timestamp>-<random>` |
| 可排查问题 | 会话 DTO 是否 ok/degraded/invalid/failed，缺少 ID、未知类型、缺标题、缺 read seq 等字段。 |
| Codex 检索方式 | `rg -n "normalizeImConversationDto|logApiContractDiagnostic|im.conversation" src/renderer` |
| 敏感信息处理 | 日志只记录 conversationId 和 issue 摘要，不记录标题、消息正文、手机号、邮箱、token。 |

## 遗留风险

| 风险 | 说明 | 后续任务 |
| --- | --- | --- |
| 页面仍消费 `ConversationListItem` | 本任务为了降低风险保留兼容输出，页面未直接切到 entity/view model。 | P3-API-002C 后继续扩大测试，P5/P4 再迁页面。 |
| 旧 `validateConversationSummaryContract` 仍保留 | 仍用于 read model 兼容诊断，避免一次性改 read 链路。 | P4 Read Model 合并时统一。 |
| sender identity 仍未完全 domain 化 | 当前只搬会话层字段，复杂 sender 判断仍在 `message-display.ts`。 | P3-API-003B/P4 Message Domain。 |

## 结论

P3-API-002B 已完成。普通 IM 会话 DTO 已有新的 contract/entity 入口，API client 已兼容接入，页面行为保持低风险稳定。
