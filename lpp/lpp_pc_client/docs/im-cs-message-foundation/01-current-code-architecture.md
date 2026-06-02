# 当前代码方案分析

## 1. 当前系统分层

### 1. UI 组件层

主要文件：

- `src/renderer/components/MessageCenter.tsx`
- `src/renderer/components/OnlineServicePage.tsx`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/messages/components/*`
- `src/renderer/customer-service/components/*`

职责：

- 页面布局、会话列表、聊天区、输入区、右侧资料区、菜单 badge 展示。
- 当前问题：部分 UI 仍直接参与 effective unread 的抑制、筛选和 badge 计算，导致同一状态在不同组件中口径不一致。

### 2. UI hook/controller 层

IM：

- `useMessageTextSendController`
- `useMessageMediaSendController`
- `useImReadCommandExecutor`
- `useMessageCenterViewModel`
- `useMessageUnreadJumpController`

在线客服：

- `useCustomerServiceSendController`
- `useCustomerServiceWorkspaceController`
- `useCustomerServiceThreadLifecycle`
- `useCustomerServiceIncomingNotifications`

职责：

- 连接 UI、API、Query cache、local outbox、read model。
- 当前问题：hook 层承担了较多业务规则，尤其是“当前会话可见时是否已读”“客服发送后是否影响未读”等逻辑，应该继续下沉到模型层。

### 3. Domain/model 层

IM：

- `src/renderer/data/im-read-model.ts`
- `src/renderer/data/im-read/im-read-service.ts`
- `src/renderer/data/im-read/im-read-view-model.ts`
- `src/renderer/data/message-display.ts`
- `src/renderer/messages/models/messageCacheMutationModel.ts`

在线客服：

- `src/renderer/data/customer-service/cs-cache-adapter.ts`
- `src/renderer/data/customer-service/cs-conversation-index.ts`
- `src/renderer/data/customer-service/cs-compatibility-bridge.ts`
- `src/renderer/data/customer-service/cs-reminder-model.ts`

职责：

- 派生未读、消息展示、缓存合并、客服兼容 overlay。
- 当前问题：
  - IM 已经有 read model，但 `message-display.ts` 仍是一个并行 effective unread 入口。
  - 在线客服 `cs-conversation-index.ts` 实际承担 ledger、compat index、overlay 三种职责，名称和边界不够清晰。
  - `getCustomerServiceConversationIndex()` 支持无 scope 全局查找，有跨账号/跨工作区串线风险。

### 4. API client/contract 层

IM：

- `MessagesApiClient.getConversations()`
- `sendConversationTextMessage()`
- `sendConversationMediaMessage()`
- `sendConversationContactCardMessage()`
- `markConversationRead()`

在线客服：

- `sendWorkbenchTextMessage()`
- `sendWorkbenchMediaMessage()`
- `getWorkbenchThreads()`
- `getWorkbenchThreadDetail()`
- `claim/takeover/close`

职责：

- 封装后端 endpoint、请求体和返回体 normalize。
- 当前问题：
  - IM `getConversations()` 当前会直接调用 `rememberCustomerServiceConversationFromImList()`，也就是说 IM API client 有客服 side effect。
  - 这在短期兼容 tempSession 有用，但不是干净边界。

### 5. Gateway routing/side effects 层

主要文件：

- `gateway-event-router.ts`
- `gateway-im-side-effects.ts`
- `gateway-cs-side-effects.ts`
- `conversation-ownership-resolver.ts`
- `cs-gateway-handler.ts`
- `im-gateway-handler.ts`

职责：

- 识别事件归属，写入对应 cache，触发对应提醒。
- 当前问题：
  - Router 里同时存在 first-stage handler 和 fallback handler，多路径都有可能处理 `msg.new`。
  - `mergeImGatewayMessage()` 仍用 workspace `activeImConversationId` 判断 active，和 UI 的 `paneVisible/messagesLoaded` 可见性事实不是同一层级。
  - ownership resolver 当前不强制 scope，indexed temp session 存在误命中风险。

### 6. Shared runtime 层

主要文件：

- `send-outbox.ts`
- `send-state-machine.ts`
- `media/runtime/*`
- `videoPoster*`
- `reminder-service.ts`

职责：

- 上传、视频封面、本地媒体缓存、断点 outbox、发送状态流转、提醒策略。
- 这是当前真正共享得比较合理的部分。

### 7. Electron/diagnostics 层

主要文件：

- `src/main/desktop-notification.ts`
- `src/main/diagnostics-jsonl-writer.ts`
- `src/main/message-reminder-diagnostics-routing.ts`
- `src/preload/preload.cts`

职责：

- 系统通知、日志落盘、preload API、任务栏/托盘能力。
- 当前问题：诊断已补强，但业务模型没有完全收敛前，日志只能定位问题，不能防止模型继续分叉。

## 2. 消息底层发送是否公用

结论：半公用。

### 已公用

- 媒体上传：`client.uploadMedia()`
- 视频封面生成和上传：`createVideoPoster()`、`uploadVideoPosterForSend()`
- 本地媒体缓存：`cacheLocalSentMediaForDesktop()`
- 发送状态机：`send-state-machine.ts`
- 断点 outbox：`send-outbox.ts`
- 发送诊断：`logChatSendDiagnostic()`

### 未公用

IM 业务发送：

- 文本：`sendConversationTextMessage(conversationType, conversationId, text, reply, mentions)`
- 媒体：`sendConversationMediaMessage(conversationType, conversationId, kind, media, reply)`
- 名片：`sendConversationContactCardMessage(...)`
- endpoint：direct/group message endpoint
- cache：`messageCacheMutationModel`
- read 联动：IM read model / mark read

在线客服业务发送：

- 文本：`sendWorkbenchTextMessage(threadType, threadId, text)`
- 媒体：`sendWorkbenchMediaMessage(threadType, threadId, kind, media)`
- endpoint：customer service workbench thread message endpoint
- cache：`cs-cache-adapter`
- unread 联动：客服 overlay/ledger

因此底层工具可继续共享，但业务发送 use case 不应该强行合并。更合理的设计是抽一个 `ChatSendRuntime` 共享上传、outbox、状态机、诊断；IM 和客服各自实现 `MessageSendAdapter`。

## 3. 当前主要结构性风险

1. 归属判定不够硬：`ConversationOwnershipResolver` 没有强制 scope，indexed temp session 可能跨账号命中。
2. IM API client 有客服 side effect：`messages-client.ts` 直接写客服 compat index。
3. IM effective unread 入口不唯一：read model 和 `message-display.ts` 并存。
4. 在线客服 ledger 不清晰：`cs-conversation-index.ts` 同时承担 index、overlay、compat candidate、staff marker。
5. Gateway active 判断和 UI 可见性事实不一致：gateway 只知道 active conversation id，不知道 pane 是否真实可见、messages 是否加载成功。
6. Badge/reminder 来源仍分散：Sidebar、客服 workbench merge、realtime reminder、thread overlay 都能影响最终数字。
7. 兼容 raw unread 是高风险输入：`pc-im-conversations.tempSession.unreadCount` 可能包含客服自己发送消息，不能当权威未读。

## 4. 当前代码可保留的基础

1. `im-read-model.ts` 的方向是对的：read cursor、peer read、commands、view 派生都应该继续加强。
2. `send-outbox.ts` 和 `send-state-machine.ts` 可以作为共享发送 runtime 的基础。
3. `cs-compatibility-bridge.ts` 是必要的兼容桥，但应从 IM API client side effect 中抽离。
4. `cs-reminder-model.ts` 的 messageId 去重模型可以保留。
5. 诊断拆分方向正确，应继续围绕模型输入/输出而不是组件细节打日志。
