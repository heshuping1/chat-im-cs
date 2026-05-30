# P6-CS-001B CS Gateway Typed Adapter

日期：2026-05-29

## 变更

已完成：

- 新增 `src/renderer/data/gateway/cs-gateway-event-adapter.ts`。
- 扩展 `gateway-event-types.ts`，新增：
  - `cs.message.received`
  - `cs.thread.changed`
  - `CustomerServiceGatewayChangeKind`
  - `missing_thread_id`
  - `non_cs_event`
- 客服消息通过 `normalizeCustomerServiceMessageDto` 归一化，并输出 `MessageItemDto`。
- 客服线程/队列/状态事件统一输出 `cs.thread.changed`，携带 `changeKind`、`threadId`、`serviceStatus`、`threadStatus`、`shouldNotifyQueue`。

## Reason 规则

| 场景 | 输出 |
| --- | --- |
| 非客服事件 | `ignored/non_cs_event` |
| 客服消息缺 thread id | `invalid/missing_thread_id` |
| 客服消息合同失败 | `invalid/blocking_contract` |
| 客服消息字段缺失但可降级 | `cs.message.received` + `contractStatus=degraded` |

## 兼容策略

`message.new` 等泛消息事件不会直接当客服处理，必须 payload 能被识别为客服线程；否则 adapter 返回 `ignored/non_cs_event`，继续由 IM 或旧 fallback 分支处理。
