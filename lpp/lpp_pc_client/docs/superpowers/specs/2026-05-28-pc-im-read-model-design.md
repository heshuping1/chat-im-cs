# PC IM 已读未读模型重构方案

## 状态

方案已进入 implementation plan 阶段；最终完成仍以单元测试、浏览器测试、双 PC 验收和服务端契约验证为准。

## 问题

PC 普通 IM 当前把已读/未读当成一组分散的 UI 补丁处理：

- 会话列表直接使用服务端 `unreadCount`，再叠加局部本地修正。
- Gateway push 有路径会直接累加未读。
- 打开消息窗口有时只有在 `unreadCount > 0` 时才上报已读。
- 发出消息的“已发送/已读”依赖单条消息字段，轮询旧数据会覆盖本地回执状态。
- “新消息”跳转提示会在会话已经本地已读后残留。

这些问题导致成熟 IM 规则被破坏：

- 实际只发 2 条消息，却因为旧服务端 unread 非零显示 6 或 7 条未读。
- 对方已经打开并查看消息，发送方气泡仍显示“已发送”。
- 轮询会把本地已读回执状态冲回旧状态。
- 会话列表、未读页签、侧边栏、消息窗口显示口径不一致。

根因不是缺一个 if 判断，而是系统缺少统一的 IM 已读模型。

## 产品目标

PC 普通 IM 必须达到成熟桌面 IM 的行为标准：

- 当前用户自己发送的消息永远不为当前用户产生未读。
- 未读数表示“我的已读游标之后的对方消息”。
- 打开会话并看到对方消息后，推进“我的已读游标”。
- 对方读到我发送的消息后，我这边对应气泡显示“已读”。
- 实时事件、轮询、发送成功、重新拉取、切换会话、断线重连必须收敛到同一状态。
- 已读游标只能前进，不能倒退。
- 会话列表、未读页签、侧边栏红点、聊天标题、消息跳转提示、消息气泡状态都必须从同一个模型派生。
- IM 核心拥有 read policy。UI、Gateway、轮询、发送成功都只是输入适配器，不拥有已读/未读规则。

## 非目标

- 本轮不实现完整群成员级已读回执 UI。
- 本轮不实现虚拟列表可视区域级已读。当前阶段定义为：打开会话后，已加载到消息窗口的消息视为已查看。
- 本轮不处理在线客服 `temp_session` 的已读模型。本文只覆盖普通 IM 的 `direct` 和 `group`。
- 不主动修改 App，除非发现跨端接口契约缺陷，并在文档中明确记录。

## 成熟 IM 模型

成熟 IM 通常依赖会话内单调递增的消息序号和已读游标。

### 设计基线

本方案以成熟 IM 的 read cursor 模型为设计基线，以服务端 API 契约为实现边界。

设计不允许：

- 用 UI 现象反推 read state。
- 用服务端单个 `unreadCount` 直接代表最终展示结果。
- 用单条消息 `status/isRead` 覆盖会话级 read cursor。
- 用时间字段代替会话内单调序号。
- 在字段缺失时伪造精确未读数或已读状态。

设计必须做到：

- 所有 read/unread 结论来自 IM 核心状态机。
- 所有状态输入都能追溯到服务端 API、Gateway、发送成功、UI 可见事实或本地持久化。
- 每个服务端字段都有明确用途、缺失后果和降级策略。
- 每个降级策略都不能制造错误确定性；不能证明正确时，宁可诊断和阻断稳定发布。
- 每个场景都能落到单元测试、浏览器测试或双 PC 人工验收。

### 必需实体

```ts
type ConversationReadState = {
  conversationKey: string;
  conversationId: string;
  conversationType: "direct" | "group";
  myReadSeq: number;
  peerReadSeq: number;
  lastMessageSeq: number;
  pendingReadSeq?: number;
  updatedAt: number;
};

type ImMessage = {
  messageId: string;
  conversationId: string;
  conversationSeq: number;
  senderUserId?: string;
  senderId?: string;
  fromUserId?: string;
  senderPlatformUserId?: string;
  senderLppId?: string;
  direction?: string;
  isSelf?: boolean;
  isMine?: boolean;
  messageType?: string;
  sentAt?: string;
};
```

### 游标含义

- `lastMessageSeq`：当前已知的会话最新消息序号。
- `myReadSeq`：当前登录用户在该会话读到的最新序号。
- `peerReadSeq`：单聊中对方读到的最新序号。
- `pendingReadSeq`：本地已推进、但 mark read 网络请求尚未成功确认的最高序号。
- `conversationKey`：本地状态键，必须包含 `conversationType` 和 `conversationId`，避免单聊和群聊 ID 碰撞。
- 群聊使用 `myReadSeq` 计算“我的未读”。群消息“多少人已读”是另一个能力，不能复用单聊 `peerReadSeq`。

### 核心边界

成熟 IM 的 read model 是一个核心状态机，而不是 UI 规则集合。

核心拥有：

- 消息身份判定。
- incoming/outgoing 判定。
- `myReadSeq` 推进策略。
- `peerReadSeq` 合并策略。
- unread 派生策略。
- outgoing 气泡状态派生策略。
- read command 生成策略。
- 异常字段诊断策略。

适配器只负责把外部事实转成核心事件：

- UI 适配器提交用户看到了什么。
- Gateway 适配器提交实时消息和 read receipt。
- Polling 适配器提交服务端快照。
- Send 适配器提交发送成功后的消息事实。
- Store 适配器加载和保存核心状态。

任何适配器都不能直接写 `myReadSeq`、`peerReadSeq`、`unread` 或气泡状态。

### 身份判定

消息属于“我”时，满足任一条件即可：

- `isSelf === true` 或 `isMine === true`
- `direction` 为 `out`、`outgoing`、`sent`、`self`
- 任一发送者身份字段匹配当前用户的 `userId`、`platformUserId`、`lppId`

消息不是“我”发送，且不是系统/事件消息时，视为 incoming 消息。

## 派生规则

所有 UI 都必须使用这些规则，不直接展示服务端原始 unread。

### 会话未读数

未读数必须按证据等级派生，不能把 `lastMessageSeq - myReadSeq` 当作未读条数。成熟 IM 里的 `seq` 是排序游标，不是连续消息计数；它可能跳号、跨端、删除、补偿重放。`readSeq` 只回答“读到哪里”，`unreadCount` 才回答“还有几条未读”。

第一级：当前会话已打开，且 read policy 已经把用户看到的消息推进到最新可读位置：

```ts
effectiveUnread = 0
```

第二级：已加载消息能够覆盖 `myReadSeq` 之后的完整新消息区间时：

