# M03 ConversationOwnershipResolver 模块设计卡

日期：2026-06-02

模块编号：M03
模块名称：归属层 - ConversationOwnershipResolver
本轮目标：固化 IM / 在线客服归属规则，防止 tempSession 与 IM 串线，并保证归属索引按 scope 隔离。

## 1. 领域职责

- 负责什么：基于防腐层输出的标准字段和值对象判断消息或 snapshot 属于 IM 还是在线客服。
- 不负责什么：不解析历史字段别名，不写 cache，不写 ledger，不清未读，不发提醒，不做 delivery 幂等。

## 2. 当前代码入口

- 主要文件：
  - `src/renderer/data/gateway/conversation-ownership-resolver.ts`
  - `src/renderer/data/customer-service/cs-conversation-index.ts`
  - `src/renderer/data/gateway/gateway-cs-payload-utils.ts`
- 当前调用点：
  - gateway CS payload classification。
  - gateway router IM/CS 分流。
  - tempSession 过渡索引查询。
- 当前已存在测试：
  - `tests/unit/conversation-ownership.spec.ts`
  - `tests/unit/gateway-event-router.spec.ts`

## 3. 输入

- Command：无。
- Domain Event：防腐层转换后的 message / thread ownership 输入。
- Query View：tempSession scope index 查询结果。
- 禁止输入的 raw 数据：
  - 非标准字段别名。
  - preview / 文案 / 路径名猜测。
  - workbench raw unread。

## 4. 输出

- Domain Event：
  - `CustomerServiceThreadOwnership` 候选。
- Domain State：无。
- Effective View：无。
- Diagnostics：
  - `explicit-temp-session`
  - `explicit-im`
  - `indexed-temp-session`
  - `default-im`
  - `blocking-missing-scope`

## 5. 内部状态

- 本模块维护什么：不维护状态；只查询 `cs-conversation-index` 的公开接口。
- 哪些模块禁止读取：不得读取 CS ledger、IM read view、UI store、React Query raw item。

## 6. 不变量

- `direct/group/im_direct/im_group` 归 IM。
- `temp_session`、明确客服事件、明确 `tempSession.sessionId` 归客服。
- 无客服高置信证据默认 IM。
- `direct_customer/customer_direct` 无明确 tempSession 时不归客服。
- 禁止通过字段名、对象路径、preview、文案猜归属。
- tempSession index 必须按 `scopeKey` 隔离。

## 7. 当前 API 支撑

- 当前 API 能支持：
  - 标准 `conversationId`
  - 标准 `conversationType`
  - 标准 `threadId`
  - 标准 `threadType`
  - `tempSession.sessionId` 过渡结构。
- 当前 API 不支持：
  - 部分事件缺明确 owner / threadType。
  - `direct_customer` 语义不稳定，不能无 tempSession 时归客服。
- 降级策略：
  - 无客服证据默认 IM，保护普通 IM。
  - 有 index 但 scope 不匹配时忽略。

## 8. 变更范围

- 本轮会改：
  - M03 设计卡。
  - resolver 标准字段归属规则。
  - OWN-01 到 OWN-09 相关测试。
  - gateway router 中 M03 归属相关测试。
- 本轮不改：
  - MessageDeliveryService 幂等。
  - CS unread ledger。
  - IM read view。
  - SnapshotReconcileService。

## 9. 技术选型

- 沿用当前代码/库：现有 resolver + scope index + Vitest。
- 是否需要替换：不需要。
- 如果需要替换，是否已确认：不适用。

## 10. 测试计划

- 单测：
  - `direct/group/im_direct/im_group` 归 IM。
  - `temp_session` 和 `tempSession.sessionId` 归客服。
  - 无客服证据默认 IM。
  - `direct_customer/customer_direct` 不归客服。
  - tempSession index 同 scope 命中，跨 scope 不命中。
  - 字段名、preview、路径不触发客服归属。
- 边界测试：
  - resolver 不读取 alias 字段。
  - resolver 不 import ledger/read/UI store。
- 手动验收：
  - 本模块不启动 Electron 手动验收；以单测、边界测试和 typecheck 验收。

## 11. 回滚点

- 可 revert M03 resolver 和测试补丁。
- 不影响 M01 transport 和 M02 mapper 的已完成边界。
