# M06 服务端 Gap Sync 缺口清单

日期：2026-06-02

当前 PC 只实现 `fallback-refetch` 补偿，不实现也不声明精确 gap sync。真实 gap sync 需要服务端或网关补齐以下契约：

| 缺口 | 需要服务端提供 | PC 当前处理 |
| --- | --- | --- |
| 全局 cursor | 每个 gateway event 递增 cursor，支持 `afterCursor` 拉取 | 只能 invalidate conversation/workbench/detail |
| 会话级 afterSeq | 按 `conversationId/threadId + afterSeq` 拉取缺口消息 | seq gap 后触发当前 API refetch |
| eventId | 每个 gateway event 唯一 id，用于跨来源幂等 | PC 只能用 `messageId` 或 `conversationId + seq` 弱幂等 |
| CS statusVersion | 客服 thread/status/workbench 快照版本 | 无 version 时只补弱字段，不覆盖 push 强状态 |
| senderRole/direction/isMine | 客服消息必须明确访客/客服/自己 | 缺字段时不增加访客未读 |
| heartbeat ack | `/ws/client` 明确 heartbeat request/ack 协议 | 当前 heartbeat 失败只记录健康诊断 |

## 建议服务端合同

PC 端接入真实精确 gap sync 前，服务端至少需要提供一个会话级 afterSeq 或全局 cursor 合同。建议优先补会话级接口：

```text
GET /api/client/v1/conversations/{conversationId}/messages/changes?afterSeq={seq}&limit={limit}
```

最低响应字段：

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `conversationId` | 是 | 会话 ID，必须与请求一致 |
| `conversationType` | 是 | `direct` / `group` / 后续明确类型 |
| `fromSeq` | 是 | 本次补洞起始 seq |
| `toSeq` | 是 | 本次补洞结束 seq |
| `hasMore` | 是 | 是否还有后续缺口 |
| `messages` | 是 | 缺口消息列表，字段满足普通 IM 消息历史最低合同 |
| `deletedMessageIds` | 否 | 缺口期间删除的消息 |
| `recalledMessageIds` | 否 | 缺口期间撤回的消息 |
| `nextAfterSeq` / `serverCursor` | 是 | 下一次继续补洞位置 |

如果服务端选择全局 cursor，则每个 Gateway event 必须携带单调递增 cursor，并提供 `GET /api/client/v1/events/changes?afterCursor=...` 等价接口。

验收口径：

- PC 不写假 cursor。
- PC 不声明已支持精确缺口区间拉取。
- 服务端补齐前，M06 只作为当前 API refetch compensation。