```ts
effectiveUnread = count(messages where isIncoming(message) && message.seq > myReadSeq)
```

“完整新消息区间”必须满足以下条件之一：

- 消息列表明确从 `myReadSeq + 1` 或更早位置连续加载到 `lastMessageSeq`。
- 服务端返回本页 `hasMoreAfter=false` 且最小 loaded seq 小于等于 `myReadSeq + 1`。
- 服务端提供 unread message list，而不是普通历史分页。

如果只是打开了最后一页，但无法证明它覆盖了全部未读区间，就不能用 loaded messages 反推精确 unread 数。

第三级：未打开会话、消息只部分加载、或只有会话摘要时，服务端 `unreadCount` 是权威条数输入，cursor 只用于校验方向和清零，不用于把 seq 差值显示成数量：

```ts
if myReadSeq >= lastMessageSeq:
  effectiveUnread = 0
else:
  effectiveUnread = max(0, serverUnreadCount)
```

Gateway 逐条收到普通 incoming 消息时，本地 `unreadCount += 1`；收到自己的消息或当前会话可读时，本地 `myReadSeq` 推进并清零。下一次服务端会话快照返回时，以服务端 `unreadCount` 覆盖本地累计值，避免离线、多端、补偿消息造成偏差。

当前用户发送任何消息时，必须把 `myReadSeq` 至少推进到该 outgoing 消息的 seq，并把当前用户侧 `unreadCount` 清零，这样同一用户自己之后发送的消息不会让更早 incoming 消息继续保持未读。

如果发现服务端 `unreadCount=0`，但会话摘要明确表示最后一条是 incoming 且 `lastMessageSeq > myReadSeq`，这是服务端 unread 低报。前端不能假装精确知道总数，只能：

- 如果已加载区间能覆盖未读消息，使用已加载消息精确计数。
- 如果不能覆盖，记录 `im.read.server_unread_mismatch_low`。
- 稳定版本必须阻断发布，要求服务端修正 unread 契约或提供 unread 起点/未读消息列表。

如果最后一条消息是当前用户自己发送：

```ts
effectiveUnread = 0
myReadSeq = max(myReadSeq, lastMessageSeq)
```

如果服务端 `lastReadSeq < myReadSeq`，核心应输出幂等的 `mark_read(myReadSeq)` 或保留 `pendingReadSeq`，用于把“自己发送表示自己已读”的事实同步回服务端。

如果本地 `myReadSeq` 比服务端 `lastReadSeq` 更新，本地值优先。

### 打开会话

打开会话是一次读行为。

本轮实现定义：

```ts
nextReadSeq = 已加载 incoming 消息中的最大 seq
```

如果已加载 incoming 消息缺少 `conversationSeq`，但会话摘要有 `lastMessageSeq`：

```ts
nextReadSeq = conversation.lastMessageSeq
```

如果已加载消息和会话摘要都没有正数 seq，PC 不能发送伪造 read 请求。此时只能清理明确过期的本地视觉噪音，记录 `im.read.missing_seq` 诊断，并保留服务端契约缺陷。

当 `nextReadSeq > myReadSeq`：

- 立即更新本地 read state。
- 按新的 `myReadSeq` 重新派生 unread UI。
- 如果 `nextReadSeq` 覆盖最新已知 unread 区间，清理该会话的“新消息”跳转提示。
- 调用 `POST /direct-chats/{id}/read` 或 `POST /groups/{id}/read`。
- 由 Gateway 通知其他客户端。

这个流程不能依赖 `unreadCount > 0`。

打开会话不等于无条件把会话 unread 清零。如果用户通过搜索、历史定位或分页只看到旧消息，且 `nextReadSeq < lastMessageSeq`，核心只能推进到 `nextReadSeq` 并重新派生剩余 unread。

### 收到新消息

Gateway 收到 `msg.new` 时：

如果消息是当前用户自己发送：

```ts
lastMessageSeq = max(lastMessageSeq, message.seq)
myReadSeq = max(myReadSeq, message.seq)
unread = 0
```

这同时适用于当前 PC 发送的消息，以及当前用户在另一个登录设备发送的消息。发送消息本身表示当前用户已读到该 outgoing seq。

如果该 self message 来自 Gateway、轮询或重启后的快照，且服务端 `lastReadSeq < message.seq`，核心仍应输出幂等 `mark_read(message.seq)`，直到服务端或 Gateway 确认当前用户 read cursor 已覆盖该 seq。

如果消息是 incoming，且会话当前打开并且窗口处于可读状态：

```ts
lastMessageSeq = max(lastMessageSeq, message.seq)
myReadSeq = max(myReadSeq, message.seq)
emit mark_read(message.seq)
unread = 0
```

如果消息是 incoming，且会话未打开：

```ts
lastMessageSeq = max(lastMessageSeq, message.seq)
unread = deriveUnread(...)
```

重复消息不能重复增加未读。

重复检测优先使用 `messageId`，其次使用 `(conversationId, conversationSeq)`。如果两者都缺失，消息可以展示，但不允许修改未读计数。

“当前打开”不能只看 selected conversation id，还必须结合窗口/页面是否可读：

- 窗口前台且未最小化。
- 消息面板可见。
- 当前会话是正在展示的会话。
- UI 提交的是 latest page loaded 或 visible messages 事件。

如果无法判断可读状态，默认按未打开处理，不自动推进 read cursor。

### 收到已读回执

Gateway 收到 `msg.read` 时：

如果 `readerUserId` 是当前用户：

```ts
myReadSeq = max(myReadSeq, readSeq)
```

如果 `readerUserId` 是单聊中的对方：

```ts
peerReadSeq = max(peerReadSeq, readSeq)
```

任何 read cursor 都不能倒退。

### 发出消息状态

单聊：

```ts
if isMine(message) && message.seq <= peerReadSeq:
  status = "read"
else if isMine(message):
  status = "sent"
```

轮询返回的 `isRead=false` 或 `status=sent` 不能覆盖已经覆盖该消息的本地 `peerReadSeq`。

群聊：

- outgoing 默认显示“已发送”。
- 服务端返回 `readCount` 时，可以继续展示群已读人数。
- 群 `readCount` 不是单聊 `peerReadSeq`。

## 本地状态

按账号和租户隔离持久化 read state：

```txt
lpp.pc.im.readState.{apiBaseUrl}.{tenantIdOrToken}.{userIdOrPlatformId}
```

存储结构：

```ts
type StoredReadState = Record<string, ConversationReadState>;
```

这里的 key 是 `conversationKey = conversationType + ":" + conversationId`，不能只用原始 `conversationId`。

