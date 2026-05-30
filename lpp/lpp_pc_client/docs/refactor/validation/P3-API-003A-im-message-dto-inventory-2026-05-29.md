# 验证记录：P3-API-003A 普通 IM 消息 DTO 字段矩阵

日期：2026-05-29

任务编号：P3-API-003A

## 盘点范围

- `src/renderer/data/api/types.ts`
- `src/renderer/data/api/messages-client.ts`
- `src/renderer/data/im-api-contract.ts`
- `src/renderer/data/im-message-normalize.ts`
- `src/renderer/data/im-read-model.ts`
- `src/renderer/data/read-receipts.ts`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/ChatMessageBubble.tsx`
- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/messages/**`
- `src/renderer/media/**`

## 当前接口入口

| 入口 | 说明 |
| --- | --- |
| `MessagesApiClient.getConversationMessages` | 请求 direct/group messages，返回 `MessageItemDto[]`。 |
| `validateMessagePageContract` | 对消息页做 read model 校验，当前主要关注 `conversationSeq` 和 sender。 |
| `normalizeMessageItem` | 归一 `messageType/body/preview`，并生成 emoji 预览。 |
| `GatewayBridge/gateway-event-adapter` | Gateway 消息也会归一到类似 `MessageItemDto` shape。 |

## DTO 字段矩阵

| 字段 | 当前来源/兼容字段 | 当前用途 | 风险 |
| --- | --- | --- | --- |
| `messageId` | `messageId/message_id/id` | React key、右键动作、撤回、删除、收藏、转发、翻译、语音转文字。 | 缺失会影响动作能力，展示可降级但必须记录。 |
| `conversationId` | `conversationId/conversation_id/chatId/chat_id`，API 可由请求参数补齐 | 查询、cache patch、媒体缓存上下文、read model。 | 缺失时可从当前 conversation 参数补齐。 |
| `conversationSeq` | `conversationSeq/conversation_seq/seq/messageSeq/message_seq` | 排序、已读、未读跳转、对端已读回执。 | 核心 read 字段，缺失时 read model 不可靠。 |
| `senderUserId` | `senderUserId/sender_user_id/userId/user_id` | 自己消息判断、头像/身份。 | 兼容字段分散，需要 identity normalizer。 |
| `senderId/fromUserId` | `senderId/sender_id/fromUserId/from_user_id` | 自己消息 fallback。 | 和 `senderUserId` 重复，优先级需统一。 |
| `senderPlatformUserId/platformUserId` | `senderPlatformUserId/sender_platform_user_id/platformUserId/platform_user_id` | 跨平台身份匹配。 | 当前多个文件各自读取。 |
| `senderLppId/lppId` | `senderLppId/sender_lpp_id/lppId/lpp_id` | LPP 身份匹配。 | 后续进入 identity entity。 |
| `senderDisplayName` | `senderDisplayName/sender_display_name` | 头像 fallback、消息发送者展示、自己消息 fallback。 | 不应作为唯一身份判断。 |
| `senderAvatarUrl/avatarUrl` | `senderAvatarUrl/sender_avatar_url/avatarUrl/avatar_url` | 头像展示。 | 可复用 `PcAvatar`，后续 identity view model 统一。 |
| `messageType` | `messageType/message_type/type` 或 body 中 `messageType/type` | 气泡渲染、媒体动作、preview、未知类型提示。 | 当前 `im-message-normalize.ts` 已有较好基础。 |
| `body` | `body/messageBody/message_body/content` | 文本、媒体、引用、位置、名片等内容。 | 页面和 bubble 仍直接读取 reply/media 字段。 |
| `preview` | `preview/text/content/message` 或由 body 推导 | 会话预览、toast、通知、消息列表。 | 需要统一 preview adapter。 |
| `sentAt` | `sentAt/sent_at/createdAt/created_at/serverTime` | 排序、时间展示、message key。 | 缺失可降级为当前时间或空展示，需记录。 |
| `readAt/readCount/isRead` | DTO 字段 | 已读状态、扩展展示。 | 当前消费较少，后续 read model 统一。 |
| `status` | DTO 字段 | 本地发送、失败、撤回等状态。 | 和 local outgoing 状态混用。 |
| `isRecalled` | DTO 字段 | 撤回态。 | 需 message entity 明确。 |
| `isSelf/isMine/direction` | `isSelf/isMine/is_self/is_mine/direction/messageDirection` | 自己消息判断。 | 与 sender identity 重复，需统一优先级。 |
| `reply/quote` | body 内 `reply/replyTo/quotedMessage/quote` | 引用预览。 | 目前在 `ChatMessageBubble` 局部解析。 |
| `mentions` | body 内或发送参数 | 群聊 mention。 | 后续 composer/send queue 统一。 |

