# 验证记录：P4-MSG-001B Message Domain Entity

日期：2026-05-29
任务编号：P4-MSG-001B
状态：已完成

## 目标

定义共享 message entity 和 IM/客服差异扩展点，为普通 IM 与客服消息统一底座提供稳定类型。

## 变更范围

| 文件 | 说明 |
| --- | --- |
| `src/renderer/data/message/message-domain.ts` | 新增 `ChatMessageEntity`、sender、conversation context、delivery、direction、local state 以及 DTO 兼容转换。 |
| `tests/unit/message-domain.spec.ts` | 覆盖普通 IM、客服、本地上传扩展、状态归一、DTO 兼容输出。 |

## 核心模型

| 类型 | 说明 |
| --- | --- |
| `ChatMessageSource` | `im` 或 `customer_service`。 |
| `ChatMessageConversationContext` | 统一 conversation/thread 上下文，客服可带 `threadId/threadType`。 |
| `ChatMessageSenderEntity` | 统一 user/platform/lpp/sender/from 身份。 |
| `ChatMessageDeliveryState` | `idle/queued/uploading/paused/sending/sent/failed/canceled/recalled`。 |
| `ChatMessageDirection` | `incoming/outgoing/system/unknown`。 |
| `ChatMessageLocalState` | `localTaskId/uploadProgress/localError/optimistic`，限定为本地发送扩展。 |

## 设计约束

- 不新增依赖。
- 不重造消息内容解析，复用 `im-message-normalize.ts` 的 `normalizeMessageType/normalizeMessageBody/messagePreviewFromBody`。
- 不改页面和 API 行为，当前只建立底座类型与兼容转换。
- 不把客服特有 `threadId/threadType` 混入普通 IM 字段，放在 `conversation` 扩展点。
- 不把本地上传状态当作服务端 DTO 字段，放在 `local` 扩展点。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/vitest run tests/unit/message-domain.spec.ts tests/unit/im-message-contract.spec.ts tests/unit/media-message.spec.ts` | 通过，3 files / 14 tests |
| `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit --pretty false --skipLibCheck` | 通过 |

## 结论

P4-MSG-001B 已完成。后续 IM/客服 normalizer 可以先输出 `ChatMessageEntity`，页面再逐步从 `MessageItemDto` 迁移到 view model。