合并规则：

```ts
myReadSeq = max(local.myReadSeq, server.lastReadSeq, incoming.myReadSeq)
peerReadSeq = max(local.peerReadSeq, server.peerReadSeq ?? 0, incoming.peerReadSeq)
lastMessageSeq = max(local.lastMessageSeq, server.lastMessageSeq, incoming.lastMessageSeq)
pendingReadSeq = max(local.pendingReadSeq ?? 0, incoming.pendingReadSeq ?? 0)
```

本地状态必须先于网络请求完成更新，保证 UI 即时响应。read 上报失败时应提示/记录诊断，但不应把本地未读恢复回来。

mark read 请求失败时必须保留 `pendingReadSeq` 并重试。重试成功后清理 pending；如果服务端/Gateway 后续确认的 `lastReadSeq >= pendingReadSeq`，也可以清理 pending。pending 不允许让本地 unread 复活。

多个 mark read command 必须按会话合并，只保留最高 `readSeq`。重试需要退避和去重，避免打开会话、Gateway 和轮询同时触发重复请求。

## 服务端契约

前端可以短期容忍字段缺失，但稳定版本必须提供以下字段。

### 契约原则

服务端 API 是成熟 IM read model 的数据基础。PC 端可以做本地即时响应、抗旧数据合并和失败重试，但不能替服务端补出不存在的会话序号、read cursor 或分页边界。

服务端必须保证：

- `conversationSeq` 在同一会话内单调递增且稳定不变。
- `lastMessageSeq` 表示当前会话服务端确认的最新消息序号。
- `lastReadSeq` 表示当前登录用户读到的最高会话序号。
- 单聊提供 `peerReadSeq` 或等价对方 read cursor。
- `unreadCount` 与 `lastReadSeq`、`lastMessageSeq` 的语义一致；即使前端不用它直接展示，也要能作为摘要输入参与校验。
- 消息分页提供是否覆盖最新区间的证明字段，例如 `hasMoreAfter=false`、`isLatestPage=true` 或等价字段。
- mark read 接口幂等，且不会让服务端 read cursor 倒退。
- Gateway `msg.new` 和 `msg.read` 事件携带足够身份、会话类型和 seq 信息。

如果 API 不满足上述能力，PC 端只能做有限保护：

- 字段偏旧：使用本地 cursor 和 `max` 合并抵抗回退。
- 字段缺失但有等价字段：归一化后进入 IM 核心。
- 字段缺失且无等价字段：记录诊断，不输出伪精确状态。
- 影响 read/unread 正确性的字段缺失：阻断稳定发布。

### 会话列表

```json
{
  "conversationId": "chat-1",
  "conversationType": "direct",
  "lastMessageSeq": 120,
  "lastReadSeq": 118,
  "peerReadSeq": 0,
  "unreadCount": 2,
  "lastMessage": {
    "messageId": "m120",
    "conversationSeq": 120,
    "senderUserId": "peer-user",
    "direction": "in",
    "sentAt": "2026-05-28T02:37:00Z",
    "preview": "hello"
  }
}
```

`peerReadSeq` 只对单聊必需。它表示对方读到的最高会话序号，用于客户端重启、轮询刷新或 Gateway 丢失后的 outgoing 气泡状态恢复。

如果服务端无法提供 `peerReadSeq`，必须至少在消息列表或单聊详情接口提供等价的对方 read cursor。仅提供单条消息 `isRead/status` 不足以抵抗旧轮询覆盖。

### 消息列表

```json
{
  "conversationId": "chat-1",
  "conversationType": "direct",
  "items": [
    {
      "messageId": "m120",
      "conversationId": "chat-1",
      "conversationSeq": 120,
      "senderUserId": "peer-user",
      "direction": "in",
      "messageType": "text",
      "sentAt": "2026-05-28T02:37:00Z"
    }
  ],
  "page": {
    "minSeq": 91,
    "maxSeq": 120,
    "hasMoreBefore": true,
    "hasMoreAfter": false,
    "isLatestPage": true
  }
}
```

分页元数据用于证明当前 loaded messages 是否覆盖最新区间。没有 `hasMoreAfter/isLatestPage` 或等价字段时，PC 不能用普通历史分页反推精确 unread 数。

单条消息至少需要：

```json
{
  "messageId": "m120",
  "conversationId": "chat-1",
  "conversationSeq": 120,
  "senderUserId": "peer-user",
  "direction": "in",
  "messageType": "text",
  "sentAt": "2026-05-28T02:37:00Z"
}
```

### 标记已读

```http
POST /api/client/v1/direct-chats/{conversationId}/read
{ "readSeq": 120 }

POST /api/client/v1/groups/{conversationId}/read
{ "readSeq": 120 }
```

成功响应应返回服务端确认后的当前用户 read cursor：

```json
{ "conversationId": "chat-1", "lastReadSeq": 120 }
```

接口必须幂等。重复提交较小或相同 `readSeq` 不能降低服务端 read cursor。

### Gateway 新消息事件

```json
{
  "event": "msg.new",
  "conversationId": "chat-1",
  "conversationType": "direct",
  "message": {
    "messageId": "m121",
    "conversationSeq": 121,
    "senderUserId": "peer-user",
    "direction": "in",
    "sentAt": "2026-05-28T02:38:00Z"
  }
}
```

### Gateway 已读事件

```json
{
  "event": "msg.read",
  "conversationId": "chat-1",
  "userId": "reader-user",
  "readSeq": 120
}
```

如果必需字段缺失，PC 必须记录诊断：

- 缺少 `conversationSeq`
- 缺少 sender identity
- 缺少消息分页覆盖证明字段
- 服务端 unread 与模型派生 unread 不一致
- 服务端 unread 低报，且本地无法精确计算
- read event 缺少可识别读者身份
- read event 的 `readSeq <= 0`

如果会话列表缺少 `lastMessageSeq`，PC 仍可展示消息，但未打开会话的 unread 无法证明正确。除非服务端提供另一个单调递增的会话 offset，否则这是 read model 发布阻断项。

### API 契约校验

实现时必须增加 API shape validator。validator 不参与 UI 展示，只负责在数据进入 IM 核心前做结构校验、归一化和诊断。

校验结果分三类：

```ts
type ApiContractLevel = "ok" | "degraded" | "blocking";
```

- `ok`：字段完整，可以进入核心模型并输出完整 view。
- `degraded`：字段有等价替代或只影响非关键展示，可以进入核心模型，但必须记录诊断。
- `blocking`：缺少 `conversationSeq`、`lastMessageSeq`、`lastReadSeq`、单聊 `peerReadSeq` 等关键字段，不能承诺成熟 IM 行为。

