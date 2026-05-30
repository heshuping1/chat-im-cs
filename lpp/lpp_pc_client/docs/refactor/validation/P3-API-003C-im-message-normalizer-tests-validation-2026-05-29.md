# 验证记录：P3-API-003C IM Message Normalizer Fixtures/Tests

日期：2026-05-29

任务编号：P3-API-003C

## 修改范围

- `tests/unit/im-message-contract.spec.ts`
- `docs/refactor/PC端重构任务矩阵.md`

## 目标

补齐普通 IM 消息 normalizer fixtures/tests，覆盖文本、图片、文件、未知/缺失类型、字段缺失和兼容字段。

## 覆盖场景

| 场景 | 覆盖方式 | 期望 |
| --- | --- | --- |
| 完整文本消息 | `normalizes a complete text message dto` | `status=ok`，sender/body/preview 正常。 |
| snake_case 图片消息 | `accepts compatible snake_case fields and maps back to MessageItemDto` | `message_id/conversation_seq/message_body` 正常归一。 |
| 缺 messageId | `generates a degraded id from conversation seq when message id is missing` | 生成 `seq:<conversationId>:<seq>`，记录 `im.message.generated_id`。 |
| 缺 messageId 与 seq | `marks messages without seq and id as invalid` | `status=invalid`，记录 `missing_seq/missing_id`。 |
| 缺类型/未知内容 | `degrades missing type to text fallback` | `status=degraded`，fallback `text/[消息]`。 |

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `./node_modules/.bin/vitest run tests/unit/im-message-contract.spec.ts tests/unit/im-conversation-contract.spec.ts tests/unit/contract-diagnostics.spec.ts` | 通过 | 3 个测试文件，10 个用例通过，耗时约 136ms。 |
| `./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 | 与 P3-API-003B 同轮类型检查通过。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，本任务为测试覆盖登记。 |
| 日志入口 | P3-API-003B 已接入 `logApiContractDiagnostic`。 |
| traceId/correlationId | `api-contract-normalize-<timestamp>-<random>`。 |
| 可用于排查的问题 | 测试覆盖消息 DTO 字段缺失、兼容字段和 degraded/invalid 场景。 |
| 敏感信息处理 | fixtures 使用虚拟 ID/URL，不使用真实聊天内容、用户隐私或 token。 |

## 结论

P3-API-003C 已完成。普通 IM 消息 normalizer 具备最小单测保护。
