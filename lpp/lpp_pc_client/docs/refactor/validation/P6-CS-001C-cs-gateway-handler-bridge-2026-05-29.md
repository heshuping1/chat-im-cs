# P6-CS-001C CS Gateway Handler Bridge

日期：2026-05-29

## 变更

已完成：

- 新增 `src/renderer/data/gateway/cs-gateway-handler.ts`。
- 扩展 `gateway-dispatcher.ts`，支持客服消息和客服线程事件 callback。
- 扩展 `gateway-diagnostics.ts`，客服事件可进入统一 Gateway 诊断缓冲。
- `GatewayBridge.tsx` 接入 `handleFirstStageCustomerServiceGatewayEvent`。

## 当前闭环

| Typed event | GatewayBridge callback | 行为 |
| --- | --- | --- |
| `cs.message.received` | `onMessageReceived` | 复用旧 `mergeCustomerServiceGatewayMessage`，刷新客服 query；泛消息事件额外刷新 IM conversation。 |
| `cs.thread.changed` | `onThreadChanged` | 刷新客服 query；如是 queue/thread queued 事件，复用旧 queue reminder；如有 staff status，更新本地客服状态。 |

## 边界

本轮不删除旧 fallback 分支。原因：

- Gateway 真实 payload 可能仍有未知形态。
- 新 handler 只提前接管可识别的客服事件。
- invalid 或 unsupported 事件仍可落回旧分支，减少线上行为变化。

## 诊断日志

客服 Gateway 事件复用 `window.__lppGatewayDiagnostics` 和 `localStorage.lpp.gatewayDiagnostics=1`。
