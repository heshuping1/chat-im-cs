# M05 SnapshotReconcileService 模块设计卡

日期：2026-06-02

模块编号：M05
模块名称：主动查询合并层 - SnapshotReconcileService
本轮目标：实现 snapshot 合并决策入口，防止主动查询覆盖更高 seq 的 push 状态。

## 1. 领域职责

- 负责什么：比较 incoming snapshot 与 local domain state 的 seq/version，决定强字段更新、弱字段补充、拒绝旧 snapshot，并输出 reconcile diagnostics。
- 不负责什么：不写 UI，不清未读，不弹通知，不执行 gateway delivery，不伪造 cursor/afterSeq。

## 2. 当前代码入口

- 主要文件：
  - 待新增 `src/renderer/data/gateway/snapshot-reconcile-service.ts`
  - `src/renderer/data/api/messages-client.ts`
  - `src/renderer/data/customer-service/cs-cache-adapter.ts`
  - `src/renderer/data/customer-service/cs-conversation-index.ts`
- 当前调用点：
  - IM conversation list snapshot。
  - CS workbench snapshot。
  - tempSession 过渡数据。
  - detail/history 弱字段补充。
- 当前已存在测试：
  - `tests/unit/messages-client.spec.ts`
  - `tests/unit/customer-service-client.spec.ts`
  - `tests/unit/message-delivery-service.spec.ts`

## 3. 输入

- Command：
  - reconcile snapshot item。
  - read local state by target id。
- Domain Event：无。
- Query View：snapshot input。
- 禁止输入的 raw 数据：
  - UI state。
  - Reminder count。
  - read/ledger 内部 store。

## 4. 输出

- Domain Event：无。
- Domain State：
  - merge decision。
  - strong field update allowed / rejected。
  - weak field merge allowed。
- Effective View：无。
- Diagnostics：
  - `newer-snapshot`
  - `same-seq-weak-merge`
  - `stale-snapshot-rejected`
  - `seq-missing-weak-only`

## 5. 内部状态

- 本模块维护什么：不维护长期状态；读取调用方提供的 local seq。
- 哪些模块禁止读取：不读 IM read view、CS ledger、UI store、Reminder。

## 6. 不变量

- `incomingSeq > localSeq` 才能更新强状态。
- `incomingSeq === localSeq` 只能补弱字段。
- `incomingSeq < localSeq` 不覆盖强状态。
- 无 seq/version 只能补弱字段。
- Snapshot 不直接清未读、不写 badge、不弹通知。

## 7. 当前 API 支撑

- 当前 API 能支持：
  - IM conversation snapshot。
  - CS workbench snapshot。
  - tempSession 过渡数据。
  - detail/history snapshot。
- 当前 API 不支持：
  - 全局 cursor。
  - 会话级 afterSeq 精确补洞。
  - CS statusVersion 部分缺失。
- 降级策略：
  - 无 seq/version 只补弱字段。
  - 旧 snapshot 记录诊断并拒绝强字段。

## 8. 变更范围

- 本轮会改：
  - M05 设计卡。
  - SnapshotReconcileService。
  - IM/CS snapshot 相关测试。
  - 必要时接入 conversation/workbench 调用点。
- 本轮不改：
  - 精确 gap sync。
  - read model / ledger 规则。
  - UI 结构。

## 9. 技术选型

- 沿用当前代码/库：纯 TypeScript service + Vitest。
- 是否需要替换：不需要。
- 如果需要替换，是否已确认：不适用。

## 10. 测试计划

- 单测：
  - push seq 105 后 snapshot 104 拒绝强字段。
  - same seq 只补弱字段。
  - missing seq 只补弱字段。
  - workbench unread=0 不覆盖 gateway visitor unread。
- 边界测试：
  - SnapshotReconcileService 不 import UI/read/ledger/reminder。
- 手动验收：
  - 本模块不启动 Electron 手动验收；以单测和 typecheck 验收。

## 11. 回滚点

- 可 revert M05 service 和接入补丁。
- 不影响前序 transport、防腐、归属、投递 guard。
