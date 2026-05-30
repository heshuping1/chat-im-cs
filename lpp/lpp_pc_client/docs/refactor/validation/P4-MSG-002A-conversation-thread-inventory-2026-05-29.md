# 验证记录：P4-MSG-002A Conversation/Thread 盘点

日期：2026-05-29
任务编号：P4-MSG-002A
状态：已完成

## 目标

盘点普通 IM conversation 与客服 thread 的公共字段、差异字段和消费依赖，为 P4-MSG-002B 定义共享 conversation entity 提供依据。

## 当前模型来源

| 来源 | 文件 | 当前模型 |
| --- | --- | --- |
| 普通 IM 会话 | `src/renderer/data/api/types.ts` | `ConversationListItem`。 |
| 普通 IM normalizer | `src/renderer/data/im/im-conversation-contract.ts` | `ImConversationEntity`，再转回 `ConversationListItem`。 |
| 客服线程 | `src/renderer/data/api/types.ts` | `CustomerServiceThread`。 |
| 客服线程 normalizer | `src/renderer/data/customer-service/cs-contract.ts` | `CustomerServiceThreadEntity`，再转回 `CustomerServiceThread`。 |
| 客服历史 | `StaffServiceHistoryItem` -> `staffServiceHistoryItemToThread` | 历史项转客服线程 DTO。 |

## 公共字段

| 公共语义 | 普通 IM | 客服 |
| --- | --- | --- |
| 主 ID | `conversationId` | `threadId`，兼容 `conversationId` |
| 类型 | `conversationType: direct/group` | `threadType: temp_session/im_direct` |
| 标题 | `title` | `title` |
| 头像 | `avatarUrl/groupAvatarUrl/memberAvatarUrls` | `avatarUrl/customerAvatarUrl` |
| 最近消息预览 | `lastMessage.preview` | `lastMessagePreview` |
| 最近消息时间 | `lastMessage.sentAt` | `lastMessageAt/updatedAt` |
| 未读数 | `unreadCount` | `unreadCount` |
| 静音/置顶 | `isMuted/isPinned` | 当前无稳定字段 |
| 状态 | 主要靠 read/send/message 状态 | `status/normalizedStatus/isTerminal` |
| 渠道/来源 | peer/group metadata | `source/from/channel/sourceChannel/entryChannel/platform/provider` |

## 差异字段

| 差异 | 普通 IM | 客服 | 归属建议 |
| --- | --- | --- | --- |
| read model | `lastReadSeq/lastMessageSeq/peerReadSeq` | 无同等字段，主要由 thread unread 和详情已读驱动 | `ConversationReadState` 扩展，只给 IM。 |
| 群信息 | `members/memberCount/myRole/ownerDisplayName` | 无 | `GroupConversationExtension`。 |
| 客服状态 | 无 | queued/serving/ai/closed/rated/readonly | `CustomerServiceThreadExtension`，不要污染普通 IM。 |
| 客户画像入口 | 无 | VIP、customerLevel、priority、tags、source | 客服扩展。 |
| 主键语义 | conversation 是聊天会话 | thread 是客服工作单/会话容器 | 共享 entity 要保留 `source` 和 `stableId`，不能只叫 `conversationId`。 |

## 主要消费点

| 消费点 | 依赖 |
| --- | --- |
| `MessageCenter.tsx` | conversation list、选中会话、排序、置顶/免打扰、readSeq、群头像、草稿 key。 |
| `ConversationListParts.tsx` | title、avatar、lastMessage、unread、muted。 |
| `ConversationInfoPanel.tsx` | 群成员、置顶、免打扰、会话资料。 |
| `ThreadList.tsx` | thread 过滤、搜索、队列/接待/VIP、状态标签、未读 badge。 |
| `ChatWorkspace.tsx` | selected thread、readOnly/replyGate、thread detail query、消息发送合并。 |
| `Sidebar.tsx` | 普通 IM 未读、客服未读、客服提醒和桌面通知。 |

## 当前痛点

1. 普通 IM 使用 `conversationId`，客服大量使用 `threadId || conversationId`，主键语义不统一。
2. 普通 IM 最近消息是对象 `lastMessage`，客服是扁平 `lastMessagePreview/lastMessageAt`，列表展示不能复用。
3. read/unread 逻辑散落在 `message-display.ts`、`MessageCenter.tsx`、`Sidebar.tsx`、`ThreadList.tsx`。
4. 客服状态和普通 IM 状态完全不同，必须作为 extension，不能硬塞到统一字段。
5. 群头像、成员可见性属于普通 IM conversation extension，不应要求客服实现。

## 推荐 P4-MSG-002B 切入

1. 新增 `src/renderer/data/conversation/conversation-domain.ts`。
2. 定义 `ChatConversationEntity`，统一 `source/stableId/title/avatar/lastMessagePreview/lastMessageAt/unreadCount`。
3. 定义扩展：`im?: ImConversationExtension`、`customerService?: CustomerServiceThreadExtension`。
4. 提供 `chatConversationEntityFromImConversation` 与 `chatConversationEntityFromCustomerServiceThread` 两个 adapter。
5. 不替换页面消费点，先用测试证明普通 IM/客服可映射。

## 验证命令

| 命令 | 结果 |
| --- | --- |
| `sed -n '1,360p' src/renderer/data/im/im-conversation-contract.ts` | 通过 |
| `sed -n '220,360p' src/renderer/data/api/types.ts && sed -n '450,560p' src/renderer/data/api/types.ts` | 通过 |
| `rg -n "ConversationListItem\|CustomerServiceThread\|threadId\|conversationId\|lastMessagePreview\|unreadCount" src/renderer/components src/renderer/messages -g '*.ts' -g '*.tsx'` | 通过 |

## 结论

P4-MSG-002A 已完成。下一步执行 P4-MSG-002B，定义共享 conversation entity 与 IM/客服扩展边界。
