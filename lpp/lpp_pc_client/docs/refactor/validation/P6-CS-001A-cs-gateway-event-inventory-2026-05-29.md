# P6-CS-001A CS Gateway Event Inventory

日期：2026-05-29

## 盘点范围

文件：

- `src/renderer/components/GatewayBridge.tsx`
- `src/renderer/data/gateway/*`
- `src/renderer/data/customer-service/cs-message-contract.ts`
- `src/renderer/data/customer-service/cs-contract.ts`

## 客服 Gateway 事件

| 类别 | 事件名 | 旧处理 |
| --- | --- | --- |
| 客服消息 | `temp_session.message`、`temp_session.message.new`、`temp_session.message.created` | `mergeCustomerServiceGatewayMessage` + invalidate 客服 query |
| 客服消息 | `customer_service.message`、`customer_service.message.new`、`customer_service.message.created`、`customer_service.thread.message` | `mergeCustomerServiceGatewayMessage` + invalidate 客服 query |
| 泛消息客服 payload | `message.new`、`message.created`、`chat.message` 等 | 先判断 payload 是否客服，再走客服 merge |
| 排队/新线程 | `temp_session.created`、`temp_session.queued`、`temp_session.waiting`、`customer_service.queue.created`、`customer_service.thread.created` 等 | invalidate 客服 query + queue reminder |
| 线程状态 | `temp_session.assigned`、`temp_session.closed`、`temp_session.rated`、`customer_service.assigned`、`customer_service.status_changed` | invalidate 客服 query，部分同步 staff status |
| SLA/坐席状态 | `customer_service.staff.status_changed`、`customer_service.staff.auto_offline`、`customer_service.sla.warning`、`customer_service.sla.breached` | invalidate 客服 query，部分同步 staff status |

## 发现的问题

1. 客服事件原来直接写在 `GatewayBridge.tsx`，事件名集合、payload 识别、cache 更新和提醒触发混在一个组件里。
2. IM Gateway 已有 typed adapter/handler，但客服事件在该 adapter 中被标记为 ignored，缺少客服自己的 typed event。
3. 客服消息已有 `normalizeCustomerServiceMessageDto`，Gateway 旧链路没有优先复用该合同层。
4. queue/status/message 的 invalid/ignored reason 不可测试，不利于日志排查。

## 结论

本轮先建立客服 Gateway 第一阶段：`raw -> cs adapter -> dispatcher/handler -> GatewayBridge callbacks`。旧 fallback 分支保留，只有新 handler 能识别并处理的客服事件才提前收口。
