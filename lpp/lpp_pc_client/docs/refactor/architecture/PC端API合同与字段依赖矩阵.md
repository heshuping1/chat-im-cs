# PC 端 API 合同与字段依赖矩阵

状态：冷参考

来源：从 `PC端核心架构技术方案.md` 拆出，供 API/DTO/Gateway 合同任务按需读取。

适用范围：接口字段依赖、DTO -> Domain -> ViewModel 边界和字段降级判断。

---

## 22. API 合同与字段依赖矩阵

本节列出 PC 核心链路的最低字段要求。字段缺失不是 UI 小问题，而是会直接影响状态机能否安全运行。

合同异常处理原则：

1. 服务端 API 或 Gateway 返回与本矩阵、接口文档或已确认业务语义冲突时，优先判定为服务端合同异常，并向用户明确提醒。
2. PC 端必须保留脱敏诊断证据，包括请求/事件、时间、requestId 或 traceId、关键 ID、归属字段、scope 和阻断原因。
3. PC 端只允许在 API/Gateway 防腐层做白名单纳入、阻断、隔离或临时 overlay，不允许用猜测归属、默认 IM/客服纳入、模糊别名兼容或 UI 展示兜底把错误合同改造成领域事实。
4. 如确需临时隔离，必须有单测覆盖、诊断日志和可删除条件；长期正确性应回到服务端合同修复。

### 22.1 普通 IM 会话列表

接口：

- `GET /api/client/v1/conversations`

最低字段：

| 字段 | 必需 | 用途 | 缺失降级 |
| --- | --- | --- | --- |
| `conversationId` | 是 | 会话主键。 | 阻断该会话展示，记录 diagnostic。 |
| `conversationType` | 是 | 区分 direct/group/temp_session。 | 无法确定入口，阻断或过滤。 |
| `title` / 可用名称字段 | 否 | 列表标题。 | 使用兜底标题，但记录字段缺失。 |
| `lastMessage` | 否 | 摘要展示。 | 显示空摘要。 |
| `lastMessageSeq` | 强建议 | read cursor 和排序。 | 不能精确处理 read cursor，只能降级。 |
| `lastReadSeq` | 强建议 | 我的已读游标。 | 使用本地 read state，跨端不保证。 |
| `unreadCount` | 强建议 | 未读条数输入。 | 不能精确显示未读，只能用已加载消息推导。 |
| `updatedAt` / `lastMessageAt` | 是 | 排序。 | 排序降级，记录 diagnostic。 |

### 22.2 普通 IM 消息历史

接口：

- `GET /api/client/v1/direct-chats/{conversationId}/messages`
- `GET /api/client/v1/groups/{conversationId}/messages`

最低字段：

| 字段 | 必需 | 用途 | 缺失降级 |
| --- | --- | --- | --- |
| `messageId` | 是 | 去重、操作、key。 | 使用临时 key 展示，撤回/删除/收藏不可用。 |
| `conversationId` | 是 | 归属校验。 | 阻断写入该 timeline。 |
| `conversationSeq` | 强建议 | 排序和 read cursor。 | 只能按时间排序，read 功能降级。 |
| `messageType` | 是 | body normalize。 | 按 body 推断，失败则 unsupported。 |
| `body` | 是 | 渲染内容。 | 显示 unsupported。 |
| `senderUserId`/`senderId`/身份字段 | 强建议 | 判断自己/对方。 | 使用 direction/isSelf；仍缺则标记 unknown。 |
| `sentAt` | 是 | 排序和展示。 | 使用接收时间，记录 diagnostic。 |

### 22.3 普通 IM 写接口

接口：

- `POST /api/client/v1/direct-chats/{conversationId}/messages`
- `POST /api/client/v1/groups/{conversationId}/messages`
- `POST /api/client/v1/media/upload`

返回最低字段：

| 字段 | 必需 | 用途 | 缺失降级 |
| --- | --- | --- | --- |
| `messageId` | 是 | 将 local outgoing 收敛为 server message。 | 保留 sending/unknown，触发 refetch。 |
| `conversationSeq` | 强建议 | read cursor 和排序。 | 触发 refetch，read 降级。 |
| `sentAt` | 是 | 展示和排序。 | 使用客户端时间，标记 provisional。 |
| `body` / `media resource` | 强建议 | 服务端事实回显。 | 保留本地 body，后台 refetch。 |

### 22.4 在线客服线程列表

接口：

- `GET /api/client/v1/customer-service/workbench/threads`
- `GET /api/client/v1/customer-service/staff/service-history`

最低字段：

| 字段 | 必需 | 用途 | 缺失降级 |
| --- | --- | --- | --- |
| `threadId` | 是 | 线程主键。 | 阻断该线程。 |
| `threadType` | 是 | 区分 temp_session/im_direct。 | 不能进入客服 core。 |
| `status` | 是 | 状态机。 | 输入区禁用，记录 blocking diagnostic。 |
| `title` / `visitorName` | 否 | 展示。 | 使用“访客”。 |
| `conversationId` | 否 | 消息链路辅助。 | 仅使用 threadId。 |
| `unreadCount` | 强建议 | 客服未读。 | 使用本地增量，等待 snapshot 收敛。 |
| `lastMessagePreview` | 否 | 摘要。 | 空摘要。 |
| `lastMessageAt` | 强建议 | 排序。 | 排序降级。 |
| `source` / `channel` | 否 | 来源渠道。 | 显示未知来源，不伪造。 |

### 22.5 在线客服线程详情

接口：

- `GET /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}`
- `GET /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/profile-card`

最低字段：

| 字段 | 必需 | 用途 | 缺失降级 |
| --- | --- | --- | --- |
| `threadId` | 是 | 归属校验。 | 阻断详情合并。 |
| `threadType` | 是 | 归属校验。 | 使用请求参数兜底并记录。 |
| `status` | 是 | 输入区/动作权限。 | 输入区禁用。 |
| `messages` | 是 | 聊天详情。 | 显示空消息和错误态。 |
| `profile-card` 基础身份 | 否 | 右侧客户上下文。 | 显示空态，不造假。 |
| 临时订单/工单摘要 | 否 | 客服上下文。 | 对应区域显示空态。 |

### 22.6 Gateway 事件合同

最低要求：

| 事件 | 必需字段 | 用途 |
| --- | --- | --- |
| IM 新消息 | conversationId、messageId、messageType、body、sender、sentAt、seq 推荐 | 追加 timeline、更新摘要、计算未读。 |
| IM 已读 | conversationId、reader identity、readSeq | 更新 peer/my read cursor。 |
| 客服新消息 | threadId 或 sessionId、message、sender、sentAt | 追加客服消息、提醒。 |
| 客服状态变化 | threadId、status、threadType | 更新接待状态和输入权限。 |
| 强制退出 | eventName、reason | 清 session。 |

Gateway adapter 必须能接受历史别名字段，但输出 domain event 时字段名称稳定。

---
