# 验证记录：P3-API-002A 普通 IM 会话 DTO 字段矩阵

日期：2026-05-29

任务编号：P3-API-002A

## 盘点范围

- `src/renderer/data/api/types.ts`
- `src/renderer/data/api/messages-client.ts`
- `src/renderer/data/im-api-contract.ts`
- `src/renderer/data/message-display.ts`
- `src/renderer/data/gateway/im-gateway-cache.ts`
- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/messages/**`
- `src/renderer/data/contact-directory.ts`

## 当前接口入口

| 入口 | 说明 |
| --- | --- |
| `MessagesApiClient.getConversations` | 请求 `endpointPlan.conversations`，返回 `ConversationListResponse`。 |
| `isPlainImConversation` | 在 API client 内过滤普通 IM 会话，排除 `temp_session` 和客服会话 shape。 |
| `normalizeConversationSummaryFromContract` | 调用 `validateConversationSummaryContract`，回填 read/unread 相关字段。 |
| `validateConversationSummaryContract` | 当前只覆盖 read model 所需的 `conversationId/type/seq/read/unread/lastMessage`。 |

## DTO 字段矩阵

| 字段 | 当前来源/兼容字段 | 当前用途 | 风险 |
| --- | --- | --- | --- |
| `conversationId` | `conversationId`，contract 兼容 `conversation_id/chatId/chat_id` | 列表 key、选中会话、消息查询、read key、cache patch。 | 核心 ID，缺失必须 `invalid`。 |
| `conversationType` | `conversationType`，contract 兼容 `conversation_type/type` | 区分 direct/group，过滤 IM，会话 read key，消息接口选择。 | 目前 API client 过滤和 contract 各有一套 normalize。 |
| `title` | `title` | 会话行、详情头、转发弹窗、头像 fallback。 | 缺失时页面可能直接显示空，需要 view model 统一 fallback。 |
| `avatarUrl` | `avatarUrl` | 头像展示。 | 群头像还有多套字段，需统一 avatar model。 |
| `groupAvatarUrl/groupIconUrl/iconUrl` | 群头像兼容字段 | 群头像展示和 composite fallback。 | 字段散落在页面 helper。 |
| `memberAvatarUrls/memberAvatars/members` | 群成员头像/信息 | 群组合头像、群信息面板。 | 可见性字段多，后续应进入 group avatar normalizer。 |
| `avatarVisible/memberAvatarVisible/canViewMemberAvatars` | 群头像隐私/权限 | 决定是否显示组合头像。 | 规则散落，需 view model 统一。 |
| `memberListVisible/canViewMemberList/membersVisible` | 群成员列表权限 | 群资料面板。 | 规则散落，需权限 view model。 |
| `lastMessage.messageId` | `lastMessage.messageId` | read key、排序稳定性、消息预览。 | 缺失可降级但影响定位。 |
| `lastMessage.messageType` | `messageType` | 预览格式和渲染提示。 | 未知类型需 `degraded`。 |
| `lastMessage.preview` | `preview` | 会话预览、转发弹窗、信息面板。 | 可能含 emoji/富文本，需要统一 preview adapter。 |
| `lastMessage.sentAt` | `sentAt` | 排序、时间展示、已读本地判断。 | 缺失会影响排序，需降级 reason。 |
| `lastMessage.sender*` | `senderUserId/senderId/fromUserId/senderPlatformUserId/platformUserId/senderLppId/lppId` | 自己消息判断、未读修正。 | 当前兼容链在 `message-display.ts` 很长，应下沉到 identity normalizer。 |
| `lastMessage.senderDisplayName` | `senderDisplayName` | 自己消息 fallback 判断、展示。 | 只可作为 fallback，不应作为唯一身份。 |
| `lastMessage.isSelf/isMine/direction` | `isSelf/isMine/direction` | 自己消息判断。 | 和 sender identity 重复，需明确优先级。 |
| `unreadCount` | `unreadCount` | 未读 badge、排序、跳转新消息。 | 应经过 read model 修正，不能页面直接信任。 |
| `lastReadSeq` | `lastReadSeq` | 当前用户已读序号。 | 核心 read 字段，缺失影响 unread。 |
| `lastMessageSeq` | `lastMessageSeq` | 最新消息序号、read 计算。 | 核心 read 字段，缺失需 `invalid/degraded` 分场景。 |
| `peerReadSeq` | `peerReadSeq` | 直聊对端已读回执。 | 仅 direct 有意义，group 可忽略。 |
| `imReadContractLevel` | 当前本地补充 | read contract 结果。 | 旧语义为 `ok/degraded/blocking`，后续迁移到 `ContractResult`。 |
| `imReadContractDiagnostics` | 当前本地补充 | read contract diagnostics。 | 后续迁移到 `ContractIssue[]` 和 api-contract diagnostics。 |
| `isPinned/isMuted` | DTO 字段 | 列表置顶/免打扰。 | 当前 UI 支持有限，后续 view model 明确。 |
| `peerUserId/peerLppId/peerLppNo/peerLppNumber/peerUserNo` | peer identity 字段 | 联系人映射、头像/资料入口。 | 应进入 identity entity。 |
| `peerDisplayName` | peer display | 直聊标题 fallback。 | 当前 title 与 peerDisplayName 关系未统一。 |
| `peerPhoneMasked/peerEmailMasked` | 脱敏联系方式 | 联系人资料。 | 不得写入诊断日志。 |
| `memberCount/ownerDisplayName/myRole` | 群信息 | 群 meta、权限展示。 | 后续 group domain 统一。 |

## 主要消费点

| 消费点 | 当前依赖 |
| --- | --- |
| `MessageCenter.tsx` | 会话列表、选中会话、read model upsert、未读跳转、排序、上下文菜单、cache patch。 |
| `Sidebar.tsx` | IM 总未读数。 |
| `ConversationListParts.tsx` | 会话行展示、头像、未读 badge。 |
| `ConversationInfoPanel.tsx` | 会话资料、群成员、最后消息。 |
| `ForwardDialog.tsx` | 转发目标列表展示。 |
| `useActiveImConversationQueries.ts` | 根据会话类型和 ID 拉消息/成员/read status。 |
| `useGroupAvatarSnapshots.ts` | 群头像组合与缓存。 |
| `useMediaUploadTaskRegistry.ts` | 上传任务绑定会话。 |
| `contact-directory.ts` | 从会话构造联系人/群聊目录项。 |
| `im-gateway-cache.ts` | Gateway 消息/已读事件 patch 会话列表。 |

## 当前问题

| 问题 | 影响 | 后续处理 |
| --- | --- | --- |
| `ConversationListItem` 同时是 DTO、domain 和 view model | 页面直接消费 raw/normalized 混合字段，修改字段兼容容易影响 UI。 | P3-API-002B 建立 `ImConversationEntity` 和 normalizer。 |
| 会话类型 normalize 重复 | `messages-client.ts`、`message-display.ts`、Gateway adapter/cache 各有 normalize。 | P3-API-002B 统一到 normalizer。 |
| sender identity 兼容链过长 | `message-display.ts` 直接解释多套 sender 字段，难测试、难复用。 | P3-API-003B/P4 message identity 下沉。 |
| read contract 仍用旧 `blocking` 语义 | 与 P3-API-001B 的 `invalid/failed` 不统一。 | P3-API-002B 做兼容转换。 |
| 群头像/成员可见性规则散落 | 群头像、群成员列表、资料面板规则不集中。 | P7/P4 group view model 统一。 |

## 推荐 P3-API-002B 最小切入

1. 新增 `data/im/im-conversation-contract.ts`。
2. 定义 `ImConversationEntity`，先覆盖 `id/type/title/avatar/lastMessage/read/unread/peer`。
3. 接入 `ContractResult` 和 `logApiContractDiagnostic`。
4. `MessagesApiClient.getConversations` 先调用新 normalizer，再输出兼容 `ConversationListItem`，不直接改页面。
5. 保留旧 `validateConversationSummaryContract` 作为回滚点或 read model 兼容输入。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `rg -n "interface ConversationListItem|type ConversationListItem|ConversationListItem|conversationId|unreadCount|lastMessage|lastMessagePreview|avatarUrl|isGroup|conversationType" src/renderer/data src/renderer/components src/renderer/messages -g '*.ts' -g '*.tsx'` | 通过 | 检索 DTO 字段和消费点。 |
| `sed -n '220,320p' src/renderer/data/api/types.ts` | 通过 | 确认 `ConversationListItem` 字段。 |
| `sed -n '220,360p' src/renderer/data/api/messages-client.ts` | 通过 | 确认会话过滤和当前 contract normalization。 |
| `sed -n '1,220p' src/renderer/data/message-display.ts` | 通过 | 确认未读、自身消息、展示派生逻辑。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，本任务为字段盘点。 |
| 日志入口 | P3-API-002B/002C 使用 `data/api-contract/contract-diagnostics.ts`。 |
| traceId/correlationId | 沿用 `api-contract-<phase>-<timestamp>-<random>`。 |
| 可用于排查的问题 | 会话字段缺失、兼容降级、invalid 会在后续 normalizer 接入。 |
| 敏感信息处理 | 本文只列字段名，不记录真实手机号、邮箱、消息正文、token。 |

## 结论

P3-API-002A 已完成。普通 IM 会话 DTO 当前最大问题是 DTO/domain/view model 混用，下一步应先新增 normalizer，并以兼容输出方式接入 API client，避免大面积改页面。