blocking 不是运行时崩溃。PC 仍可展示基础消息列表，但必须禁止输出伪精确 unread/read 状态，并在开发/验收环境暴露诊断。

## 前端架构

### 新模块

创建：

```txt
src/renderer/data/im-read-model.ts
```

职责：

- 归一化当前用户身份。
- 判定消息是否属于当前用户。
- 判定 incoming / event 消息。
- 接收 UI、Gateway、轮询、发送成功这些外部事件。
- 派生会话 read state。
- 派生有效未读数。
- 根据用户可见事实和 read policy 计算下一次 read seq。
- 单调合并本地、服务端、Gateway read state。
- 派生 outgoing 气泡状态。
- 输出副作用指令，例如需要调用 mark read、需要清理 jump、需要记录诊断；调用方只执行指令，不重新判断业务规则。

该模块必须是纯函数模块并完整单测。它不能 import React、Zustand、QueryClient、浏览器 API 或 UI 组件。

模型输入统一为事件：

```ts
type ImCoreEvent =
  | { type: "ui.conversation_opened"; conversationId: string; conversationType: "direct" | "group"; loadedMessages: ImMessage[]; conversation?: ConversationSummary }
  | { type: "ui.messages_visible"; conversationId: string; conversationType: "direct" | "group"; visibleMessages: ImMessage[]; conversation?: ConversationSummary }
  | { type: "gateway.message_received"; conversationId: string; conversationType: "direct" | "group"; message: ImMessage; isActiveConversation: boolean }
  | { type: "gateway.read_received"; conversationId: string; conversationType: "direct" | "group"; readerIdentity: ReaderIdentity; readSeq: number }
  | { type: "poll.conversations_loaded"; conversations: ConversationSummary[] }
  | { type: "poll.messages_loaded"; conversationId: string; conversationType: "direct" | "group"; messages: ImMessage[]; conversation?: ConversationSummary }
  | { type: "send.message_succeeded"; conversationId: string; conversationType: "direct" | "group"; message: ImMessage };
```

模型输出统一为状态和指令：

```ts
type ImCoreResult = {
  stateByConversation: Record<string, ConversationReadState>;
  viewByConversation: Record<string, ConversationReadView>;
  commands: ImCoreCommand[];
};

type ImCoreCommand =
  | { type: "mark_read"; conversationId: string; conversationType: "direct" | "group"; readSeq: number }
  | { type: "retry_pending_read"; conversationId: string; conversationType: "direct" | "group"; readSeq: number }
  | { type: "clear_new_message_jump"; conversationId: string; conversationType: "direct" | "group" }
  | { type: "log_diagnostic"; event: string; context: unknown };
```

`stateByConversation` 和 `viewByConversation` 都必须使用 `conversationKey` 作为 key。

UI、Gateway、Store、Query cache 都是核心适配器。它们只能提交事实事件、执行模型指令、展示模型 view，不能绕过模型改 read state。

### Store

`src/renderer/data/store.ts` 负责持久化 read state：

```ts
imReadStateByConversation: Record<string, ConversationReadState>;
upsertImReadState(conversationId, patch): void;
```

现有的 local conversation read 和 peer read receipt 拆分状态，应替换为统一 `ConversationReadState`。

### GatewayBridge

`GatewayBridge.tsx` 负责：

- 解析 Gateway payload。
- append/merge 消息。
- 把 `gateway.message_received`、`gateway.read_received` 事件交给 `im-read-model`。
- 使用模型派生结果更新 Query cache。
- 禁止 raw `unread + 1`；Gateway incoming message 必须先更新 `lastMessageSeq`，再由模型派生 unread。
- `msg.read` 不得通过刷新消息 query 的方式丢掉本地 read receipt 状态。

### MessageCenter

`MessageCenter.tsx` 负责：

- 在用户打开会话、消息加载、消息可见时，向 IM 核心提交 UI 查看事件。
- 执行模型返回的 `mark_read`、`clear_new_message_jump` 等指令。
- 展示模型派生的 unread 和气泡状态。
- 停止在渲染代码中重复实现已读/未读逻辑。

MessageCenter 不允许：

- 自己计算 `nextReadSeq`。
- 自己根据 `unreadCount` 决定是否 mark read。
- 自己清零 unread。
- 自己把 outgoing 气泡从“已发送”改成“已读”。

### Sidebar 和会话列表

Sidebar、筛选、红点、会话行展示必须调用同一个有效未读模型。

任何 UI 都不允许直接展示原始 `conversation.unreadCount`。

### 适配器和 IM 核心边界

UI 是观察者和事件生产者，不是 read policy 的拥有者。IM 核心是唯一状态机。

UI 可以提交：

- 当前会话被打开。
- 某批消息已加载到消息窗口。
- 某批消息已进入可见区域。
- 用户切换会话或关闭会话。

UI 不可以提交：

- unread 应该是多少。
- readSeq 应该推进到多少。
- 哪条 outgoing 应该显示已读。
- 是否应该清理服务端 unread。

这些结论必须全部由 IM 核心根据当前 read state、消息身份、seq、会话状态和服务端/Gateway 事件派生。

同样，Gateway、轮询和发送成功也不能各自“顺手修正” unread 或气泡状态。所有输入都必须汇入同一个核心 reducer，再由核心输出统一 view 和 commands。

## 场景矩阵

本章节是实现和测试的完整场景来源。每个场景都必须由 `im-read-model.ts` 的纯函数支持，UI 和 Gateway 只能消费模型结果。

### 单聊未读场景

