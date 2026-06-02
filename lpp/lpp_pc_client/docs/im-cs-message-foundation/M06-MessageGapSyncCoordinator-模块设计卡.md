# M06 MessageGapSyncCoordinator 模块设计卡

日期：2026-06-02

模块编号：M06
模块名称：当前 API 补偿同步 - MessageGapSyncCoordinator
本轮目标：固定 gateway started/reconnected、seq gap、snapshot gap 触发当前 API refetch compensation；记录服务端真实 gap sync 缺口，不伪造 cursor。

## 1. 领域职责

- 负责什么：协调当前 API 下的 conversation/detail/workbench refetch compensation，记录 fallback-refetch 诊断和失败重试。
- 不负责什么：不实现服务端未提供的 cursor/afterSeq，不回滚已收到 push，不直接写 cache，不清未读，不发提醒。

## 2. 当前代码入口

- 主要文件：
  - `src/renderer/data/gateway/message-gap-sync-coordinator.ts`
  - `src/renderer/components/GatewayBridge.tsx`
  - `src/renderer/data/gateway/message-delivery-service.ts`
- 当前调用点：
  - gateway started。
  - gateway reconnected。
  - push seq gap。
  - IM read command 发现 snapshot gap。
- 当前已存在测试：
  - `tests/unit/message-gap-sync-coordinator.spec.ts`
  - `tests/unit/gateway-connection-manager.spec.ts`

## 3. 输入

- Command：
  - `triggerMessageGapSync(queryClient, input)`
- Domain Event：
  - gateway lifecycle event。
  - delivery seq gap event。
  - startup snapshot gap event。
- Query View：无。
- 禁止输入的 raw 数据：
  - gateway payload。
  - HTTP response item。
  - UI raw state。

## 4. 输出

- Domain Event：无。
- Domain State：无。
- Effective View：无。
- Diagnostics：
  - `message.gap-sync.triggered`
  - `message.gap-sync.failed`
  - `message.gap-sync.retry-scheduled`
- Query invalidation：
  - `pc-im-conversations`
  - `pc-cs-workbench-threads`
  - matching `pc-im-messages`

## 5. 内部状态

- 本模块维护什么：不维护业务状态；只使用短期 retry timer。
- 哪些模块禁止读取：不读 IM read view、CS ledger、UI store、outbox。

## 6. 不变量

- 当前 push 已写入后，补偿失败不得回滚当前 push。
- 当前 API 只做 fallback refetch，不声明精确 gap sync。
- 重连成功必须触发补偿。
- seq gap 必须触发补偿。
- 补偿失败必须记录诊断并重试。

## 7. 当前 API 支撑

- 当前 API 能支持：
  - IM conversation refetch。
  - IM detail refetch。
  - CS workbench refetch。
  - CS detail refetch 由现有 query key 间接触发。
- 当前 API 不支持：
  - 全局 cursor。
  - 会话级 afterSeq。
  - Gateway eventId。
  - CS statusVersion 完整契约。
  - 明确 senderRole/direction/isMine 的全量覆盖。
- 降级策略：
  - 记录 `fallback-refetch`。
  - invalidate 当前 query。
  - 失败后延迟重试，不阻塞 push。

## 8. 变更范围

- 本轮会改：
  - M06 设计卡。
  - gap sync coordinator 失败诊断和重试。
  - 服务端缺口文档。
  - M06 单测。
- 本轮不改：
  - 精确 cursor gap sync。
  - SnapshotReconcileService 规则。
  - UI 同步状态样式。

## 9. 技术选型

- 沿用当前代码/库：React Query invalidation + diagnostics writer + Vitest。
- 是否需要替换：不需要。
- 如果需要替换，是否已确认：不适用。

## 10. 测试计划

- 单测：
  - gateway reconnected 触发 IM/CS refetch。
  - push seq gap 触发 conversation detail refetch。
  - refetch invalidation 失败记录 failed。
  - refetch 失败调度 retry。
- 边界测试：
  - coordinator 不 import read/ledger/UI/outbox。
- 手动验收：
  - 本模块不启动 Electron 手动验收；以单测和 typecheck 验收。

## 11. 回滚点

- 可 revert M06 coordinator 和测试补丁。
- 不影响 M05 stale snapshot protection。
