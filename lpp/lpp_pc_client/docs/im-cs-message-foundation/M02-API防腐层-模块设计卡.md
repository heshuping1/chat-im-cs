# M02 API 防腐层模块设计卡

日期：2026-06-02

模块编号：M02
模块名称：API 防腐层 - API Contract Guard / Anti-Corruption Mapper
本轮目标：固定外部 Gateway / HTTP 输入只能在防腐层读取，防腐层只接受标准字段并输出领域事件和值对象；非标准字段不进入领域层。

## 1. 领域职责

- 负责什么：校验标准 API 字段，转换 Gateway / HTTP 输入为稳定领域事件、值对象或诊断结果。
- 不负责什么：不判断 UI 可见性，不写 IM cache，不写客服 ledger，不清未读，不弹通知，不执行 gap sync。

## 2. 当前代码入口

- 主要文件：
  - `src/renderer/data/gateway/gateway-event-types.ts`
  - `src/renderer/data/gateway/gateway-event-adapter.ts`
  - `src/renderer/data/gateway/cs-gateway-event-adapter.ts`
  - `src/renderer/data/im-api-contract.ts`
  - `src/renderer/data/customer-service/cs-message-contract.ts`
  - `src/renderer/data/api/messages-client.ts`
- 当前调用点：
  - `im-gateway-handler` 调用 `adaptGatewayEvent`。
  - `cs-gateway-handler` 调用 `adaptCustomerServiceGatewayEvent`。
  - `gateway-event-router` 当前仍有 fallback payload 路由逻辑，M02 需要逐步收敛。
  - `MessageDeliveryService` 当前仍接收 raw payload，M02 只补防腐输出和边界测试，完整投递收口在 M04。
- 当前已存在测试：
  - `tests/unit/gateway-event-adapter.spec.ts`
  - `tests/unit/cs-gateway-event-adapter.spec.ts`
  - `tests/unit/gateway-contract.spec.ts`
  - `tests/unit/message-delivery-service.spec.ts`
  - `tests/unit/conversation-ownership.spec.ts`
  - `tests/unit/architecture-boundaries.spec.ts`

## 3. 输入

- Command：无。
- Domain Event：无。防腐层从外部输入生成领域事件，不消费业务领域事件。
- Query View：无。
- 禁止输入的 raw 数据：
  - 领域层、UI、Reminder、Read model、Ledger 不得接收 gateway payload / HTTP item / tempSession raw。
  - 防腐层之外不得读取历史别名字段。

## 4. 输出

- Domain Event：
  - `MessageReceived`
  - `MessageRead`
  - `CustomerServiceVisitorMessageReceived`
  - `CustomerServiceStaffMessageReceived`
  - `CustomerServiceThreadOwnership`
  - `SendAckReceived`
- Domain State：无。
- Effective View：无。
- Diagnostics：
  - missing standard field
  - degraded contract
  - blocking contract
  - non-standard alias rejected
  - server contract gap

## 5. 内部状态

- 本模块维护什么：不维护长期业务状态，只维护转换过程中的局部诊断。
- 哪些模块禁止读取：无内部 store；输出事件和值对象给后续模块。

## 6. 不变量

- 外部 API payload 只在防腐层出现。
- PC 不做字段别名兼容；`message_id/msgId/fromUserId/sessionId/thread_id/conversation_id/chatId` 等非标准字段不得被当作标准字段读取。
- 字段不统一必须由服务端 API 或网关适配层统一后再进入 PC。
- 缺 `messageId` 但有 `conversationId + seq` 可进入弱幂等；二者都缺只能诊断或弱字段合并。
- 客服消息缺 `sender/direction/isMine` 不得增加访客未读。
- 防腐层不做归属猜测；归属进入 `ConversationOwnershipResolver`。

## 7. 当前 API 支撑

- 当前 API 能支持：
  - `/ws/client` `msg.new` / `msg.read`
  - 标准 IM 字段：`messageId`、`conversationId`、`conversationType`、`conversationSeq` / `seq`、`senderUserId`、`senderId`、`senderPlatformUserId`、`senderLppId`、`direction`、`isSelf`、`isMine`、`messageType`、`sentAt`
  - 标准 CS 字段：`threadId`、`threadType`、`conversationId`、`messageId`、`conversationSeq` / `seq`、`senderUserId`、`senderId`、`senderRole`、`direction`、`isSelf`、`isMine`、`messageType`、`body`、`sentAt`
  - `pc-im-conversations.tempSession` 作为当前 API 过渡归属输入。