| 编号 | 场景 | 期望结果 | 模型支持逻辑 |
| --- | --- | --- | --- |
| D-01 | 当前用户给对方发送 1 条消息 | 当前用户会话 unread 为 0 | `isMine(message)=true`，发送成功后 `myReadSeq=max(myReadSeq,message.seq)` |
| D-02 | 当前用户连续发送多条消息 | 当前用户 unread 始终为 0 | 每条 outgoing 都推进 `myReadSeq` 和 `lastMessageSeq` |
| D-03 | 当前用户另一个设备发送消息，PC 收到自己的 Gateway 消息 | PC 不产生 unread | Gateway 根据身份判定为 mine，推进 `myReadSeq` |
| D-04 | 对方在会话未打开时发送 1 条消息 | 当前用户会话 unread 为 1 | Gateway incoming 事件让本地 `unreadCount += 1`，不按 seq 差值计算 |
| D-05 | 对方在会话未打开时发送 2 条消息，seq 可能从 11 跳到 17 | 当前用户会话 unread 为 2 | Gateway 逐条累加，服务端快照用 `unreadCount` 覆盖；禁止 `lastMessageSeq-myReadSeq` |
| D-06 | 服务端返回 unread=2，且 `lastMessageSeq=17`、`myReadSeq=10` | UI 显示 unread=2 | 摘要快照以 `unreadCount` 为条数，seq 只作为 read cursor |
| D-07 | 服务端返回 unread=0，但摘要显示最后一条 incoming 且 `lastMessageSeq > myReadSeq` | 如果无法加载覆盖区间，记录低报诊断并阻断稳定发布 | 防止把服务端低报当成真实 0 |
| D-08 | 服务端返回 unread=0，但 loaded incoming message 的 seq 大于 `myReadSeq` | 打开会话时仍上报 read | read reporting 不依赖 server unread，只看 loaded/visible incoming seq |
| D-09 | 最后一条消息是自己发送，但服务端返回 unread>0 | UI 显示 unread=0 | `isSelfLastMessage=true` 强制 unread 0，并记录 server mismatch |
| D-10 | 对方消息已被 `myReadSeq` 覆盖，但服务端仍返回 unread>0 | UI 显示 unread=0 | 本地/服务端 read cursor 取最大值，cursor 覆盖则 unread 0 |
| D-11 | 对方消息晚于本地 read 时间 | UI 保留 unread | 只有 `message.seq > myReadSeq` 的 incoming 才算 unread |
| D-12 | 消息无 sender identity 且 direction 缺失 | 不默认为自己消息 | 缺身份记录诊断，不能用 displayName 误判 self |
| D-13 | 消息无 sender identity 但 direction 是 outgoing | 视为自己消息 | direction 是明确所有权信号 |
| D-14 | 轮询快照最后一条是自己消息，但本地 myReadSeq 落后 | 本地推进 myReadSeq，并幂等同步 mark read | self last message 表示当前用户已读到该 seq |

### 单聊查看和已读上报场景

| 编号 | 场景 | 期望结果 | 模型支持逻辑 |
| --- | --- | --- | --- |
| R-01 | 打开含有 1 条未读 incoming 的会话 | 本地 unread 立即清零，并上报该消息 seq | `nextReadSeqFromLoadedMessages=max incoming seq` |
| R-02 | 打开含有 2 条未读 incoming 的会话 | 上报第二条消息 seq，unread 清零 | 取 loaded incoming 最大 seq |
| R-03 | 打开会话时 loaded messages 全是自己消息，且 self seq 大于 myReadSeq | 本地推进 myReadSeq，并幂等同步 mark read | 自己消息表示当前用户已读到该 seq |
| R-04 | 打开会话时 incoming message 缺 seq，但 conversation 有 lastMessageSeq | 用 conversation lastMessageSeq 上报 read | fallback 使用 `conversation.lastMessageSeq`，并记录 missing seq |
| R-05 | 打开会话时 message 和 conversation 都没有可用 seq | 不发送伪造 read 请求 | 记录 `im.read.missing_seq`，不推进服务端 read |
| R-06 | 当前打开会话收到 incoming Gateway 消息 | 消息直接已读，不产生红点 | active conversation incoming 立即推进 `myReadSeq` 并调用 markRead |
| R-07 | 当前未打开会话收到 incoming Gateway 消息 | 会话列表出现 unread | `myReadSeq` 不变，模型派生 unread |
| R-08 | 打开会话后 “新消息”跳转浮层仍存在 | 浮层必须清理 | local read state 覆盖 jump 的 lastReadSeq 后清理 jump |
| R-09 | read endpoint 失败 | UI 仍本地已读，记录失败诊断 | 本地先更新，失败不回滚 unread |
| R-10 | read endpoint 失败后重启 PC | 本地 unread 不复活，pending read 继续重试 | `pendingReadSeq` 持久化 |
| R-11 | 相同 readSeq 重复上报 | 不重复请求或不改变状态 | cursor 已覆盖时 no-op |
| R-12 | 会话被选中但窗口后台/最小化 | 不自动推进 read cursor | active 必须满足可读状态 |
| R-13 | 通过搜索打开旧消息页，旧页未覆盖最新 unread | 只推进到可见旧 seq，不清空后续 unread | open/read 只推进到 `nextReadSeq` 后重新派生 |
| R-14 | 打开最新页且最新页证明为 latest page | 可推进到最新 visible incoming seq 并清理 jump | 分页元数据证明 latest coverage |

### 发出消息回执场景

| 编号 | 场景 | 期望结果 | 模型支持逻辑 |
| --- | --- | --- | --- |
| O-01 | 当前用户发送消息，未收到对方 read | 气泡显示“已发送” | mine 且 `message.seq > peerReadSeq` |
| O-02 | 对方打开会话，PC 收到 `msg.read readSeq=message.seq` | 气泡显示“已读” | `peerReadSeq=max(peerReadSeq, readSeq)` |
| O-03 | 对方 readSeq 覆盖前 2 条，不覆盖第 3 条 | 前 2 条显示已读，第 3 条已发送 | 每条 outgoing 独立比较 `message.seq <= peerReadSeq` |
| O-04 | peerReadSeq 倒退 | UI 不倒退 | cursor merge 使用 max |
| O-05 | 轮询返回旧 `isRead=false/status=sent` | 已读气泡不回退 | 气泡状态由 `peerReadSeq` 派生，忽略旧字段 |
| O-06 | 收到当前用户自己的 `msg.read` | 只更新 `myReadSeq`，不更新 `peerReadSeq` | reader identity 匹配当前用户 |
| O-07 | 收到对方 `msg.read` 但无 reader identity | 不更新 peerReadSeq，记录诊断 | 防止把自己的 read 误当对方 read |
| O-08 | 收到 `msg.read readSeq<=0` | 不更新游标，记录诊断 | 无效 seq 不参与 merge |
| O-09 | PC 重启后未收到历史 Gateway read event | 仍能从服务端恢复对方已读状态 | 服务端必须提供 `peerReadSeq` 或等价 cursor |

### 群聊场景

| 编号 | 场景 | 期望结果 | 模型支持逻辑 |
| --- | --- | --- | --- |
| G-01 | 群里当前用户发送消息 | 当前用户群会话 unread 为 0 | outgoing 推进 `myReadSeq` |
| G-02 | 群里其他成员发送 1 条，群未打开 | 群会话 unread 为 1 | incoming group message seq 大于 `myReadSeq` |
| G-03 | 群打开后看到其他成员消息 | 推进 `myReadSeq`，unread 清零 | 群也使用 my read cursor |
| G-04 | 群消息带 `readCount` | 可展示人数，但不影响 direct peerReadSeq | group readCount 与 direct peerReadSeq 分离 |
| G-05 | 群里自己最后一条消息但服务端 unread>0 | UI 显示 unread 0 | self last message 保护适用于 group |
| G-06 | 群历史分页加载旧 incoming 消息 | 不增加 unread | seq 小于等于 `myReadSeq` 的历史消息不算 unread |

