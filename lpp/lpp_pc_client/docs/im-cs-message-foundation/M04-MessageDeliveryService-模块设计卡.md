# M04 MessageDeliveryService 模块设计卡

日期：2026-06-02

模块编号：M04
模块名称：投递层 - MessageDeliveryService
本轮目标：统一 push / refetch / detail / send ack 回流的消息投递入口，固定幂等、seq guard、gap trigger 和领域分发边界。

## 1. 领域职责

- 负责什么：对已通过防腐层和归属层的消息输入执行 messageId 幂等、`conversationId + seq` 弱幂等、seq stale guard、seq gap 检测，并分发到 IM 或在线客服领域写入入口。
- 不负责什么：不解析历史字段别名，不做 ownership 猜测，不直接计算 unread/badge，不发提醒，不清已读，不实现真实 afterSeq gap sync。

## 2. 当前代码入口

- 主要文件：
  - `src/renderer/data/gateway/message-delivery-service.ts`
  - `src/renderer/data/gateway/gateway-event-router.ts`
  - `src/renderer/data/gateway/gateway-im-side-effects.ts`
  - `src/renderer/data/gateway/gateway-cs-side-effects.ts`
  - `src/renderer/data/gateway/message-gap-sync-coordinator.ts`
- 当前调用点：
  - gateway push route。
  - current API refetch compensation route。
  - detail/history domain merge route（当前阶段使用同等 delivery guard）。
  - send ack 回流 route。
- 当前已存在测试：
  - `tests/unit/message-delivery-service.spec.ts`
  - `tests/unit/gateway-event-router.spec.ts`

## 3. 输入

- Command：
  - `deliverImMessage`
  - `deliverImRead`
  - `deliverCustomerServiceMessage`
  - `deliverCustomerServiceQueue`
- Domain Event：
  - `MessageReceived`
  - `MessageRead`
  - `CustomerServiceVisitorMessageReceived`
  - `CustomerServiceStaffMessageReceived`
  - `SendAckReceived`
- Query View：无。
- 禁止输入的 raw 数据：
  - 防腐层之外的 HTTP response item。
  - 历史字段别名。
  - UI raw query item。

## 4. 输出

- Domain Event：
  - IM message write command。
  - IM read merge command。
  - CS message write command。
  - CS queue/status notification command。
  - gap sync trigger command。
- Domain State：不维护业务状态，只维护投递 guard 内部短期索引。
- Effective View：无。
- Diagnostics：
  - accepted
  - duplicate-message-id
  - duplicate-or-stale-seq
  - seq-gap
  - cache-write
  - queue

## 5. 内部状态

- 本模块维护什么：
  - delivered message id set。
  - highest seq by `scope + owner + conversationId`。
- 哪些模块禁止读取：
  - UI。
  - IM read view。
  - CS unread ledger。
  - Reminder。
  - SnapshotReconcileService。

## 6. 不变量

- 同一 `messageId` 多来源只处理一次。
- 缺 `messageId` 时，`conversationId + seq` 可作为弱幂等。
- 旧 seq 不覆盖新状态。
- seq gap 写入当前 push 后触发当前 API refetch 补偿。
- refetch/detail/history 返回重复消息跳过。
- refetch 失败不回滚当前 push。
- delivery 不直接清未读、不发提醒、不改 badge。

## 7. 当前 API 支撑

- 当前 API 能支持：
  - gateway push。
  - 当前 API refetch compensation。
  - detail/history 查询结果。
  - send ack 回流。
- 当前 API 不支持：
  - 精确 cursor / afterSeq gap sync。
  - eventId。
- 降级策略：
  - 记录 `fallback-refetch`。
  - gap 触发当前 API refetch，不声称精确补洞。

## 8. 变更范围

- 本轮会改：
  - M04 设计卡。
  - delivery guard 标准字段读取。
  - message delivery 单测。
  - gateway router 只在必要时收敛到 delivery。
- 本轮不改：
  - SnapshotReconcileService。
  - CS ledger 内部规则。
  - IM read view。
  - UI badge / notification。

## 9. 技术选型

- 沿用当前代码/库：现有 service + React Query invalidation + Vitest。
- 是否需要替换：不需要。
- 如果需要替换，是否已确认：不适用。

## 10. 测试计划

- 单测：
  - messageId 跨 push/refetch/detail 去重。
  - 无 messageId 时 `conversationId + seq` 弱幂等。
  - stale seq 跳过。
  - seq gap 触发 compensation。
  - CS 消息同样执行 guard。
- 边界测试：
  - router 不直接写 IM/客服 cache。
  - delivery 不 import read view / ledger / UI badge owner。
- 手动验收：
  - 本模块不启动 Electron 手动验收；以单测和 typecheck 验收。

## 11. 回滚点

- 可 revert M04 delivery service 和测试补丁。
- 不改变 M01/M02/M03 的 public boundary。
