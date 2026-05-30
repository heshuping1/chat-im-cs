# 验证记录：P4-MSG-001C IM Message Domain Migration

日期：2026-05-29
任务编号：P4-MSG-001C
状态：已完成

## 目标

将普通 IM normalizer 输出迁移到统一 message entity，同时保持现有 `MessageItemDto` 兼容输出，避免页面联动改动。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/im/im-message-contract.ts` | `ImMessageEntity` 改为基于 `ChatMessageEntity`，保留 `conversationId/status/isSelf/isMine/isRecalled` 兼容字段。 |
| `tests/unit/im-message-contract.spec.ts` | 增加 `source/conversation` 断言，验证已输出共享 entity。 |

## 迁移策略

- `normalizeImMessageDto` 仍返回 `ContractResult<ImMessageEntity>`。
- `ImMessageEntity` 现在包含 `ChatMessageEntity` 的 `source/conversation/delivery/direction/local` 结构。
- `imMessageEntityToDto` 复用 `chatMessageEntityToDto`，继续输出旧页面兼容的 `MessageItemDto`。
- 当前不改页面消费点，后续 P5/P6 再逐步改为 view model。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/im-message-contract.spec.ts tests/unit/message-domain.spec.ts tests/unit/im-conversation-contract.spec.ts` | 通过，3 files / 13 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P4-MSG-001C 已完成。普通 IM 消息 normalizer 已接入统一 message entity，旧 DTO 出口保持兼容。