### Gateway 和轮询合并场景

| 编号 | 场景 | 期望结果 | 模型支持逻辑 |
| --- | --- | --- | --- |
| M-01 | Gateway 同一消息重复到达 | 消息不重复，unread 不重复 | 以 `messageId` 去重，其次 `(conversationId, conversationSeq)` |
| M-02 | Gateway 消息乱序到达 | lastMessageSeq 取最大，unread 正确 | merge 使用 max，不依赖到达顺序 |
| M-03 | Gateway incoming 后会话列表轮询返回旧 unread | UI 不回退 | 本地 read state 与 lastMessageSeq merge 后派生 |
| M-04 | `msg.read` 后消息列表轮询返回旧 status | 气泡不回退 | peerReadSeq 持久化并覆盖 polling 字段 |
| M-05 | 重连后服务端 lastReadSeq 小于本地 myReadSeq | 本地 myReadSeq 保持 | merge 使用 max |
| M-06 | 重连后服务端 lastMessageSeq 大于本地 | lastMessageSeq 前进，unread 重新派生 | summary merge 更新 lastMessageSeq |
| M-07 | 服务端 unread 与模型派生不一致 | UI 使用模型结果并记录诊断 | `im.read.server_unread_mismatch` |
| M-08 | Gateway 消息没有 messageId 但有 conversationSeq | 可按 `(conversationId, conversationSeq)` 去重 | 二级去重键 |
| M-09 | Gateway 消息没有 messageId 和 conversationSeq | 可展示但不改 unread | 缺少稳定 identity，禁止修改未读 |
| M-10 | 服务端 unread 低报且本地没有完整消息区间 | 不输出伪精确 unread，记录阻断诊断 | `im.read.server_unread_mismatch_low` |
| M-11 | Gateway、打开会话和 pending retry 同时要求 mark read | 只发送该会话最高 readSeq 的幂等请求 | command coalescing by conversation |
| M-12 | API validator 判定数据 degraded | 允许进入核心，但记录诊断并限制受影响能力 | contract level 控制能力边界 |
| M-13 | API validator 判定数据 blocking | 基础消息可展示，但不输出伪精确 unread/read | blocking 阻断稳定发布 |

### 分页、历史和搜索场景

| 编号 | 场景 | 期望结果 | 模型支持逻辑 |
| --- | --- | --- | --- |
| P-01 | 向上加载 `myReadSeq` 之前的历史消息 | unread 不变化 | 历史 seq <= myReadSeq |
| P-02 | 搜索命中历史消息 | 不改变 unread/read cursor | 搜索不是 read 行为 |
| P-03 | 打开会话只加载最近一页，最近一页包含所有未读 | 可推进 readSeq | loaded incoming max seq 覆盖未读 |
| P-04 | 打开会话只加载最近一页，但服务端缺 lastMessageSeq | 不能证明 closed unread 正确，阻断发布 | 服务端契约 release-blocking |
| P-05 | 普通历史分页缺少 `hasMoreAfter/isLatestPage` | 不用该页反推精确 unread | 缺分页覆盖证明字段记录诊断 |
| P-06 | 后续引入虚拟列表 | 可把 read 行为从 loaded 升级到 visible | 当前模型的输入从 loaded messages 替换为 visible messages |

### 多账号、多空间和持久化场景

| 编号 | 场景 | 期望结果 | 模型支持逻辑 |
| --- | --- | --- | --- |
| A-01 | 同一 PC 切换账号 | read state 隔离 | localStorage key 包含 apiBaseUrl、tenant、user |
| A-02 | 同一账号切换租户/空间 | read state 隔离 | key 包含 tenantId 或 token 片段 |
| A-03 | PC 重启后打开已读会话 | unread 不复活 | 持久化 `myReadSeq` 参与 merge |
| A-04 | 另一个同账号设备已读后 PC 收到 read event | PC 同步清 unread | reader 是 current user，更新 `myReadSeq` |
| A-05 | 另一个同账号设备发送消息 | PC 不产生自发 unread | sender identity 匹配 current user，推进 `myReadSeq` |
| A-06 | direct 和 group 使用相同原始 id | 本地 read state 不串会话 | state key 包含 `conversationType` |

### UI 表面一致性场景

| 编号 | 场景 | 期望结果 | 模型支持逻辑 |
| --- | --- | --- | --- |
| U-01 | 会话列表红点 | 使用 effectiveUnread | 禁止 raw `conversation.unreadCount` |
| U-02 | 未读页签数量 | 与会话列表红点一致 | 同一模型派生 |
| U-03 | 侧边栏消息总红点 | 等于普通 IM direct/group effectiveUnread 聚合 | 同一模型派生并过滤非 IM |
| U-04 | 聊天标题“暂无未读/x 条未读” | 与会话列表一致 | 同一模型派生 |
| U-05 | “新消息”跳转提示 | 只在打开未读会话后短暂存在，read 覆盖后清理 | jump state 由 read state 覆盖判断 |
| U-06 | 发送方气泡状态 | 与 peerReadSeq 一致 | 不读 message.status 原始旧值作为最终状态 |
| U-07 | 群聊气泡状态 | 不套用 direct peerReadSeq | group readCount 单独处理 |

### 失败和降级场景

| 编号 | 场景 | 期望结果 | 模型支持逻辑 |
| --- | --- | --- | --- |
| F-01 | read endpoint 失败 | 本地保持已读，记录错误 | 本地优先，网络失败不回滚 |
| F-02 | read endpoint 失败后应用重启 | 本地保持已读并继续重试 | `pendingReadSeq` 持久化 |
| F-03 | Gateway 断线 | 轮询/重连后通过 max merge 恢复 | read cursor 单调合并 |
| F-04 | 服务端缺 sender identity | 不误判 self，记录诊断 | `im.read.missing_sender` |
| F-05 | 服务端缺 conversationSeq | 短期用 lastMessageSeq 兜底；无兜底则不伪造 read | `im.read.missing_seq` |
| F-06 | 服务端缺 lastMessageSeq | closed unread 不可证明，发布阻断 | 服务端契约明确 release-blocking |
| F-07 | 服务端缺 peerReadSeq 或等价 cursor | 重启后 outgoing 已读状态不可证明，发布阻断 | 服务端契约明确 release-blocking |
| F-08 | 服务端消息分页缺少覆盖证明字段 | 不能用 loaded page 反推精确 unread | `im.read.missing_page_coverage` |
| F-09 | API 契约 validator 发现关键字段缺失 | 不输出成熟 IM 状态，记录 blocking 诊断 | contract level 是 `blocking` |
| F-10 | 本地存储损坏 | 丢弃损坏状态，从服务端游标恢复 | 读取存储时验证数字字段 |
| F-11 | 时间字段异常 | 不用时间作为主 read 依据 | seq/read cursor 是唯一主依据 |

