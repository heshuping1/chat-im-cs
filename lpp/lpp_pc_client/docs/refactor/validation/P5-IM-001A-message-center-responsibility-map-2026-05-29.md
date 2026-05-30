# P5-IM-001A MessageCenter Responsibility Map

日期：2026-05-29

目标文件：`src/renderer/components/MessageCenter.tsx`

当前规模：约 4735 行。

## 职责分布

| 区域 | 主要职责 | 代表位置/函数 | 迁移建议 |
| --- | --- | --- | --- |
| 数据查询 | 会话列表、消息列表、群成员、联系人、设置、提醒状态 | `conversationsQuery`、`useActiveImConversationQueries`、`groupMembersQuery` | P5-IM-001B/C 建立 `useMessageCenterViewModel` 后收拢 query 派生状态 |
| 会话列表派生 | 筛选、搜索、排序、未读、头像、最近时间 | `visibleConversations`、`filterConversations`、`sortConversations`、`conversationTime` | P5-IM-002B 迁到 conversation list model/service |
| 消息列表派生 | 本地 outgoing 合并、媒体本地预览、历史筛选、事件消息、未读跳转 | `messages`、`visibleMessages`、`filterMessages`、`eventMessageText`、`findFirstUnreadLoadedMessage` | P5-IM-003A/B 迁到 message list model |
| 发送链路 | 文本发送、媒体上传、暂停/取消/重试、本地消息 patch | `sendTextOptimistically`、`startMediaUpload`、`sendMediaOptimistically`、`patchLocalMediaMessage` | P5-IM-001D/P5-IM-004B 迁到 send use case/cache adapter |
| 已读链路 | Gateway/read model 命令执行、mark read、pending read | `executeImCoreCommands`、`applySendSucceededToImCore`、`applyConversationReadToCache` | 已有 P4 read service，P5 只做页面调用下沉 |
| 消息操作 | 撤回、删除、收藏、翻译、语音转文字、转发、批量删除 | `recallMutation`、`deleteMutation`、`favoriteMutation`、`translateMutation`、`forwardMutation`、`handleMenuAction` | P5-IM-005B 建 action map 和权限矩阵 |
| UI 装配 | 左栏、聊天头、消息列表、Composer、右侧资料、弹窗、菜单 | 主 JSX return、`StandaloneConversationInfoView`、dialogs/context menus | P5-IM-001B 先建立壳，不改 DOM |
| 头像/身份 | 群头像、成员映射、资料弹层、发送人 fallback | `resolveGroupConversationAvatar`、`buildGroupMemberMap`、`resolveSenderDisplayName`、`buildAvatarProfilePopover` | P7 统一头像/身份公共能力，P5 只减少 MessageCenter 内聚 |
| 媒体能力 | 预览 key、打开/复制/另存/编辑/缓存状态 | `localMediaPreviewKeys`、`handleMenuAction`、`mediaName`、desktop media actions | P7/P8 继续抽公共媒体能力和 Electron 文件边界 |
| 滚动/布局 | 微信式底部跟随、pane resize、历史定位、新消息跳转 | `useWechatBottomFollow`、`handleUnreadJump`、`scrollToMessage` | P5-IM-003B 迁到 message list runtime hook |
| 样式关联 | 使用大量 `pc-chat-*`、`pc-message-*` 样式类 | 主 JSX 与 `ChatMessageBubble` | P5-IM-006A/B 盘点并迁出 feature 样式 |

## 边界问题

1. 页面同时持有 query、domain 派生、cache patch、发送命令、消息操作、布局和弹窗，任何改动都容易影响其他链路。
2. 发送和已读核心规则已开始下沉，但页面仍是命令入口和 cache patch 聚合点。
3. `ChatMessageBubble` 已接入 P4 message view model，但 MessageCenter 仍在 JSX 中完成多选、权限、状态文案和右键能力组合。
4. 会话列表与消息列表派生逻辑都在同一个文件，无法独立测试复杂筛选/未读/本地消息合并组合。

## P5 推荐拆分顺序

1. `P5-IM-001B`：新增 `messages/hooks/useMessageCenterViewModel.ts` 壳，只搬装配和派生字段，不改行为。
2. `P5-IM-001C`：迁移 selected conversation、loading/empty/error、active header 等只读派生状态。
3. `P5-IM-002A/B`：抽会话列表 container 与筛选排序服务。
4. `P5-IM-003A/B`：抽消息列表 container 与滚动/定位规则。
5. `P5-IM-001D` + `P5-IM-004B`：发送命令和 composer 发送入口下沉，保留 P4 send diagnostics。
6. `P5-IM-005A/B`：消息右键 action map 与权限矩阵。

## 诊断日志

本任务是 L1 职责盘点，不新增运行时日志。后续 P5-IM-001E 负责页面级诊断日志。

## 验收

- 已明确数据、命令、UI、样式、弹窗、滚动、媒体和公共能力边界。
- 已给出 P5 拆分顺序。
- 不修改业务行为。