## 主要消费点

| 消费点 | 当前依赖 |
| --- | --- |
| `MessageCenter.tsx` | 发送、local echo、上传、撤回、删除、收藏、转发、翻译、语音转文字、read model、滚动定位。 |
| `ChatMessageBubble.tsx` | `messageType/body/preview/senderDisplayName/sentAt` 和引用消息。 |
| `read-receipts.ts` | `conversationSeq`、sender identity、`isSelf/isMine`。 |
| `im-read-model.ts` | `messageId/conversationSeq/sender*/messageType/isSelf/isMine`。 |
| `media/domain` 与 `media/runtime` | 图片、视频、文件资源解析和缓存。 |
| `ChatWorkspace.tsx` | 客服消息也复用 `MessageItemDto`，但本任务只治理普通 IM。 |

## 当前问题

| 问题 | 影响 | 后续处理 |
| --- | --- | --- |
| `MessageItemDto` 同时是 DTO、domain 和 view model | 页面和 domain 都直接解释 raw 字段。 | P3-API-003B 建立 `ImMessageEntity` 和兼容输出。 |
| read 校验与展示 normalizer 分散 | `im-api-contract.ts` 关注 seq/sender，`im-message-normalize.ts` 关注 type/body/preview。 | P3-API-003B 包一层统一 contract。 |
| sender identity 字段兼容散落 | 自己消息判断散在 `message-display`、`read-receipts`、`ChatWorkspace`。 | P4 Message Domain/Identity 统一。 |
| 引用消息和媒体解析仍在组件 | Bubble 直接读 `reply/quote`，媒体动作直接读 body。 | P4 Media/ViewModel 统一。 |

## 推荐 P3-API-003B 最小切入

1. 新增 `data/im/im-message-contract.ts`。
2. 定义 `ImMessageEntity`，覆盖 id、conversation、seq、sender、type、body、preview、time、status。
3. 复用 `im-message-normalize.ts` 现有 body/type/preview 能力，不重复造轮子。
4. `MessagesApiClient.getConversationMessages` 先输出兼容 `MessageItemDto`，不大改页面。
5. 接入 `logApiContractDiagnostic`，只记录 ID/seq/type issue，不记录正文。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `sed -n '300,430p' src/renderer/data/api/types.ts` | 通过 | 确认 `MessageItemDto` 字段。 |
| `sed -n '1,260p' src/renderer/data/im-message-normalize.ts` | 通过 | 确认现有 body/type/preview 能力。 |
| `sed -n '1,220p' src/renderer/data/im-api-contract.ts` | 通过 | 确认现有 read contract 能力。 |
| `rg -n "MessageItemDto|normalizeMessageItem|messageId|conversationSeq|messageType|senderDisplayName|replyTo|mentions|preview|body|sentAt|isMine|isSelf" ...` | 通过 | 检索消息 DTO 消费点。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，本任务为字段盘点。 |
| 日志入口 | P3-API-003B/003C 使用 `data/api-contract/contract-diagnostics.ts`。 |
| traceId/correlationId | `api-contract-normalize-<timestamp>-<random>`。 |
| 可用于排查的问题 | 消息字段缺失、未知类型、invalid/degraded 会在后续 normalizer 接入。 |
| 敏感信息处理 | 本文只列字段名，不记录真实消息正文、文件地址、token 或用户隐私。 |

## 结论

P3-API-003A 已完成。普通 IM 消息 DTO 的最小治理路径是新增 message contract，并复用现有 `im-message-normalize.ts`，避免重复造轮子。