## 测试策略

### 单元测试

保留并扩展：

```txt
tests/unit/im-core.spec.ts
```

最终单测必须逐项覆盖“场景矩阵”中的模型场景。UI 表面场景可以在 browser tests 中覆盖接线，但其 read math 仍必须在 unit tests 中有对应模型断言。

### 集成/浏览器测试

浏览器测试只验证工作流接线，不测试核心数学：

- 关闭会话收到 2 条消息，显示 2 条未读。
- 打开会话清理未读，并按期望 readSeq 调用 read endpoint 一次。
- 发送端收到 read event 后，outgoing 气泡从“已发送”变为“已读”。
- read event 后轮询旧数据，不把“已读”冲回“已发送”。
- 群聊自己消息不产生 unread。
- 搜索/历史页打开旧消息时，不清空后续 unread。
- mark read 多源触发时，只发送最高 readSeq 的幂等请求。

### 双 PC 人工验收

使用两个真实 PC 客户端和稳定账号：

1. PC A 给 PC B 发送 2 条单聊消息。
2. PC B 未打开会话时显示 unread 2，不显示 stale 值。
3. PC B 打开会话，unread 清零，“新消息”跳转清理。
4. PC A 看到两条消息变为“已读”。
5. 等待两次轮询间隔，read 状态不回退。
6. 重启 PC B，unread 仍保持清零。
7. PC B 回复一条消息，PC B 不产生自发 unread。
8. PC A 未打开会话时收到回复，unread 为 1。
9. PC A 打开会话，PC B 看到回复变为“已读”。
10. 群聊重复验证 unread 行为，但不验证 direct peer read status。

每个人工步骤都必须记录三类观察：会话列表 unread、消息窗口 jump/status、另一端 outgoing 气泡状态。失败必须归因到以下之一：服务端字段缺失、Gateway 事件缺失/延迟、本地模型派生错误、UI 使用 raw unread、持久化/合并回退。

## 三层验证

本方案进入 implementation plan 前，必须通过以下三层验证。任一层不通过，方案不能视为最终稿。

### 界面场景逻辑验证

验证目标：UI 只提交事实、展示模型 view、执行模型 command，不拥有 read policy。

| UI 场景 | UI 输入 | IM 核心输出 | UI 允许做的事 | UI 禁止做的事 |
| --- | --- | --- | --- | --- |
| 会话列表红点 | `poll.conversations_loaded` 后的 `ConversationReadView` | `effectiveUnread`、`hasUnread` | 展示红点和数量 | 直接展示服务端 `unreadCount` |
| 未读页签 | 全部 `ConversationReadView` | 未读会话集合和聚合数 | 过滤和展示模型结果 | 自己重新计算 unread |
| 侧边栏总红点 | 普通 IM direct/group view | 聚合 unread | 展示聚合结果 | 混入 temp session 或 raw unread |
| 聊天标题 | 当前会话 view | unread 文案 | 展示“暂无未读/x 条未读” | 自己判断是否已读 |
| 打开会话 | `ui.conversation_opened`、loaded messages、conversation summary | 新 read state、`mark_read`、可能的 `clear_new_message_jump` | 提交打开和 loaded 事实，执行 command | 自己计算 `nextReadSeq` 或清零 unread |
| 消息进入可见区 | `ui.messages_visible` | 新 read state、`mark_read` | 提交 visible messages | 自己决定 read cursor |
| 新消息跳转 | conversation view / command | `showNewMessageJump` 或 `clear_new_message_jump` | 展示或清理提示 | 用独立 jump 状态绕过 read state |
| 自己发出的气泡 | message view | `bubbleStatusText` | 展示“已发送/已读” | 直接相信旧 `message.status/isRead` |
| 搜索/历史页 | visible old messages | 最多推进到 visible seq，保留后续 unread | 展示历史消息 | 因为打开页面就清空全部 unread |
| 后台/最小化窗口 | 无 readable UI 事件 | 不推进 read cursor | 保持状态 | 靠 selected conversation 自动已读 |

界面层通过条件：

- 每个已读/未读 UI 表面都只使用 `ConversationReadView` 或 `MessageView`。
- 每个用户行为都只转成 `ImCoreEvent`。
- 每个副作用都只来自 `ImCoreCommand`。
- UI 代码中不得出现 raw unread 兜底、`unread + 1`、直接写 read cursor、直接覆盖气泡已读状态。

### IM 逻辑验证

验证目标：IM 核心作为纯状态机，能独立于页面覆盖所有 read/unread 规则。

核心不变量：

| 不变量 | 必须成立的原因 | 失败后果 |
| --- | --- | --- |
| `myReadSeq` 只能前进 | 当前用户读到的位置不能倒退 | 已读消息复活成未读 |
| `peerReadSeq` 只能前进 | 对方已读回执不能被旧轮询覆盖 | “已读”气泡回退成“已发送” |
| 当前用户自己的消息不产生当前用户 unread | 成熟 IM 基础规则 | 自己发消息出现未读红点 |
| self message 会推进 `myReadSeq` | 自己发到 seq N 表示自己读到 N | 自己最后一条消息后仍残留旧 unread |
| unread 只来自 `seq > myReadSeq` 的 incoming 消息 | unread 是游标之后的对方消息 | 未读数量虚高或虚低 |
| loaded messages 只有覆盖完整新区间时才能精确计数 | 普通分页不能证明未读全集 | 打开历史页错误清零 |
| 服务端 unread 只是输入，不是最终 view | 服务端可能滞后或低报 | UI 被旧数据污染 |
| API blocking 时不输出伪精确 read/unread | 缺关键字段无法证明正确 | 前端假装成熟 IM |
| command 按会话合并最高 readSeq | 多源事件会重复触发 mark read | 重复请求和竞态 |
| pending read 不让本地 unread 复活 | 本地即时已读优先 | 网络失败导致 UI 抖动 |

IM 核心通过条件：

