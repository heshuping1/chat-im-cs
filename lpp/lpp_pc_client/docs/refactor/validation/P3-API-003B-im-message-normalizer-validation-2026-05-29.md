# 验证记录：P3-API-003B IM Message Normalizer

日期：2026-05-29

任务编号：P3-API-003B

## 修改范围

- `src/renderer/data/im/im-message-contract.ts`
- `src/renderer/data/api/messages-client.ts`
- `tests/unit/im-message-contract.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

建立普通 IM 消息 DTO normalizer，统一消息 ID、conversationId、conversationSeq、sender、content/body、preview、时间和状态字段，并兼容接入 `MessagesApiClient.getConversationMessages`。

## 实现内容

| 项 | 说明 |
| --- | --- |
| Entity | 新增 `ImMessageEntity` 和 `ImMessageSenderEntity`。 |
| Normalizer | 新增 `normalizeImMessageDto`，支持 camelCase/snake_case 兼容字段。 |
| 内容复用 | 复用 `im-message-normalize.ts` 的 `normalizeMessageType`、`normalizeMessageBody`、`inferMessageType`、`messagePreviewFromBody`。 |
| ID 策略 | 缺 `messageId` 但有 `conversationId + conversationSeq` 时生成 `seq:<conversationId>:<seq>`，标记 degraded。 |
| invalid 规则 | 缺 `conversationSeq` 或无法生成消息 ID 时返回 `invalid`。 |
| 兼容输出 | `imMessageEntityToDto` 转回旧 `MessageItemDto`，页面暂不大改。 |
| API 接入 | `getConversationMessages` 使用新 normalizer，并对 invalid/failed 消息过滤。 |
| 诊断接入 | `getConversationMessages` 调用 `logApiContractDiagnostic`，记录 status/issues/context/error。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/im-message-contract.spec.ts tests/unit/im-conversation-contract.spec.ts tests/unit/contract-diagnostics.spec.ts` | 通过 | 3 个测试文件，10 个用例通过，耗时约 136ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 快速 TypeScript 检查通过。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 是，接入已有 `api-contract` 诊断入口。 |
| 日志入口 | `src/renderer/data/api-contract/contract-diagnostics.ts` |
| traceId/correlationId | `api-contract-normalize-<timestamp>-<random>` |
| 可排查问题 | 消息 DTO 是否 ok/degraded/invalid/failed，缺少 seq、缺少 ID、生成 ID、缺类型等。 |
| Codex 检索方式 | `rg -n "normalizeImMessageDto|logApiContractDiagnostic|im.message" src/renderer` |
| 敏感信息处理 | 日志只记录 conversationId、messageId 和 issue 摘要，不记录消息正文、媒体 URL、token。 |

## 遗留风险

| 风险 | 说明 | 后续任务 |
| --- | --- | --- |
| 页面仍消费 `MessageItemDto` | 本任务采用兼容输出，页面未直接切换到 message entity/view model。 | P4 Message Domain/P5 页面瘦身。 |
| 引用消息和媒体解析仍在组件 | 当前 contract 只归一 body/type/preview，不重构 bubble/media action。 | P4 Media Model/Message ViewModel。 |
| 客服消息暂未接入 | 客服也复用 `MessageItemDto`，但本任务只治理普通 IM。 | P6/P4 客服消息底座。 |

## 结论

P3-API-003B 已完成。普通 IM 消息 DTO 已有新的 contract/entity 入口，API client 已兼容接入。