- 当前 API 不支持：
  - 全局 `cursor` 或会话级严格 `afterSeq`。
  - Gateway eventId。
  - CS `statusVersion`。
  - 部分 CS 消息缺明确 `senderRole/direction/isMine`。
- 降级策略：
  - 记录诊断。
  - 不在 PC 内猜字段别名。
  - 不支持的能力标为服务端缺口。

## 8. 标准字段盘点

| 入口 | 标准字段 | 缺失处理 |
| --- | --- | --- |
| `/ws/client` `msg.new` | `messageId`、`conversationId`、`conversationType`、`conversationSeq/seq`、`senderUserId/senderId/senderPlatformUserId/senderLppId`、`direction/isSelf/isMine`、`messageType`、`sentAt` | 缺 seq 为 blocking；缺 sender 为 degraded；缺 conversationId 为 invalid；缺 messageId 可用 `conversationId + seq` 弱幂等 |
| `/ws/client` `msg.read` | `conversationId`、`conversationType`、`readSeq`、`userId/platformUserId/lppId` | 缺 `conversationId` 或 `readSeq` 为 invalid |
| CS gateway message | `threadId`、`threadType`、`conversationId`、`messageId`、`conversationSeq/seq`、`senderUserId/senderId/senderRole`、`direction/isSelf/isMine`、`messageType`、`body` | 缺 threadId 为 invalid；缺 sender/direction 不增加访客未读；缺 messageId 进入弱幂等 |
| IM conversation list | `conversationId`、`conversationType`、`lastMessageSeq`、`lastReadSeq`、`peerReadSeq`、`unreadCount` | 缺强字段为 blocking；进入 SnapshotReconcileService |
| IM detail messages | `conversationId`、`conversationType`、`items[]`、`conversationSeq`、`messageId` | 走 delivery/domain merge guard；重复跳过 |
| CS workbench threads | `threadId`、`threadType`、`status`、`visitorUnread`、`lastMessageSeq/statusVersion` | 无 version 只能补弱字段；raw unread 不能直接作为最终 badge |
| CS detail messages | `threadId`、`conversationId`、`items[]`、`conversationSeq`、`messageId`、`senderRole/direction/isMine` | 详情加载不等于清未读；清未读由 read visibility 判断 |
| `tempSession` 过渡数据 | `tempSession.sessionId`、`conversationId`、`threadType`、`preview` | 只产生归属/preview 候选，不直接写最终 unread badge |

## 9. 变更范围

- 本轮会改：
  - M02 设计卡和标准字段清单。
  - Gateway/CS 防腐层标准字段测试。
  - 防腐层拒绝历史别名字段的实现。
  - 边界测试防止领域层读取 raw alias。
- 本轮不改：
  - SnapshotReconcileService。
  - 完整 MessageDeliveryService 投递模型。
  - UI badge/read 迁移。
  - 服务端协议。

## 10. 技术选型

- 沿用当前代码/库：现有 TypeScript contract mapper 和 Vitest。
- 是否需要替换：不需要。
- 如果需要替换，是否已确认：不适用。

## 11. 测试计划

- 单测：
  - 标准字段完整时成功转换。
  - 非标准别名字段不被防腐层读取。
  - 缺 `messageId` 但有 `conversationId + seq` 进入 degraded / weak idempotency。
  - 缺 `sender/direction` 的客服消息不增加访客未读。
- 边界测试：
  - 领域层不直接读取 gateway payload / HTTP item / tempSession raw。
  - read/ledger/reminder/UI 不读取历史别名字段。
- 手动验收：
  - M02 不启动 Electron 手动验收；以 contract tests、boundary tests、typecheck 验收。

## 12. 回滚点

- 可 revert M02 设计文档和防腐层测试/实现补丁。
- 不引入新库，不改变底层 transport，回滚不影响 M01。
