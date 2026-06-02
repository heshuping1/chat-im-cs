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

验收口径：

- PC 不写假 cursor。
- PC 不声明已支持精确缺口区间拉取。
- 服务端补齐前，M06 只作为当前 API refetch compensation。
