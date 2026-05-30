# 验证记录：P4-MSG-001D CS Message Domain Migration

日期：2026-05-29
任务编号：P4-MSG-001D
状态：已完成

## 目标

将客服 normalizer 输出迁移到统一 message entity，同时保持 `ChatWorkspace` 当前依赖的 `MessageItemDto` 输出不变。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/customer-service/cs-message-contract.ts` | 新增客服消息 normalizer，输出 `CustomerServiceMessageEntity`，基于共享 `ChatMessageEntity`。 |
| `src/renderer/data/api/customer-service-client.ts` | 在线程详情 `messages` 读取后接入客服消息 normalizer，再回写兼容 DTO。 |
| `tests/unit/cs-message-contract.spec.ts` | 覆盖客服消息 entity、缺 ID/seq 降级、DTO 兼容输出。 |

## 迁移策略

- 客服消息的 `threadId/threadType` 放入 `conversation` 上下文和 `CustomerServiceMessageEntity` 扩展字段。
- 缺 `messageId/conversationSeq` 的历史数据保持可展示：生成 fallback ID 并标记 degraded，不直接丢消息。
- 线程详情仍输出 `messages: MessageItemDto[]`，页面暂不改动。
- 每条客服消息合同进入 `api-contract` 诊断，接口名 `pc-cs-thread-messages`。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/cs-message-contract.spec.ts tests/unit/cs-contract.spec.ts tests/unit/message-domain.spec.ts` | 通过，3 files / 12 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P4-MSG-001D 已完成。普通 IM 与客服消息都已接入统一 `ChatMessageEntity`，后续可在 view model 层逐步替换页面对 `MessageItemDto` 的直接依赖。
