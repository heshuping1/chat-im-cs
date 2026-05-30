# 验证记录：P3-API-004A 客服 DTO 字段与终态规则盘点

日期：2026-05-29

任务编号：P3-API-004A

## 盘点范围

- `src/renderer/data/api/types.ts`
- `src/renderer/data/api/customer-service-client.ts`
- `src/renderer/data/customer-service-display.ts`
- `src/renderer/components/ThreadList.tsx`
- `src/renderer/components/ChatWorkspace.tsx`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/components/GatewayBridge.tsx`

## 当前接口入口

| 入口 | 说明 |
| --- | --- |
| `getWorkbenchThreads` | 返回 `CustomerServiceThreadsResponse`，包含 `queueItems/activeItems/summary`。 |
| `getWorkbenchThreadDetail` | 返回线程详情，当前通过 `normalizeWorkbenchThreadDetail` 做局部字段兼容。 |
| `getThreadProfileCard` | 返回 `CustomerProfileCard`，页面直接消费 profile 字段。 |
| `getStaffServiceHistory` | 返回 `StaffServiceHistoryResponse`，组件使用 `staffServiceHistoryItemToThread` 转为 `CustomerServiceThread`。 |

## Thread DTO 字段矩阵

| 字段 | 当前来源/兼容字段 | 当前用途 | 风险 |
| --- | --- | --- | --- |
| `threadType` | `temp_session/im_direct/direct`，路径里 `temp-session/direct-customer` | 接口路径、列表过滤、动作执行。 | 归一规则分散在 API types、client、页面。 |
| `threadId` | `threadId/sessionId/visitorSessionId/tempSessionId` | key、选中线程、详情/动作 API、提醒目标。 | 核心 ID，缺失必须 invalid。 |
| `conversationId` | `conversationId` 或 fallback `threadId` | 消息上下文、提醒清理、媒体缓存。 | 可 fallback，但必须记录。 |
| `status` | string/number，closed 类终态较多 | 排队/服务中/AI/只读/终态判断。 | 状态机尚未集中，页面各自判断。 |
| `title` | `title/customerDisplayName/visitorDisplayName/displayName/customerName/visitorName` | 列表、详情头、提醒标题。 | fallback 逻辑分散。 |
| `source/from/channel/sourceChannel/entryChannel/platform/provider` | 多渠道来源字段 | 列表搜索、提醒文案、详情展示。 | 字段兼容在多处重复。 |
| `avatarUrl/customerAvatarUrl` | 头像字段 | 列表、详情头、提醒。 | 应复用头像能力。 |
| `isVip/customerLevel/priority/tags` | 客户等级与风险 | 列表标记、风险样式。 | 规则散落在 ThreadList。 |
| `lastMessagePreview/lastMessageAt/updatedAt` | 列表排序、预览 | 列表、提醒、详情合并。 | detail merge 和列表 merge 各有一套。 |
| `assignedAt/unreadCount` | 分配时间、未读 | 筛选、badge、提醒。 | 未读和 reminder 去重仍未完全 domain 化。 |

## Detail DTO 字段矩阵

| 字段 | 当前来源/兼容字段 | 当前用途 | 风险 |
| --- | --- | --- | --- |
| `messages` | detail 或 nested `tempSession/directChat` | 消息列表、最近消息推导。 | 未经过统一客服 message contract。 |
| `tempSession/temp_session/directChat/direct_chat` | 嵌套线程来源 | detail normalizer 读取 title/avatar/source。 | 兼容逻辑只在 client 局部。 |
| `lastMessagePreview/lastMessageAt` | detail/nested/latest message | 列表 cache merge。 | 与 workbench list 字段重复。 |
| `status` | detail/list/action result | 只读、动作按钮、关闭 cache。 | 后续 P6 状态机统一。 |

## Customer Profile 字段矩阵

| 字段 | 当前来源/兼容字段 | 当前用途 | 风险 |
| --- | --- | --- | --- |
| `customerUserId/customerId/userId/platformUserId` | 用户 ID | 资料卡、关联客户。 | 不应进日志明文以外的隐私字段。 |
| `lppId/lppNo/lppNumber/customerLpp*` | LPP 身份 | 客户上下文。 | 多字段重复。 |
| `displayName/customerName/customerDisplayName/nickname` | 展示名 | 详情头、资料卡。 | fallback 分散。 |
| `avatarUrl` | 头像 | 详情头。 | 可直接复用 `PcAvatar`。 |
| `isVip/customerLevel/level/grade/rank` | 客户层级 | VIP/等级展示。 | 需要 profile view model。 |
| `kyc/compliance/risk` | 合规/风险 | 客户上下文。 | 敏感字段日志禁止输出。 |
| `phone/email/mobile` | 联系方式 | 客户资料。 | 必须脱敏，诊断日志不得记录原值。 |
| `tradingSummary/temporaryOrders/tickets/externalSections` | 扩展资料 | 右侧客户上下文。 | 结构动态，需要 schema 降级策略。 |

## 终态规则

当前终态由 `terminalCustomerServiceThreadStatuses` 和 `isTerminalCustomerServiceThreadStatus` 定义：

```text
closed, closed_by_visitor, closed_by_staff, closed_timeout, closed_system,
archived, ended, finished, resolved, terminated, cancelled, canceled,
expired, 5, 6, 7, 8, 9, 或 startsWith("closed")
```

当前页面行为：

| 页面 | 行为 |
| --- | --- |
| `ThreadList` | current 列表过滤终态，history 列表显示终态。 |
| `ChatWorkspace` | 终态线程只读，按钮和发送入口禁用。 |
| `customer-service-display.ts` | `queued/waiting` 标为排队，其余非终态多为人工服务中。 |

## 当前问题

| 问题 | 影响 | 后续处理 |
| --- | --- | --- |
| 客服 thread DTO/domain/view 混用 | 页面直接依赖 raw 字段和 fallback。 | P3-API-004B 建立 thread normalizer。 |
| 终态规则和动作权限尚未形成状态机 | 关闭、接入、AI 接管、只读容易互相影响。 | P6-CS-002 状态机治理。 |
| profile 敏感字段多 | 电话、邮箱、风险、资产等不能进入普通日志。 | P3-API-004B normalizer + 日志摘要。 |
| detail/list cache merge 分散 | ChatWorkspace 内多处 setQueryData。 | P6-CS-004 cache adapter。 |

## 推荐 P3-API-004B 最小切入

1. 新增 `data/customer-service/cs-contract.ts`。
2. 定义 `CustomerServiceThreadEntity` 和 `CustomerProfileEntity`。
3. 对 `getWorkbenchThreads`、`getThreadProfileCard` 做兼容接入，输出旧 shape。
4. 暂不改动作权限和状态机，只统一 type/status/title/source/profile 字段。
5. 使用 `logApiContractDiagnostic`，只记录 threadId/conversationId/status issue，不记录联系方式、风险明细、交易数据。

## 验证命令

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `sed -n '1,380p' src/renderer/data/api/customer-service-client.ts` | 通过 | 确认客服 API 和 detail 局部 normalizer。 |
| `sed -n '430,760p' src/renderer/data/api/types.ts` | 通过 | 确认客服 thread/history/profile 类型和终态规则。 |
| `sed -n '1,220p' src/renderer/data/customer-service-display.ts` | 通过 | 确认排队/展示状态规则。 |
| `rg -n "CustomerServiceThread|normalizeCustomerServiceThreadType|isTerminalCustomerServiceThreadStatus|..." ...` | 通过 | 检索主要消费点。 |

## 诊断日志

| 项 | 内容 |
| --- | --- |
| 是否新增日志 | 否，本任务为字段盘点。 |
| 日志入口 | P3-API-004B 使用 `data/api-contract/contract-diagnostics.ts`。 |
| traceId/correlationId | `api-contract-normalize-<timestamp>-<random>`。 |
| 可用于排查的问题 | 线程字段缺失、未知状态、profile 降级会在后续 normalizer 接入。 |
| 敏感信息处理 | 本文只列字段名，不记录电话、邮箱、交易、风险明细、token。 |

## 结论

P3-API-004A 已完成。客服合同治理应先收口 thread/profile 字段，再在 P6 做状态机、动作权限、cache adapter。
