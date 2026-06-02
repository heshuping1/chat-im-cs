# M01 GatewayConnectionManager 模块设计卡

日期：2026-06-02

模块编号：M01
模块名称：基础设施层 - GatewayConnectionManager
本轮目标：固定长连接生命周期治理边界，补齐 retry、generation、health diagnostics 和业务隔离测试，再收敛 GatewayBridge 调用点。

## 1. 领域职责

- 负责什么：管理 `/ws/client` 长连接的建立、启动失败重试、SignalR close 后接管 retry、主动 stop、session generation 隔离、连接健康状态与诊断事件。
- 不负责什么：不解析业务 payload，不写 IM cache，不写在线客服 ledger/workbench，不清未读，不发桌面提醒，不触发 UI badge。

## 2. 当前代码入口

- 主要文件：
  - `src/renderer/data/gateway/gateway-connection-manager.ts`
  - `src/renderer/data/gateway/gateway-health-diagnostics.ts`
  - `src/renderer/components/GatewayBridge.tsx`
- 当前调用点：
  - `GatewayBridge` 创建 SignalR connection，把 lifecycle callback 交给 `GatewayConnectionManager`。
  - gateway push 进入 `gateway-event-router` / `MessageDeliveryService` 相关入口。
  - reconnected / started 后触发当前 API refetch 补偿。
- 当前已存在测试：
  - `tests/unit/gateway-connection-manager.spec.ts`
  - `tests/unit/architecture-boundaries.spec.ts`

## 3. 输入

- Command：
  - `start()`
  - `stop()`
  - `handleConnectionClosed(connection, error)`
- Domain Event：无。GatewayConnectionManager 属于基础设施生命周期管理，不接收业务领域事件。
- Query View：无。
- 禁止输入的 raw 数据：
  - gateway business payload
  - HTTP response item
  - IM conversation cache item
  - CS workbench/thread/tempSession raw item

## 4. 输出

- Domain Event：无业务领域事件。
- Domain State：无业务领域状态。
- Effective View：无 UI effective view。
- Diagnostics：
  - start attempt
  - start failed
  - retry scheduled
  - connected
  - closed
  - stopped
  - reconnecting / reconnected 由 GatewayBridge 记录 SignalR lifecycle。

## 5. 内部状态

- 本模块维护什么：
  - active connection
  - retry timer
  - attempt counter
  - generation
  - lifecycle status
- 哪些模块禁止读取：
  - IM read model
  - CustomerService unread ledger
  - MessageDeliveryService
  - UI components
  - Reminder / Badge 模块

## 6. 不变量

- 一个 manager generation 只能有一个有效连接。
- `stop()` 后旧 retry timer 不得再创建新连接。
- session 切换后旧 connection close/retry/reconnected callback 不得写新 session 状态。
- start 失败必须持续 retry，不能静默停住。
- SignalR reconnect 最终 close 后必须由 manager 接管 retry。
- Gateway lifecycle 不写业务 cache / ledger / read state / outbox。

## 7. 当前 API 支撑

- 当前 API 能支持：
  - `/ws/client`
  - SignalR `start/onclose/onreconnecting/onreconnected`
  - access token factory
  - 当前 API refetch 补偿触发点
- 当前 API 不支持：
  - 明确的 heartbeat ack 契约尚未确认。
  - 服务端全局 cursor / 会话 afterSeq 精确 gap sync 尚未提供。
- 降级策略：
  - heartbeat 失败只记录健康诊断，不伪装服务端 ack。
  - reconnected / started 后触发当前 API refetch 补偿，并记录 fallback-refetch 缺口。

## 8. 变更范围

- 本轮会改：
  - M01 设计记录。
  - GatewayConnectionManager 单测。
  - architecture boundary 中 Gateway 基础设施隔离约束。
  - 如检查发现 GatewayBridge 仍直接写业务状态，则只收敛 M01 范围调用点。
- 本轮不改：
  - API 防腐字段契约。
  - MessageDeliveryService 幂等细节。
  - IM read / CS ledger 业务规则。
  - SnapshotReconcileService。

## 9. 技术选型

- 沿用当前代码/库：
  - 继续使用 `@microsoft/signalr`。
  - 继续使用现有 React Query、workspace UI store、diagnostics writer。
- 是否需要替换：不需要。
- 如果需要替换，是否已确认：不适用。

## 10. 测试计划

- 单测：
  - start 失败持续 retry。
  - SignalR close 后 manager 接管 retry。
  - session 切换后旧连接回调不写新状态。
  - health diagnostics callback 覆盖 start、failed、retry、connected、closed。
- 边界测试：
  - GatewayConnectionManager 不 import IM cache / CS ledger / UI store。
  - GatewayBridge 不直接 import IM read view / CS unread ledger / badge view / send runtime。
- 手动验收：
  - 本模块不启动真实 Electron 手动验收；以单测和 typecheck 作为 M01 验收基线。

## 11. 回滚点

- 回滚本模块可以 revert M01 设计文档和测试补丁。
- GatewayConnectionManager 运行逻辑如有修改，以单个提交回滚；不影响 M00 baseline commit。
