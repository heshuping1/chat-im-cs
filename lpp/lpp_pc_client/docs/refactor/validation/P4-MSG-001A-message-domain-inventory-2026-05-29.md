# 验证记录：P4-MSG-001A Message Domain 盘点

日期：2026-05-29
任务编号：P4-MSG-001A
状态：已完成

## 目标

盘点普通 IM 与客服现有 message 类型、字段、状态、渲染依赖，为 P4 统一消息底座提供可查依据。

## 当前消息类型来源

| 来源 | 文件 | 当前模型 |
| --- | --- | --- |
| 普通 IM API | `src/renderer/data/api/messages-client.ts` | `MessageItemDto[]`，已接 `normalizeImMessageDto`。 |
| 普通 IM Gateway | `src/renderer/data/gateway/gateway-event-adapter.ts` | `NormalizedImMessage`，进入 `im-gateway-handler`。 |
| 普通 IM 本地发送 | `src/renderer/components/MessageCenter.tsx` | 页面内构造 `MessageItemDto`，含 `status/localTaskId/uploadProgress/localError` 等扩展字段。 |
| 普通 IM 本地 echo 合并 | `src/renderer/data/im-local-outgoing.ts` | 基于 `MessageItemDto` 合并 server/local message。 |
| 客服线程详情 | `src/renderer/data/api/customer-service-client.ts` | `CustomerServiceThreadDetailResponse.messages?: MessageItemDto[]`。 |
| 客服发送结果 | `src/renderer/components/ChatWorkspace.tsx` | 页面内构造 `MessageItemDto`，与 IM 发送逻辑重复。 |
| 消息展示 | `src/renderer/components/ChatMessageBubble.tsx`、`MessageBodyView.tsx` | 直接消费 `MessageItemDto`、`message.body`、`messageType`、`status`。 |

## 公共字段

| 字段 | 说明 | 当前风险 |
| --- | --- | --- |
| `messageId` | 服务端消息 ID 或本地临时 ID | 本地 ID 规则散落：`pc-local-*`、`pc-upload-*`、`pc-cs-*`。 |
| `conversationId` | 普通 IM 会话 ID 或客服 conversation/thread ID | 客服会兜底为 `threadId`，语义不稳定。 |
| `conversationSeq` | 服务端递增序号 | 本地消息可能为空，排序依赖各处自写。 |
| `senderUserId/senderId/fromUserId` | 用户维度 sender | 页面多处重复判断 self。 |
| `senderPlatformUserId/platformUserId` | 平台用户维度 sender | 普通 IM 与客服都在用，但入口不统一。 |
| `senderLppId/lppId` | LPP 身份 sender | 普通 IM、客服、Gateway 均需兼容。 |
| `senderDisplayName/senderAvatarUrl/avatarUrl` | 展示身份 | 头像/名称后续应归入公共 identity/avatar 能力。 |
| `messageType` | text/image/video/file/voice/location/contact/event 等 | 规范化逻辑分散在 `im-message-normalize`、页面 helper、bubble。 |
| `body` | 消息内容 | 媒体、名片、事件、markdown、文本等结构兼容逻辑集中度不足。 |
| `preview` | 列表和搜索展示 | `messagePreviewFromBody` 已可复用，但页面仍有 `previewFrom*` 重复。 |
| `sentAt/readAt/readCount/isRead` | 时间与已读 | 普通 IM 与客服展示复用，但 read model 语义不同。 |
| `status/isRecalled/isSelf/isMine/direction` | UI 和业务状态 | 发送状态、撤回状态、方向判断仍在页面重复。 |

## 当前扩展字段

| 字段 | 出现位置 | 归属判断 |
| --- | --- | --- |
| `localTaskId` | `MessageCenter`、`ChatWorkspace` | 发送队列/上传任务，不应作为通用服务端 DTO 字段。 |
| `uploadProgress` | `MessageCenter`、`ChatWorkspace` | 发送队列/上传状态。 |
| `localError` | `MessageCenter`、`ChatWorkspace` | 发送失败诊断和 UI 状态。 |
| `status=uploading/paused/canceled/sending/failed/sent` | 页面发送链路 | 应归入统一发送状态机。 |
| `imReadContractLevel/imReadContractDiagnostics` | `ConversationListItem` | 会话/read 合同字段，不能混进 message entity。 |

## 渲染依赖

| 能力 | 当前位置 | 问题 |
| --- | --- | --- |
| 内容切片 | `im-message-normalize.ts` | 已比较集中，可作为 message content adapter 基础。 |
| Bubble 渲染 | `ChatMessageBubble.tsx`、`MessageBodyView.tsx` | 接口仍是 `MessageItemDto`，耦合 DTO 字段。 |
| 自己/对方判断 | `message-display.ts`、`MessageCenter.tsx`、`ChatWorkspace.tsx` | `isMineMessage` 重复实现，后续应迁入 shared message view model。 |
| 媒体判断/文件名/打开/复制 | `MessageCenter.tsx`、`ChatWorkspace.tsx`、`im-message-normalize.ts` | 媒体能力重复，P4-MSG-004/P7-SHARED-004 需要统一。 |
| 发送状态文案 | `MessageCenter.tsx`、`ChatWorkspace.tsx` | 后续由 send queue view model 提供。 |
| 撤回/事件消息 | `MessageCenter.tsx`、`MessageBodyView.tsx` | `messageType=event`、`isRecalled/status=recalled` 规则分散。 |

## 主要结论

1. `MessageItemDto` 目前同时承担服务端 DTO、domain entity、view model、本地发送状态四种职责，是 P4 需要拆分的核心。
2. 普通 IM 与客服的消息字段 80% 可共享：ID、conversation、sender、type/body/preview、sentAt、direction、status。
3. 差异点不应硬塞进公共层：普通 IM 的 readSeq/readCount、客服的 threadType/threadId、发送队列的 localTaskId/uploadProgress/localError 应作为扩展或 view state。
4. 先定义共享 `ChatMessageEntity`，再让 IM/客服 normalizer 输出或适配到该 entity，是比直接改页面更稳的路径。
5. 页面渲染短期可继续吃 `MessageItemDto`，但 P4 后续新增逻辑必须先经过 message domain/view model，不再在页面里解释 raw body/status。

## 推荐 P4-MSG-001B 切入

1. 新增 `src/renderer/data/message/message-domain.ts`。
2. 定义 `ChatMessageEntity`、`ChatMessageSenderEntity`、`ChatMessageContext`、`ChatMessageDeliveryState`、`ChatMessageDirection`。
3. 只放类型与纯转换 helper，不接页面、不改 API 行为。
4. 复用现有 `normalizeMessageBody/messagePreviewFromBody/normalizeMessageType`，不重造内容解析轮子。
5. 补单测验证 IM message entity、客服 message entity、本地发送扩展字段的映射。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `rg -n "export interface .*Message\|MessageItemDto\|messageType\|conversationSeq\|localTaskId\|uploadProgress\|localError" src/renderer/data src/renderer/components src/renderer/messages -g '*.ts' -g '*.tsx'` | 通过 |
| `sed -n '380,450p' src/renderer/data/api/types.ts` | 通过 |
| `sed -n '1,240p' src/renderer/data/im-local-outgoing.ts` | 通过 |
| `sed -n '1,260p' src/renderer/data/im-message-normalize.ts` | 通过 |

## 结论

P4-MSG-001A 已完成。下一步执行 P4-MSG-001B，建立共享 message entity 和差异扩展点。