- `im-read-model.ts` 是纯函数模块，不依赖 React、Query、DOM、localStorage 或网络。
- 单元测试覆盖场景矩阵中所有 read math 场景。
- API validator 单元测试覆盖 ok、degraded、blocking。
- 任意输入顺序下，cursor merge 使用 `max`，旧数据不能覆盖新状态。
- 所有无法证明正确的状态都有诊断事件和明确发布决策。

### 整体逻辑闭环验证

验证目标：服务端 API、Gateway、UI、Store、IM 核心、Command executor 形成完整闭环。

标准闭环：

```txt
服务端 API / Gateway / Send / UI / Store
        ↓
API shape validator 和 adapter 归一化
        ↓
ImCoreEvent
        ↓
im-read-model reducer
        ↓
ConversationReadState + ConversationReadView + MessageView + Commands
        ↓
UI 展示 view
Command executor 执行 mark_read / retry / clear_jump / diagnostic
Store 持久化 read state 和 pendingReadSeq
        ↓
服务端确认 lastReadSeq 或 Gateway read event
        ↓
再次进入 IM 核心单调合并
```

整体闭环通过条件：

- 初始化：会话列表和消息列表经过 validator 后进入核心；blocking 不输出伪精确状态。
- 收消息：Gateway 新消息去重、乱序合并、按 active readable 状态决定是否 mark read。
- 发消息：发送成功和自设备 Gateway 都推进 `myReadSeq`，不产生自发 unread。
- 看消息：UI 只提交 opened/visible fact，核心决定 readSeq 和 commands。
- 对方已读：Gateway read receipt 推进 `peerReadSeq`，轮询旧消息不能回退气泡状态。
- 失败恢复：read endpoint 失败进入 `pendingReadSeq`，重启后继续 retry。
- 多端同步：当前用户另一个设备 read 或 send 后，本 PC 通过 Gateway/轮询同步 cursor。
- 分页历史：普通历史页不清空后续 unread，latest page 有覆盖证明才推进到最新。
- 持久化隔离：state key 包含 apiBaseUrl、tenant/user、conversationType、conversationId。
- 验收：unit、browser、双 PC 人工验收都通过，且没有 UI/Gateway 绕过核心。

最终稿判定：

- 三层验证全部通过。
- 场景矩阵没有缺号、占位、无法测试项。
- 服务端 API 契约字段已在真实接口或 mock contract 中确认。
- implementation plan 能逐条映射到本方案的场景矩阵和成功标准。

## 诊断

增加 read model 诊断 helper：

```ts
logImReadDiagnostic(event, context)
```

事件类型：

- `im.read.missing_seq`
- `im.read.missing_sender`
- `im.read.missing_page_coverage`
- `im.read.api_contract_degraded`
- `im.read.api_contract_blocking`
- `im.read.server_unread_mismatch`
- `im.read.server_unread_mismatch_low`
- `im.read.gateway_read_missing_reader`
- `im.read.gateway_read_invalid_seq`
- `im.read.state_regression_blocked`

同一个会话/消息的相同诊断不能刷屏。

## 迁移计划

1. 引入 `im-read-model.ts` 和单测。
2. 在保持当前 UI 行为的前提下，让现有 helper 先转调模型。
3. 用统一 `ConversationReadState` 替换 store 中拆散的 read 状态。
4. 更新 Gateway merge，只调用模型计算 read/unread。
5. 更新 MessageCenter 打开/查看会话的 read reporting，只调用模型。
6. 更新会话列表和 Sidebar 的 unread 展示，只调用模型。
7. 测试通过后移除旧的分散 helper。
8. 运行 unit、typecheck、browser smoke 和双 PC 人工验收。

每一步迁移后应用都必须仍可运行。如果某一步发现服务端字段缺失导致正确性无法保证，必须停在诊断边界，记录完整 response shape、endpoint、requestId 和受影响规则，再决定是否继续加前端兜底。

## 成功标准

只有全部满足时，本项工作才算完成：

- `npm run test:unit` 通过完整 read model 矩阵。
- API 契约 validator 单元测试覆盖 ok、degraded、blocking 三类输入。
- `npm run typecheck` 通过。
- 普通 IM 已读/未读 browser tests 通过。
- 场景矩阵中的每个条目都至少由 unit、browser 或人工验收中的一种覆盖；其中 read math 必须有 unit 断言。
- 双 PC 单聊人工验收通过。
- 群聊 own/peer 消息 unread 验收通过。
- 服务端契约能提供 `lastMessageSeq`、当前用户 `lastReadSeq`、单聊 `peerReadSeq` 或等价字段。
- 服务端消息列表能提供分页覆盖证明字段，例如 `hasMoreAfter` 或 `isLatestPage`。
- API blocking 状态不会输出伪精确 unread/read，并会阻断稳定发布。
- read endpoint 失败后，`pendingReadSeq` 能跨重启保留并重试。
- mark read command 按会话合并，只提交最高 `readSeq`，且接口幂等。
- 没有 UI 直接使用服务端原始 `unreadCount` 展示。
- 没有 Gateway 路径绕过模型直接累加 unread。
- read cursor 在测试和运行时诊断中都不倒退。

## 待确认决策

实施前必须确认：

1. 本轮采用“加载到消息窗口即视为已查看”。后续虚拟列表可升级为 viewport 级已读。
2. 单聊发出消息状态只显示“已发送/已读”，不引入 delivered/read 分层。
3. 群成员级已读回执不在本轮范围内；如果服务端返回 `readCount`，保留现有展示即可。
4. 缺少 `conversationSeq` 只作为短期兜底，并记录为服务端契约缺陷。

## 闭环检查清单

方案满足以下条件才算闭环：

- 每个产品目标都能映射到派生规则和测试类别。
- 每条派生规则都能映射到一个前端模块职责。
- 每个场景矩阵条目都有期望结果和模型支持逻辑，并能映射到测试策略。
- 模型使用的每个服务端字段都出现在服务端契约中。
- 每个服务端契约字段都有用途、缺失后果和 validator 等级。
- 每个缺字段兜底都有诊断事件和发布决策。
- 每个核心 command 都有幂等、去重和失败恢复策略。
- 每个展示已读/未读的 UI 表面都在架构章节点名。
- 每个人工验收步骤都有可观察结果和失败归因。
- read math 只有一个计划中的 owner 模块：`im-read-model.ts`。

## 实施审批入口

方案通过后，单独创建 implementation plan：

```txt
docs/superpowers/plans/2026-05-28-pc-im-read-model-redesign.md
```

实现必须按 TDD 逐任务执行，不能继续靠修补单个 UI 现象推进。
