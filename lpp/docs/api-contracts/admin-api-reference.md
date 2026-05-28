# 管理后台 API 字段与接口速查

> 文档校对快照：2026-05-22

适用范围：

- `/api/admin/v1/*`
- `/api/admin/v1/voicecall/*`
- `/api/admin/v1/platform/*`

主说明文档见 [admin-api.md](./admin-api.md)。
通用字段和跨模块枚举补遗见 [field-enum-reference.md](./field-enum-reference.md)。

## 1. 认证与公共资源

### 1.1 接口总览

| 端点 | 方法 | 请求字段 | 响应 `data` | 说明 |
|---|---|---|---|---|
| `/public/media/{mediaId}` | GET | 路径参数：`mediaId` | 文件流 | 只允许访问 `isPublic=true` 的媒体；无需鉴权 |
| `/media/{mediaId}` | GET | 路径参数：`mediaId` | 文件流 | 需要管理端鉴权；按当前租户限定 |
| `/auth/captcha/check` | GET | `loginName?` | `captchaRequired` | 判断是否需要图形验证码 |
| `/auth/captcha/generate` | POST | 无 | `token` `question` | 生成图形验证码题目 |
| `/auth/login` | POST | Header: `X-Tenant-Id`；Body: `loginName` `password` `deviceId?` `captchaToken?` `captchaAnswer?` | `tenantId` `tenantCode?` `userId` `displayName` `accessToken` `expiresIn` `roleCodes` `permissionCodes` `isPlatformAdministrator` | 管理端登录 |
| `/auth/select-tenant` | POST | `tenantId`；需要平台 Token | `tenantId` `tenantCode?` `tenantName?` `userId` `displayName` `accessToken` `expiresIn` `roleCodes` `permissionCodes` `isPlatformAdministrator` | 平台 Token 选择租户进入管理后台 |
| `/me` | GET | 无 | `userId` `displayName` `avatarUrl?` `mobile?` `email?` `roleCodes[]` `permissionCodes[]` | 当前管理员信息 + 权限快照 |
| `/me/password` | POST | `currentPassword` `newPassword` | `userId` `updated=true` | 当前管理员修改自己密码;成功后其它活跃 session 被撤销 |

### 1.2 关键字段

#### `AdminLoginRequest`

| 字段 | 类型 | 说明 |
|---|---|---|
| `loginName` | string | 登录名 |
| `password` | string | 密码 |
| `deviceId` | GUID? | 设备 ID |
| `captchaToken` | string? | 图形验证码 token |
| `captchaAnswer` | string? | 图形验证码答案 |
| `tenantId` | GUID? | 可选；通常通过 `X-Tenant-Id` 请求头提供 |
| `tenantCode` | string? | 可选；通常不需要传 |

#### `AdminLoginResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 当前登录的租户 ID |
| `tenantCode` | string? | 当前登录的租户编码 |
| `tenantName` | string? | 当前登录的租户名称 |
| `userId` | GUID | 管理员用户 ID |
| `displayName` | string | 显示名 |
| `accessToken` | string | 管理端访问 token |
| `expiresIn` | int | 有效秒数 |
| `roleCodes` | string[] | 当前管理员拥有的角色编码列表 |
| `permissionCodes` | string[] | 当前管理员拥有的权限编码列表 |
| `isPlatformAdministrator` | bool | 是否为平台超级管理员 |

#### 可进入管理后台的 `role_code`

`roleCodes` 中只要命中下列任一值即可进入管理后台（细粒度能力另由 `permissionCodes` 决定）。详见 [admin-api.md §1.4A](./admin-api.md)。

| `role_code` | 名称 |
|---|---|
| `platform_admin` | 平台超级管理员 |
| `tenant_owner` | 租户主账号 |
| `tenant_admin` | 租户管理员 |
| `ops_operator` | 运营运维专员 |
| `customer_service` | 客服坐席 |
| `audit_operator` | 审计合规员 |
| `config_operator` | 配置管理员 |

## 2. 租户内后台接口总览

### 2.1 仪表盘与用户

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/dashboard` | GET | 无 | `AdminDashboardDto` |
| `/dashboard/v2` | GET | 无 | `AdminDashboardV2Dto` |
| `/users` | GET | `keyword?` `status?` `userType?` `assignedStaffUserId?` | `CursorPage<AdminUserDto>` |
| `/users/{userId}` | GET | 路径参数：`userId` | `AdminUserDetailDto` |
| `/users/{userId}/customer-service/assign` | POST | `AssignCustomerServiceRequest` | `AssignCustomerServiceResultDto` |
| `/customer-service/batch-transfer` | POST | `BatchTransferCustomerServiceRequest` | `BatchTransferCustomerServiceResultDto` |
| `/users/{userId}/disable` | POST | 无 | `userId` |
| `/users/{userId}/enable` | POST | 无 | `userId` |
| `/users/{userId}/force-logout` | POST | 无 | `userId` |
| `/users/{userId}/mute` | POST | `AdminMuteUserRequest` | `userId` |
| `/users/{userId}/unmute` | POST | 无 | `userId` |
| `/users/{userId}/mute-status` | GET | 无 | `AdminUserMuteStatusDto` |
| `/users/{userId}/rate-limit` | POST | `AdminSetRateLimitRequest` | `userId` |
| `/users/{userId}/force-profile` | POST | `AdminForceProfileRequest` | `userId` |
| `/users/{userId}/note` | PUT | `AdminSetNoteRequest` | `userId` |
| `/users/{userId}/governance` | GET | 无 | `AdminUserGovernanceSummaryDto` |
| `/users/{userId}/reset-password` | POST | `ResetAdminUserPasswordRequest` | `userId` |
| `/users/{userId}/roles` | PUT | `UpdateAdminUserRolesRequest` | `userId` |
| `/users/bulk-assign-roles` | POST | `BulkAssignRolesRequest` | `BulkAssignRolesResultDto` |
| `/users/batch-disable` | POST | `BatchUserIdsRequest` | `BatchOperationResultDto` |
| `/users/batch-enable` | POST | `BatchUserIdsRequest` | `BatchOperationResultDto` |
| `/online-users` | GET | 无 | `CursorPage<AdminOnlineUserDto>` |

### 2.2 群、消息、服务账号、角色

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/groups` | GET | 无 | `CursorPage<AdminGroupDto>` |
| `/groups/{conversationId}` | GET | 路径参数：`conversationId` | `AdminGroupDetailDto` |
| `/groups/{conversationId}/disband` | POST | 无 | `conversationId` |
| `/groups/{conversationId}/members/remove` | POST | `AdminRemoveGroupMemberRequest` | `conversationId` `userId` |
| `/groups/{conversationId}/mute-member` | POST | `AdminGroupMuteMemberRequest` | `conversationId` `userId` |
| `/groups/{conversationId}/unmute-member` | POST | `AdminRemoveGroupMemberRequest` | `conversationId` `userId` |
| `/groups/{conversationId}/mute-all` | POST | `AdminGroupMuteAllRequest` | `conversationId` |
| `/groups/{conversationId}/freeze` | POST | `AdminFreezeConversationRequest` | `conversationId` |
| `/messages` | GET | `conversationId?` `senderUserId?` `keyword?` `from?` `to?` | `CursorPage<AdminMessageDto>` |
| `/messages/search` | GET | `conversationId?` `senderUserId?` `keyword?` `from?` `to?` | `CursorPage<AdminMessageDto>` |
| `/messages/{messageId}/recall` | POST | 无 | `messageId` |
| `/service-accounts` | GET | 无 | `CursorPage<AdminServiceAccountDto>` |
| `/service-accounts` | POST | `AdminCreateServiceAccountRequest` | `AdminCreateServiceAccountResponse` |
| `/service-accounts/{serviceAccountId}` | PUT | `AdminUpdateServiceAccountRequest` | `serviceAccountId` |
| `/service-accounts/{serviceAccountId}` | DELETE | 无 | `serviceAccountId` |
| `/roles` | GET | 无 | `CursorPage<AdminRoleDto>` |
| `/roles` | POST | `CreateAdminRoleRequest` | `roleId` `roleCode` |
| `/roles/{roleCode}/status` | PUT | `{ status: "active"\|"disabled" }` | `roleCode` `status` |
| `/roles/{roleCode}` | DELETE | 无 | `roleCode` |
| `/roles/{sourceRoleCode}/template-permissions` | GET | 路径参数:`sourceRoleCode` | `AdminRolePermissionConfigDto` |
| `/roles/{roleCode}/permissions` | GET | 路径参数：`roleCode` | `AdminRolePermissionConfigDto` |
| `/roles/{roleCode}/permissions` | PUT | `UpdateAdminRolePermissionsRequest` | `roleCode` |

### 2.3 Webhook、配置、审计、健康、BOT、Outbox

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/webhook-deliveries` | GET | `status?` `appCode?` `topic?` `from?` `to?` | `CursorPage<AdminWebhookDeliveryDto>` |
| `/webhook-deliveries/{deliveryId}/retry` | POST | 无 | `deliveryId` |
| `/webhook-deliveries/{deliveryId}/replay` | POST | 无 | `deliveryId` |
| `/system-configs` | GET | 无 | `CursorPage<SystemConfigItemDto>` |
| `/system-configs/{configKey}` | PUT | `UpdateSystemConfigRequest` | `configKey` |
| `/system-configs/{configKey}/history` | GET | 路径参数：`configKey` | `CursorPage<SystemConfigHistoryDto>` |
| `/system-configs/{configKey}/rollback` | POST | `RollbackSystemConfigRequest` | `configKey` |
| `/audit-logs` | GET | `actionCode?` `targetType?` `from?` `to?` | `CursorPage<AuditLogDto>` |
| `/audit-logs/action-codes` | GET | 无 | `AuditLogActionCodeDto[]` |
| `/audit-logs/stats` | GET | `from?` `to?` | `AuditLogStatsDto` |
| `/audit-logs/export` | GET | `actionCode?` `targetType?` `from?` `to?` `format?` | `{ taskId }` |
| `/service-health` | GET | 无 | `CursorPage<AdminServiceHealthDto>` |
| `/bot-apps` | GET | 无 | `CursorPage<AdminBotAppDto>` |
| `/bot-apps` | POST | `AdminCreateBotAppRequest` | `AdminCreateBotAppResponse` |
| `/bot-apps/{appId}/disable` | POST | 无 | `appId` |
| `/bot-apps/{appId}/enable` | POST | 无 | `appId` |
| `/bot-apps/{appId}/conversation-grants` | GET | 无 | `AdminBotConversationGrantDto[]` |
| `/bot-apps/{appId}/conversation-grants` | PUT | `AdminUpdateBotConversationGrantsRequest` | `appId` `updated=true` |
| `/outbox` | GET | 无 | `CursorPage<AdminOutboxItemDto>` |
| `/outbox/dead-letters/retry` | POST | 无 | `{ reset: int }`（将当前租户所有 `publishStatus=3` 死信 outbox 重置为 `publishStatus=0` + `retryCount=0` 重新投递，需要 `outbox.view` 权限） |
| `/broadcast` | POST | `AdminBroadcastRequest` | `AdminBroadcastResponse` |
| `/conversations/transfer` | POST | `TransferConversationsRequest` | `TransferConversationsResult` |

### 2.5 统一客服中心

Base URL：`/api/admin/v1/customer-service/center`

这组接口是管理后台的客服运营主入口，统一处理：

- `temp_session`：访客临时会话
- `direct_customer`：已注册客户客服线程

补充：

- 路由里的 `{threadType}` 同时兼容下划线和中划线
- 响应里的 `threadType` 固定使用 `temp_session`、`direct_customer`
- `threadId` 是统一客服线程 ID；`conversationId` 是底层会话 ID
- 推荐使用新的统一权限：`customer_service.center.view`、`customer_service.center.manage`、`customer_service.center.force_close`
- 旧的 `customer_service.temp_session.*` 仍可作为兼容权限进入部分接口，但不再建议作为新后台的主权限模型

#### 2.5.1 统一看板与线程池

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/dashboard` | GET | 无 | `CustomerServiceAdminDashboardDto` |
| `/customers/service-history` | GET | `customerUserId?` `visitorUserId?` `customerId?` `limit?` `cursor?`（前三者择一） | `{ items[], nextCursor }`，`items` 含 `threadType`(`temp_session`/`direct`) `threadId` `staffUserId?` `status` `startedAt?` `firstResponseAt?` `closedAt?` `riskLevel` 等；与客户端同名接口一致 |
| `/staff/{staffUserId}/service-history` | GET | `threadType?`(`temp_session`/`im_direct`) `status?` `limit?` `cursor?` | `{ items[], nextCursor }`，`items` 字段同上并额外带 `participation`(`current_owner`/`transferred`) | 按**接待人**聚合指定客服"曾参与"的跨频道历史会话(当前归属或转接历史 from/to)；权限 `customer_service.center.view`/`customer_service.temp_session.view`；客户端本人自查见 [client-api.md §12.11A1b](./client-api.md) |

### 2.5+ 客服主动群发

> 自 2026-05-22 起新增。Base URL：`/api/admin/v1/customer-service/broadcasts`。全部需 `customer_service.broadcast.send` 权限。详见 `admin-api.md` §3.2A+。

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/preview` | POST | `targetType`(1/2/3)、`groupId?` | `recipientCount`、`groupTitle?`、`sampleDisplayNames[]` |
| `/` | POST | `targetType`、`groupId?`、`messageType`、`body` | `taskId`、`status`、`totalCount` |
| `/` | GET | `mine?`、`limit?` | `{ items: 任务列表项[] }` |
| `/{taskId}` | GET | `failedLimit?` | 任务详情 + `failedRecipients[]` |
| `/{taskId}/retry-failed` | POST | 无 | `taskId`、`requeuedCount` |

- `targetType`：`1`=全租户成员逐人私聊；`2`=某群成员逐人私聊；`3`=某群群内群发一条。
- 任务 `status`：`0`=待投递 `1`=投递中 `2`=已完成 `3`=失败。投递异步进行，提交后轮询任务详情看进度。
- 群目标只能选发起人本人是成员的群（否则 `403 CS_BROADCAST_GROUP_FORBIDDEN`）。
- 发出不可撤回；文本过敏感词审核；频率超限返回 `429 CS_BROADCAST_RATE_LIMITED`。

### 2.5++ 2026-05-23 服务端补全(客户/会话管理、企业群发、客户端错误、反馈、线程冻结、综合卡片、公告已读)

> 自 2026-05-23 起新增。分页响应统一 `PagedResult<T>`(`items[]`/`page`/`pageSize`/`total`/`hasMore`)。详见 `admin-api.md` §3.2A++。

| 端点 | 方法 | 权限 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|---|
| `/customer-management/summary` | GET | `customer_service.customer.view` | 无 | `totalCustomers`、`assignedCount`、`unassignedCount`、`assignedByStaff[]` |
| `/customer-management/customers` | GET | `customer_service.customer.view` | `assignment`(assigned/unassigned/all)、`staffUserId?`、`keyword?`、`sortBy?`、`page?`、`pageSize?` | `PagedResult<CustomerManagementItem>` |
| `/conversation-management/summary` | GET | `conversation.admin.view` | 无 | `directCount`、`groupCount`、`tempSessionCount`、`frozenCount`、`serviceConversationCount`、`activeLast24h` |
| `/conversation-management/conversations` | GET | `conversation.admin.view` | `type?`、`frozen?`、`serviceOnly?`、`keyword?`、`page?`、`pageSize?` | `PagedResult<AdminConversationItem>` |
| `/enterprise-broadcasts/preview` | POST | `enterprise_broadcast.send` | `targetType`(1全体/2员工/3客户/4官方群)、`groupId?` | `recipientCount`、`sampleDisplayNames[]`、`sampleGroupTitles[]`、`sender` |
| `/enterprise-broadcasts` | POST | `enterprise_broadcast.send` | `targetType`、`groupId?`、`officialAccountId?`、`messageType`、`body`、`auditReason?` | `taskId`、`status`、`totalCount` |
| `/enterprise-broadcasts` | GET | `enterprise_broadcast.send` | `limit?` | `{ items: 任务列表项[] }` |
| `/enterprise-broadcasts/{taskId}` | GET | `enterprise_broadcast.send` | 无 | 详情 + `sender` + `operator` + `failedRecipients[]` |
| `/enterprise-broadcasts/{taskId}/retry-failed` | POST | `enterprise_broadcast.send` | 无 | `taskId`、`requeuedCount` |
| `/enterprise-broadcasts/{taskId}/cancel` | POST | `enterprise_broadcast.send` | 无 | `taskId`、`status`、`canceledCount` |
| `/client-errors/` | GET | `client_error.view` | `status?`、`platform?`、`errorType?`、`errorLevel?`、`appVersion?`、`keyword?`、`from?`、`to?`、`page?`、`pageSize?` | `PagedResult<ClientErrorItem>` |
| `/client-errors/stats` | GET | `client_error.view` | `lookbackDays?` | 聚类/次数/各状态计数 + `byPlatform[]`/`byErrorType[]`/`byAppVersion[]` |
| `/client-errors/{errorId}` | GET | `client_error.view` | 无 | `ClientErrorItem` |
| `/client-errors/{errorId}/status` | POST | `client_error.manage` | `status`(0..3)、`note?` | `ClientErrorItem` |
| `/feedbacks/` | GET | `feedback.view` | `type?`、`status?`、`keyword?`、`from?`、`to?`、`page?`、`pageSize?` | `PagedResult<FeedbackItem>` |
| `/feedbacks/{feedbackId}` | GET | `feedback.view` | 无 | `FeedbackItem` |
| `/feedbacks/{feedbackId}/status` | POST | `feedback.manage` | `status`、`note?` | `FeedbackItem` |
| `/customer-service/center/threads/{threadType}/{threadId}/freeze` | POST | `customer_service.center.freeze` | `reason?` | `{threadType,threadId,frozen:true}` |
| `/customer-service/center/threads/{threadType}/{threadId}/unfreeze` | POST | `customer_service.center.freeze` | 无 | `{threadType,threadId,frozen:false}` |
| `/customer-service/center/customers/{customerUserId}/profile-card` | GET | `customer_service.center.view` / `customer_service.customer.view` | 无 | 客户综合卡片(资料/归属/风险/隐私/`tabCounts`/`externalSections[]`) |
| `/announcements/{announcementId}/read-stats` | GET | `announcement.manage` | `page?`、`pageSize?` | `totalRecipients`、`readCount`、`unreadCount`、`readers`(分页) |

- 新权限码:`customer_service.customer.view`、`conversation.admin.view`、`enterprise_broadcast.send`、`client_error.view`、`client_error.manage`、`feedback.view`、`feedback.manage`、`customer_service.center.freeze`。默认授予:前述只读/治理类给 owner/admin/ops(客户管理只读另给 customer_service);企业群发仅 owner/admin。
- 企业群发缺官方账号:`ENTERPRISE_OFFICIAL_ACCOUNT_MISSING`(404)。
- 工作台 `workbench/threads` 线程项新增 `isVip`/`customerLevel`/`priority`/`tags`,响应增 `summary{allCount,queuedCount,activeCount,vipCount}`。

### 2.5A 客服快捷回复

Base URL：`/api/admin/v1/customer-service`

快捷回复是租户级客服话术库，对统一客服工作台生效；`scope=all` 同时适用于访客临时会话和 IM 客户线程，`temp_session` / `direct_customer` 可限制只在对应场景展示。旧的 `/customer-service/temp-sessions/quick-replies` 仅作为读取兼容入口保留。

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/quick-replies` | GET | `scope?=all/temp_session/direct_customer` `includeDisabled?` | `CustomerServiceQuickReplyDto[]` |
| `/quick-replies` | POST | `scope` `locale` `category` `title` `content` `tags?` `sortOrder?` `enabled?` | `CustomerServiceQuickReplyDto` |
| `/quick-replies/{quickReplyId}` | PUT | 同 POST | `CustomerServiceQuickReplyDto` |
| `/quick-replies/{quickReplyId}/enabled` | POST | `enabled` | `CustomerServiceQuickReplyDto` |
| `/quick-replies/reorder` | POST | `items: [{ quickReplyId, sortOrder }]` | `updated` |
| `/quick-replies/{quickReplyId}` | DELETE | 无 | `quickReplyId` |
| `/staff-statuses` | GET | 无 | `TempStaffStatusDto[]` |
| `/threads` | GET | `keyword?` `threadType?` `status?` `assignedStaffUserId?` `locale?` | `CustomerServiceAdminThreadsDto` |
| `/threads/{threadType}/{threadId}` | GET | 路径参数：`threadType` `threadId` | `CustomerServiceThreadDetailDto` |
| `/threads/{threadType}/{threadId}/assign` | POST | `CustomerServiceAdminAssignThreadRequest` | `CustomerServiceThreadDetailDto` |
| `/threads/{threadType}/{threadId}/force-close` | POST | 无 | `threadType` `threadId` |
| `/threads/{threadType}/{threadId}/rating` | GET | 无 | `CustomerServiceThreadRatingDto` |
| `/threads/{threadType}/{threadId}/quality-checks` | GET | 无 | `CustomerServiceThreadQualityCheckDto[]` |
| `/threads/{threadType}/{threadId}/quality-checks` | POST | `{ score, tags?, comment? }` | `CustomerServiceThreadQualityCheckDto` |
| `/threads/{threadType}/{threadId}/transfers` | GET | 无 | `CustomerServiceThreadTransferDto[]` |
| `/im-direct/threads` | GET | `keyword?` `status?` `assignedStaffUserId?` `unassignedOnly?` `cursor?` | `CursorPage<CustomerServiceDirectThreadListItemDto>` |
| `/config` | GET | 无 | `CustomerServiceConfigModel` |
| `/config` | PUT | `CustomerServiceConfigModel` | `updated=true` |
| `/widget/config` | GET | 无 | `WidgetConfigModel` |
| `/widget/config` | PUT | `WidgetConfigModel` | `updated=true` |

`CustomerServiceQuickReplyDto`(完整字段):

| 字段 | 类型 | 说明 |
|---|---|---|
| `quickReplyId` | GUID | 快捷回复 ID |
| `scope` | string | `all` / `temp_session` / `direct_customer` |
| `locale` | string | 语言 |
| `category` | string | 分类标签 |
| `title` | string | 标题 |
| `content` | string | 正文 |
| `tags` | string[] | 标签列表 |
| `sortOrder` | int | 排序权重 |
| `enabled` | bool | 是否启用 |
| `createdAt` | DateTimeOffset | 创建时间 |
| `updatedAt` | DateTimeOffset | 更新时间 |

### 2.5B AI 服务配置中心

Base URL:`/api/admin/v1/ai-service`

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` | 响应壳 |
|---|---|---|---|---|
| `/config` | GET | 无(需 `ai_service.config.manage`) | `AiServiceConfigModel` | 标准壳 |
| `/config` | PUT | `AiServiceConfigModel`(需 `ai_service.config.manage`) | `updated=true` | 标准壳 |
| `/config/probe` | POST | `AiServiceProbeRequest`(需 `ai_service.config.manage`) | `AiServiceProbeResultDto` | 标准壳 |
| `/config/probe/stream` | POST | `AiServiceProbeRequest`(需 `ai_service.config.manage`) | SSE 流 | `text/event-stream` |
| `/usage?month=YYYY-MM` | GET | `month`(需 `ai_service.config.manage`) | `AiServiceUsageDto` | 标准壳 |
| `/circuit` | GET | 无(需 `ai_service.config.manage`) | `AiServiceCircuitStatusDto` | 标准壳 |
| `/audits` | GET | `from?` `to?` `sessionRef?` `provider?` `feature?` `successOnly?` `limit?` | `AiServiceAuditDto[]` | 标准壳 |
| `/audits/{auditId}` | GET | 路径参数:`auditId` | `AiServiceAuditDto` | 标准壳 |
| `/providers` | GET | 无 | provider preset 数组 | **`{ success, data }`,非标准壳** |
| `/embedding-models` | GET | 无 | embedding preset 数组 | **`{ success, data }`,非标准壳** |
| `/reranker-models` | GET | 无 | reranker preset 数组 | **`{ success, data }`,非标准壳** |
| `/rag-fusion-strategies` | GET | 无 | 策略 preset 数组 | **`{ success, data }`,非标准壳** |

完整字段表和 SSE 流细节见 [admin-api.md §3.2Q](./admin-api.md#32q-ai-服务配置中心)。

`AiServiceProbeRequest`:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `config` | `AiServiceConfigModel?` | 否 | 临时探测用配置;不传则使用当前已保存配置 |
| `prompt` | string? | 否 | 测试提示词 |

注:本字段命名(`config`)与旧的 `TempSessionAiProbeRequest`(`ai`)不同,两个端点请求体不能互换。

`RagFusionStrategy` 取值:

| 值 | 说明 |
|---|---|
| `rrf` | RRF(默认):向量 + 词法 rank 数学合并 |
| `reranker` | 纯 reranker:双源候选合并后由 reranker 重排 |
| `hybrid` | Hybrid(推荐):RRF 粗筛 → reranker 精排 |

`CustomerServiceAdminDashboardDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `queuedTempCount` | int | 排队中的访客会话数 |
| `queuedDirectCount` | int | 排队中的注册客户线程数 |
| `queuedTotalCount` | int | 排队线程总数 |
| `activeTempCount` | int | 当前租户内活跃访客会话数 |
| `activeDirectCount` | int | 当前租户内活跃注册客户线程数 |
| `totalActiveCount` | int | 当前租户内活跃线程总数 |
| `onlineStaffCount` | int | 可服务客服数 |
| `busyStaffCount` | int | 忙碌客服数 |

`CustomerServiceAdminThreadsDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `queueItems` | `CustomerServiceThreadListItemDto[]` | 排队线程列表 |
| `activeItems` | `CustomerServiceThreadListItemDto[]` | 活跃线程列表 |

`CustomerServiceAdminAssignThreadRequest`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `staffUserId` | GUID | 是 | 目标客服用户 ID |

`CustomerServiceThreadListItemDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `threadType` | string | `temp_session` 或 `direct_customer` |
| `threadId` | GUID | 统一客服线程 ID |
| `conversationId` | GUID | 底层会话 ID |
| `status` | string | 当前线程状态；统一后台当前主要暴露 `queued` / `active` |
| `title` | string | 访客名或客户显示名 |
| `avatarUrl` | string? | 头像 |
| `customerUserId` | GUID? | 注册客户用户 ID |
| `visitorId` | GUID? | 访客 ID |
| `peerUserId` | GUID? | 对端用户 ID |
| `assignedStaffUserId` | GUID? | 当前负责客服用户 ID |
| `assignedStaffDisplayName` | string? | 当前负责客服显示名 |
| `lastMessageType` | string? | 最后一条消息类型 |
| `lastMessagePreview` | string? | 最后一条消息预览 |
| `lastMessageAt` | DateTimeOffset? | 最后一条消息时间 |
| `unreadCount` | int | 客服视角未读数 |
| `updatedAt` | DateTimeOffset | 线程更新时间 |
| `assignedAt` | DateTimeOffset? | 当前归属建立时间 |
| `queuePosition` | int? | 排队位置 |
| `estimatedWaitSeconds` | int? | 预计等待秒数 |

`CustomerServiceThreadDetailDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `threadType` | string | `temp_session` 或 `direct_customer` |
| `threadId` | GUID | 统一客服线程 ID |
| `conversationId` | GUID | 底层会话 ID |
| `status` | string | 线程状态 |
| `title` | string | 访客名或客户显示名 |
| `avatarUrl` | string? | 头像 |
| `customerUserId` | GUID? | 注册客户用户 ID |
| `visitorId` | GUID? | 访客 ID |
| `peerUserId` | GUID? | 对端用户 ID |
| `assignedStaffUserId` | GUID? | 当前负责客服 |
| `assignedStaffDisplayName` | string? | 当前负责客服显示名 |
| `assignedAt` | DateTimeOffset? | 当前归属建立时间 |
| `tempSession` | `TempSessionDetailDto?` | `temp_session` 详情对象 |
| `directChat` | `CustomerServiceDirectThreadDetailDto?` | `direct_customer` 详情对象 |

`CustomerServiceDirectThreadDetailDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `chatId` | GUID | 当前承载该线程的实际直聊会话 ID |
| `customerUserId` | GUID | 客户用户 ID |
| `customerDisplayName` | string | 客户显示名 |
| `customerAvatarUrl` | string? | 客户头像 |
| `isPinned` | bool | 当前客服是否已置顶该直聊 |
| `isMuted` | bool | 当前客服是否已免打扰 |
| `lastReadSeq` | long | 当前客服已读到的序号 |
| `lastMessageSeq` | long | 当前直聊最新消息序号 |
| `unreadCount` | int | 当前客服未读数 |
| `assignedAt` | DateTimeOffset | 当前客服接手时间 |
| `messages` | `MessageItemDto[]` | 最近消息列表 |

#### 2.5.2 客服状态的共享语义

统一后台的 `staff-statuses` 当前仍复用 `TempStaffStatusDto`，但语义已经是共享客服中心状态，不再只统计访客临时会话。

`TempStaffStatusDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID | 客服用户 ID |
| `displayName` | string | 显示名 |
| `serviceStatus` | string | 服务状态 |
| `maxConcurrentSessions` | int | 最大并发线程数 |
| `reservedSessionCount` | int | 当前预留线程数 |
| `activeSessionCount` | int | 当前活跃线程数；共享统计 temp + direct |
| `queueAcceptEnabled` | bool | 是否接受自动分配 / 排队线程 |
| `lastAssignedAt` | DateTimeOffset? | 最后分配时间 |
| `lastOnlineAt` | DateTimeOffset? | 最后上线时间 |
| `locales` | string[] | 支持的语言列表 |
| `skillGroups` | string[] | 所属技能组列表 |

### 2.6 临时会话域与兼容接口

Base URL：`/api/admin/v1/customer-service/temp-sessions`

这组接口仍然保留，但现在更适合描述为：

- 访客临时会话专属治理面
- AI / Widget / 知识库 / 敏感词 / 黑名单等 temp 域配置面
- 旧后台与旧运营工具的兼容入口

#### 2.6.1 临时会话运营与兼容动作

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/dashboard` | GET | 无 | `TempSessionDashboardDto`(`queuedCount` `activeCount` `assistingCount` `aiServingCount` `humanServingCount` `onlineStaffCount` `busyStaffCount` `awayStaffCount` `breakStaffCount` `todaySessions` `todayServed` `todayAbandoned` `avgWaitSeconds` `avgDurationSeconds` `avgRating`) |
| `/` | GET | `keyword?` `status?` `assignedStaffUserId?` `locale?` | `TempSessionAdminListItemDto[]` |
| `/{sessionId}` | GET | 路径参数：`sessionId` | `TempSessionDetailDto` |
| `/{sessionId}/claim` | POST | 无 | `TempSessionDetailDto` |
| `/{sessionId}/takeover` | POST | 无 | `TempSessionDetailDto` |
| `/{sessionId}/resume-ai` | POST | 无 | `TempSessionDetailDto` |
| `/{sessionId}/messages` | POST | `TempSessionAdminSendMessageRequest` | `TempSessionMessageDto` |
| `/{sessionId}/close` | POST | 无 | `sessionId` |
| `/{sessionId}/force-close` | POST | 无 | `sessionId` |
| `/stats` | GET | 无 | `TempSessionStatsDto` |

`TempSessionAdminSendMessageRequest`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `clientMsgId` | string | 是 | 客户端幂等消息 ID |
| `messageType` | string | 是 | 消息类型 |
| `body` | object | 是 | 消息正文 |
| `interventionReason` | string? | 条件必填 | 调用者非当前归属客服但具有管理员介入权限时必填;否则可省 |

#### 2.6.2 访客管理

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/visitors` | GET | `keyword?` `locale?` `linkedOnly?` | `TempVisitorListItemDto[]` |
| `/visitors/{visitorId}` | GET | 路径参数：`visitorId` | `TempVisitorDetailDto` |

#### 2.6.3 客服状态维护

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/staff-statuses` | GET | 无 | `TempStaffStatusDto[]` |
| `/staff-statuses/{staffUserId}` | PUT | `UpdateTempSessionStaffStatusRequest` | `TempStaffStatusDto` |
| `/staff-statuses/{staffUserId}/force-offline` | POST | 无 | `staffUserId` |
| `/staff-statuses/{staffUserId}/reset-load` | POST | 无 | `staffUserId` |

#### 2.6.4 自动回复与快捷回复

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/auto-replies` | GET | 无 | 自动回复规则列表 |
| `/quick-replies` | GET | 无 | 快捷回复列表（兼容旧入口；新配置请使用 `/api/admin/v1/customer-service/quick-replies`） |
| `/skill-groups` | GET | 无 | 技能组列表 |

#### 2.6.5 黑名单

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/blacklist` | GET | 无 | 黑名单列表 |
| `/blacklist` | POST | `CreateTempBlacklistRequest` | 黑名单条目 |
| `/blacklist/{blacklistId}` | DELETE | 路径参数：`blacklistId` | `blacklistId` |

`CreateTempBlacklistRequest`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `targetType` | short | 是 | 目标类型 |
| `targetValue` | string | 是 | 目标值（IP、指纹等） |
| `reason` | string? | 否 | 拉黑原因 |
| `expiresAt` | DateTimeOffset? | 否 | 过期时间 |

#### 2.6.6 敏感词

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/sensitive-words` | GET | 无 | 敏感词列表 |
| `/sensitive-words` | POST | `CreateTempSensitiveWordRequest` | 敏感词条目 |
| `/sensitive-words/{wordId}` | DELETE | 路径参数：`wordId` | `wordId` |

`CreateTempSensitiveWordRequest`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `locale` | string | 是 | 语言标识 |
| `wordText` | string | 是 | 敏感词文本 |
| `actionMode` | short | 是 | 处理模式 |

#### 2.6.7 知识库

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/knowledge-bases` | GET | 无 | `TempSessionKnowledgeBaseDto[]` |
| `/knowledge-bases` | POST | `TempSessionKnowledgeBaseUpsertRequest` | `TempSessionKnowledgeBaseDto` |
| `/knowledge-bases/{knowledgeBaseId}` | PUT | `TempSessionKnowledgeBaseUpsertRequest` | `TempSessionKnowledgeBaseDto` |
| `/knowledge-bases/{knowledgeBaseId}` | DELETE | 无 | `knowledgeBaseId` |
| `/knowledge-bases/{knowledgeBaseId}/rebuild` | POST | 无 | `knowledgeBaseId` `queued=true` |
| `/knowledge-bases/{knowledgeBaseId}/documents` | GET | 无 | `TempSessionKnowledgeDocumentDto[]` |
| `/knowledge-bases/{knowledgeBaseId}/documents` | POST | `TempSessionKnowledgeDocumentUpsertRequest` | `TempSessionKnowledgeDocumentDto` |
| `/knowledge-bases/{knowledgeBaseId}/documents/import` | POST | `multipart/form-data`：`file` + `title?` `summary?` `isEnabled?` | `TempSessionKnowledgeDocumentDto` |
| `/knowledge-bases/{knowledgeBaseId}/documents/{documentId}` | PUT | `TempSessionKnowledgeDocumentUpsertRequest` | `TempSessionKnowledgeDocumentDto` |
| `/knowledge-bases/{knowledgeBaseId}/documents/{documentId}` | DELETE | 无 | `knowledgeBaseId` `documentId` |

`TempSessionKnowledgeBaseUpsertRequest`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | 是 | 知识库名称 |
| `description` | string? | 否 | 描述 |
| `isEnabled` | bool | 否 | 是否启用，默认 `true` |

`TempSessionKnowledgeDocumentUpsertRequest`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 是 | 文档标题 |
| `summary` | string? | 否 | 摘要 |
| `content` | string | 是 | 文档内容 |
| `isEnabled` | bool | 否 | 是否启用，默认 `true` |

`TempSessionKnowledgeBaseDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |
| `name` | string | 名称 |
| `description` | string? | 描述 |
| `isEnabled` | bool | 是否启用 |
| `buildStatus` | string | 构建状态：`queued`、`processing`、`ready`、`failed` |
| `lastBuildError` | string? | 最后构建错误 |
| `documentCount` | int | 文档数 |
| `chunkCount` | int | 分块数 |
| `lastBuiltAt` | DateTimeOffset? | 最后构建时间 |
| `createdAt` | DateTimeOffset | 创建时间 |
| `updatedAt` | DateTimeOffset | 更新时间 |

`TempSessionKnowledgeDocumentDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `documentId` | GUID | 文档 ID |
| `knowledgeBaseId` | GUID | 所属知识库 ID |
| `title` | string | 标题 |
| `summary` | string? | 摘要 |
| `content` | string | 内容 |
| `sourceType` | string | 来源类型：`manual`、文件导入等 |
| `sourceFileName` | string? | 来源文件名 |
| `buildStatus` | string | 构建状态 |
| `lastBuildError` | string? | 最后构建错误 |
| `isEnabled` | bool | 是否启用 |
| `chunkCount` | int | 分块数 |
| `lastBuiltAt` | DateTimeOffset? | 最后构建时间 |
| `createdAt` | DateTimeOffset | 创建时间 |
| `updatedAt` | DateTimeOffset | 更新时间 |

#### 2.6.8 配置与 AI

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/config` | GET | 无 | `TempSessionConfigModel` |
| `/config` | PUT | `TempSessionConfigModel` | `updated=true` |
| `/config/ai/probe` | POST | `TempSessionAiProbeRequest` | `TempSessionAiProviderProbeResultDto` |
| `/widget/test-url` | GET | 无 | `url` |

`TempSessionAiProbeRequest`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `ai` | object? | 否 | AI 配置对象，不传则使用当前配置 |
| `prompt` | string? | 否 | 测试提示词 |

`TempSessionAiProviderProbeResultDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | bool | 是否成功 |
| `provider` | string | 服务商 |
| `model` | string | 模型 |
| `statusCode` | int? | HTTP 状态码 |
| `message` | string | 结果消息 |
| `replyPreview` | string? | 回复预览 |
| `latencyMs` | int | 延迟毫秒 |
| `inputTokens` | int? | 输入 token 数 |
| `outputTokens` | int? | 输出 token 数 |
| `totalTokens` | int? | 总 token 数 |
| `estimatedCostUsd` | decimal? | 预估费用 |

#### 2.6.9 临时会话关键 DTO

`TempSessionAdminListItemDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 会话 ID |
| `conversationId` | GUID | 底层会话 ID |
| `status` | string | 会话状态 |
| `visitorId` | GUID | 访客 ID |
| `visitorName` | string | 访客名称 |
| `customerId` | string? | 外部客户 ID |
| `locale` | string | 语言 |
| `category` | string? | 分类 |
| `sourceChannel` | string | 来源渠道 |
| `currentOwnerStaffUserId` | GUID? | 当前负责客服 ID |
| `currentOwnerStaffDisplayName` | string? | 当前负责客服显示名 |
| `currentResponderType` | string | 当前响应者类型 |
| `currentResponderDisplayName` | string? | 当前响应者显示名 |
| `ai` | object? | AI 客服信息 |
| `queuePosition` | int? | 排队位置 |
| `estimatedWaitSeconds` | int? | 预计等待秒数 |
| `priority` | string | 优先级 |
| `visitorMessageCount` | int | 访客消息数 |
| `staffMessageCount` | int | 客服消息数 |
| `createdAt` | DateTimeOffset | 创建时间 |
| `lastMessageAt` | DateTimeOffset? | 最后消息时间 |

`TempVisitorListItemDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `visitorId` | GUID | 访客 ID |
| `visitorName` | string | 访客名称 |
| `customerId` | string? | 外部客户 ID |
| `customerName` | string? | 外部客户名称 |
| `locale` | string | 语言 |
| `sourceChannel` | string | 来源渠道 |
| `linkedUserId` | GUID? | 关联的租户用户 ID |
| `totalSessions` | int | 总会话数 |
| `lastPrimaryStaffDisplayName` | string? | 最后负责客服显示名 |
| `firstVisitAt` | DateTimeOffset | 首次访问时间 |
| `lastVisitAt` | DateTimeOffset | 最后访问时间 |

`TempVisitorDetailDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `visitor` | `TempVisitorListItemDto` | 访客基本信息 |
| `fingerprint` | string? | 浏览器指纹 |
| `visitorMobile` | string? | 手机号 |
| `visitorEmail` | string? | 邮箱 |
| `sourceUrl` | string? | 来源 URL |
| `from` | string? | 来源标签 |
| `ref` | string? | 引荐标签 |
| `ipMasked` | string? | 脱敏 IP |
| `userAgent` | string? | UA |
| `metadata` | object? | 自定义扩展数据 |
| `sessions` | `TempSessionAdminListItemDto[]` | 该访客的会话列表 |

`TempSessionStatsDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalSessions` | int | 总会话数 |
| `totalQueued` | int | 总排队数 |
| `totalServed` | int | 总服务数 |
| `totalAbandoned` | int | 总放弃数 |
| `avgWaitSeconds` | int | 平均等待秒数 |
| `avgFirstResponseSeconds` | int | 平均首次响应秒数 |
| `avgDurationSeconds` | int | 平均时长秒数 |
| `avgRating` | decimal | 平均评分 |
| `aiServedSessions` | int | AI 服务会话数 |
| `aiHandoffSessions` | int | AI 转人工会话数 |
| `aiResolvedSessions` | int | AI 解决会话数 |
| `aiMessageCount` | int | AI 消息数 |
| `failedAiJobs` | int | 失败的 AI 任务数 |
| `avgAiLatencyMs` | int | AI 平均延迟毫秒 |
| `aiEstimatedCostUsd` | decimal | AI 预估费用 |
| `sessionTrend` | array | 会话趋势 |
| `channelDistribution` | array | 渠道分布 |
| `categoryDistribution` | array | 分类分布 |
| `localeDistribution` | array | 语言分布 |
| `staffPerformance` | array | 客服绩效 |

#### 2.6.10 临时会话枚举

会话状态：

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `created` | 已创建 |
| `1` | `queued` | 排队中 |
| `2` | `active` | 活跃 |
| `3` | `assisting` | 协助中 |
| `4` | `transfer_pending` | 转接中 |
| `5` | `closed_by_visitor` | 访客关闭 |
| `6` | `closed_by_staff` | 客服关闭 |
| `7` | `closed_timeout` | 超时关闭 |
| `8` | `closed_system` | 系统关闭 |
| `9` | `archived` | 已归档 |

AI 服务状态：

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `inactive` | 未启用 |
| `1` | `bot_active` | AI 接管中 |
| `2` | `handoff_pending` | 转人工待处理 |
| `3` | `human_serving` | 人工服务中 |

客服在线状态：

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `offline` | 离线 |
| `1` | `online` | 在线 |
| `2` | `busy` | 忙碌 |
| `3` | `break` | 休息中 |

参与者角色：

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `visitor` | 访客 |
| `1` | `primary_staff` | 主客服 |
| `2` | `assist_staff` | 协助客服 |
| `3` | `ai_bot` | AI 机器人 |

知识库构建状态：

| 值 | 说明 |
|---|---|
| `queued` | 排队中 |
| `processing` | 构建中 |
| `ready` | 就绪 |
| `failed` | 失败 |

### 2.7 验证码与验证设置

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/verification-codes` | GET | `identifier?` `limit?` | `AdminVerificationCodeDto[]` |
| `/verification-settings` | GET | 无 | `AdminVerificationSettingsDto` |
| `/verification-settings` | PUT | `UpdateVerificationSettingsRequest` | `updated=true` |

`UpdateVerificationSettingsRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `smsRequired` | bool? | 是否强制短信验证码 |
| `emailRequired` | bool? | 是否强制邮件验证码 |
| `smsEnabled` | bool? | 是否启用短信能力 |
| `emailEnabled` | bool? | 是否启用邮件能力 |
| `smsSname` | string? | 短信服务商账号 |
| `smsSpwd` | string? | 短信服务商密码（**仅 PUT 写入；GET 读取恒为 null**） |
| `smsSprdid` | string? | 短信服务商产品 |
| `smsSign` | string? | 短信签名 |
| `emailApiKey` | string? | 邮件 API Key（**仅 PUT 写入；GET 读取恒为 null**） |
| `emailSender` | string? | 发件地址 |
| `emailSenderName` | string? | 发件人名称 |

`AdminVerificationSettingsDto`（敏感字段脱敏读出）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `smsRequired` | bool | 是否强制短信验证码 |
| `emailRequired` | bool | 是否强制邮件验证码 |
| `smsEnabled` | bool | 是否启用短信能力 |
| `emailEnabled` | bool | 是否启用邮件能力 |
| `smsSname` | string? | 短信服务商账号 |
| `smsSpwd` | string? | **恒为 null**（明文不再回读，见 `smsSpwdPreview`/`hasSmsSpwd`） |
| `smsSpwdPreview` | string? | 短信密码脱敏预览（末 4 位可见） |
| `hasSmsSpwd` | bool | 是否已配置短信密码 |
| `smsSprdid` | string? | 短信服务商产品 |
| `smsSign` | string? | 短信签名 |
| `smsProvider` | string? | 当前生效短信提供商名 |
| `emailApiKey` | string? | **恒为 null**（明文不再回读，见 `emailApiKeyPreview`/`hasEmailApiKey`） |
| `emailApiKeyPreview` | string? | 邮件 API Key 脱敏预览（末 4 位可见） |
| `hasEmailApiKey` | bool | 是否已配置邮件 API Key |
| `emailSender` | string? | 发件地址 |
| `emailSenderName` | string? | 发件人名称 |
| `emailProvider` | string? | 当前生效邮件提供商名 |

说明：
- 前端渲染输入框时应把 `smsSpwdPreview` / `emailApiKeyPreview` 作为 `placeholder`，用户留空提交时应从请求体中剔除对应字段，语义为"保持原值不修改"。
- 写入仍通过 `PUT /verification-settings`，`UpdateVerificationSettingsRequest.smsSpwd` / `emailApiKey` 传明文。

### 2.7+ 其它租户后台端点(媒体 / 告警 / 通知 / 公告 / 登录日志 / 导出)

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/media/upload` | POST | `multipart/form-data`,文件字段名 `file` | `mediaId` `mediaKind` `url` `relativePath` `fileName` `mimeType` `sizeBytes` `thumbnailUrl` |
| `/alert-rules` | GET | 无 | `AlertRuleDto[]` |
| `/alert-rules` | POST | `CreateAlertRuleRequest` | `ruleId` |
| `/alert-rules/{ruleId}` | PUT | `UpdateAlertRuleRequest` | `ruleId` |
| `/alert-rules/{ruleId}` | DELETE | 无 | `ruleId` |
| `/alert-history` | GET | `severity?` `status?` `from?` `to?` | `AlertHistoryDto[]` |
| `/alert-history/{alertId}/acknowledge` | POST | 无 | `alertId` |
| `/alert-history/{alertId}/silence` | POST | `SilenceAlertRequest` | `alertId` |
| `/notify-channels` | GET | 无 | `NotifyChannelDto[]` |
| `/notify-channels` | POST | `CreateNotifyChannelRequest` | `channelId` |
| `/notify-channels/{channelId}` | PUT | `UpdateNotifyChannelRequest` | `channelId` |
| `/notify-channels/{channelId}` | DELETE | 无 | `channelId` |
| `/notify-channels/{channelId}/test` | POST | 无 | `channelId` `sent=true` |
| `/announcements` | GET | 无 | `AnnouncementDto[]` |
| `/announcements` | POST | `CreateAnnouncementRequest` | `announcementId` |
| `/announcements/{announcementId}` | PUT | `UpdateAnnouncementRequest` | `announcementId` |
| `/announcements/{announcementId}/publish` | POST | 无 | `announcementId` |
| `/announcements/{announcementId}/archive` | POST | 无 | `announcementId` |
| `/admin-login-logs` | GET | `userId?` `result?` `from?` `to?` | `AdminLoginLogDto[]` |
| `/admin-login-logs/insights` | GET | `from?` `to?` | `AdminLoginLogInsightsDto` |
| `/export-tasks` | GET | 无 | `ExportTaskDto[]` |
| `/export-tasks` | POST | `CreateExportTaskRequest` | `taskId` |
| `/export-tasks/{taskId}/download` | GET | 路径参数：`taskId` | 文件流 |

## 3. 音视频管理接口总览

Base URL：`/api/admin/v1/voicecall`

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/nodes` | GET | 无(需 `voicecall.view`) | `MediaRelayNodeDto[]` |
| `/nodes/configs` | GET | 无(需 `voicecall.view`) | `MediaRelayNodeConfigDto[]`(仅含已配置覆盖的节点) |
| `/nodes/{nodeId}/calls` | GET | 路径参数:`nodeId`(需 `voicecall.view`) | `CallSessionDto[]` |
| `/nodes/{nodeId}/maintenance` | PUT | `SetMaintenanceModeRequest`(需 `voicecall.manage_nodes`) | `nodeId` `enabled` |
| `/nodes/{nodeId}/advertised-ip` | PUT | `UpsertNodeAdvertisedIpRequest`(需 `voicecall.manage_nodes`;`advertisedIp` 留空=删除该节点覆盖,改回部署默认值) | `MediaRelayNodeConfigDto` |
| `/codec/opus` | GET | 无(需 `voicecall.view`) | `OpusCodecConfigDto` |
| `/codec/opus` | PUT | `OpusCodecConfigDto`(需 `voicecall.manage_nodes`;仅对新通话生效,~30s 内各节点生效) | `OpusCodecConfigDto` |
| `/sessions` | GET | `from?` `to?` `callerUserId?` `calleeUserId?` `state?` `cursor?` `pageSize?`(需 `voicecall.view`) | `CursorPage<CallSessionDto>`(`{ items, nextCursor }`) |
| `/sessions/active` | GET | 无(需 `voicecall.view`) | `CallSessionDto[]` |
| `/sessions/{callId}` | GET | 路径参数:`callId`(需 `voicecall.view`) | `CallSessionDto` |
| `/sessions/{callId}` | DELETE | 路径参数:`callId`(需 `voicecall.manage_calls`) | 见下方"DELETE 响应分支" |
| `/recordings` | GET | `from?` `to?` `callId?` `cursor?` `pageSize?`(需 `voicecall.view`) | `CursorPage<CallRecordingDto>` |
| `/recordings/{recordingId}/download` | GET | 路径参数:`recordingId`(需 `voicecall.view`) | 文件流 |
| `/recordings/{recordingId}` | DELETE | 路径参数:`recordingId`(需 `voicecall.manage_recordings`) | `recordingId` |
| `/recordings/cleanup` | POST | `CleanupRecordingsRequest`(需 `voicecall.manage_recordings`) | `{ deletedCount }` |

`MediaRelayNodeConfigDto`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `nodeId` | string | 中继节点 ID |
| `advertisedIp` | string? | 该节点对外公布的 IP;`null` 表示走部署默认 |
| `notes` | string? | 备注 |
| `updatedByUserId` | GUID? | 最后更新人 |
| `updatedAt` | DateTimeOffset | 最后更新时间 |

`UpsertNodeAdvertisedIpRequest`:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `advertisedIp` | string? | 否 | 留空字符串或 null = 删除覆盖 |
| `notes` | string? | 否 | 备注 |

`OpusCodecConfigDto`(各字段默认值):

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `targetBitrateBps` | int | `32000` | 目标码率 |
| `complexity` | int | `9` | 编码复杂度 0-10 |
| `fmtp` | string | 见服务端默认 | OPUS fmtp |
| `rtpPayloadType` | int | `111` | RTP payload type |
| `recordingEnabled` | bool | **`false`** | 是否启用通话录音 |
| `forceRelay` | bool | **`true`** | 是否强制媒体走 relay(关闭则允许 P2P 候选) |

`CleanupRecordingsRequest`:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `retentionDays` | int | 是 | 保留天数;早于此天数的录音会被删除 |

`DELETE /sessions/{callId}` 响应分支(`data` 三种形状):

| 分支 | `data` 字段 | 含义 |
|---|---|---|
| 正常派发 | `{ callId, dispatched: true }` | 已派发结束指令到对应中继节点 |
| 已结束 | `{ callId, alreadyEnded: true }` | 通话已经在结束状态 |
| 节点离线 | `{ callId, endedLocally: true }` | 服务端本地直接置为 `ended`,客户端可能不会收到 RTC 层结束信号 |

## 4. 平台管理接口总览

Base URL：`/api/admin/v1/platform`

### 4.1 租户

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/tenants` | GET | `status?` | `PlatformTenantDto[]` |
| `/tenants/{tenantId}` | GET | 路径参数：`tenantId` | `PlatformTenantDetailDto` |
| `/tenants` | POST | `AdminCreateTenantRequest` | `AdminCreateTenantResponse` |
| `/tenants/{tenantId}/approve` | POST | `ApproveTenantRequest` | `tenantId` |
| `/tenants/{tenantId}/reject` | POST | `RejectTenantRequest` | `tenantId` |
| `/tenants/{tenantId}/suspend` | POST | `SuspendTenantRequest` | `tenantId` |
| `/tenants/{tenantId}/resume` | POST | 无 | `tenantId` |
| `/tenants/{tenantId}` | DELETE | 无 | `tenantId` |
| `/tenants/{tenantId}/info` | PUT | `UpdatePlatformTenantInfoRequest` | `tenantId` `updated=true` |
| `/tenants/{tenantId}/quota` | PUT | `UpdateTenantQuotaRequest` | `tenantId` |
| `/tenants/{tenantId}/features` | PUT | `UpdateTenantFeaturesRequest` | `tenantId` |
| `/tenants/{tenantId}/permanent-delete-plan` | GET | 路径参数：`tenantId` | `PlatformTenantPermanentDeletePlanDto` |
| `/tenants/{tenantId}/permanent-delete` | POST | `PermanentlyDeleteTenantRequest` | `tenantId` `deleted=true` |
| `/tenants/batch-approve` | POST | `BatchTenantIdsRequest` | `BatchOperationResultDto` |
| `/stats` | GET | 无 | `PlatformStatsDto` |
| `/storage-stats` | GET | 无 | `TenantStorageStatsDto[]` |

### 4.2 租户用户与加入审批

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/tenants/{tenantId}/users` | GET | `keyword?` `status?` | `PlatformTenantUserDto[]` |
| `/tenants/{tenantId}/users/{userId}` | GET | 路径参数：`userId` | `PlatformTenantUserDetailDto` |
| `/tenants/{tenantId}/users/{userId}/customer-service/assign` | POST | `PlatformAssignCustomerServiceRequest` | `PlatformAssignCustomerServiceResultDto` |
| `/tenants/{tenantId}/users` | POST | `PlatformCreateTenantUserRequest` | `tenantId` `userId` |
| `/tenants/{tenantId}/users/{userId}` | PUT | `PlatformUpdateTenantUserRequest` | `tenantId` `userId` |
| `/tenants/{tenantId}/users/{userId}/reset-password` | POST | `PlatformResetTenantUserPasswordRequest` | `tenantId` `userId` |
| `/tenants/{tenantId}/users/{userId}/disable` | POST | 无 | `tenantId` `userId` |
| `/tenants/{tenantId}/users/{userId}/enable` | POST | 无 | `tenantId` `userId` |
| `/tenants/{tenantId}/users/{userId}` | DELETE | 无 | `tenantId` `userId` |
| `/tenants/{tenantId}/join-requests` | GET | 无 | `JoinRequestDto[]` |
| `/tenants/{tenantId}/join-requests/{requestId}/approve` | POST | 无 | `tenantId` `requestId` |
| `/tenants/{tenantId}/join-requests/{requestId}/reject` | POST | `ReviewJoinRequestRequest` | `tenantId` `requestId` |

### 4.3 平台用户

| 端点 | 方法 | 请求字段 / 查询参数 | 响应 `data` |
|---|---|---|---|
| `/users` | GET | `keyword?` | `PlatformUserDto[]` |
| `/users/{platformUserId}` | GET | 路径参数：`platformUserId` | `PlatformUserDetailDto` |
| `/users/{platformUserId}` | PUT | `UpdatePlatformUserRequest` | `platformUserId` |

## 5. 关键 DTO 字段表

### 5.1 `AdminDashboardDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `onlineUsers` | int | 在线用户数 |
| `activeConversations` | int | 活跃会话数 |
| `messagesToday` | int | 今日消息数 |
| `webhookDeliveries` | int | Webhook 投递数 |
| `serviceAccounts` | int | 服务账号数 |
| `systemAlerts` | int | 系统告警数 |
| `trend` | `TrendPointDto[]` | 趋势数据 |

### 5.2 `AdminDashboardV2Dto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `onlineUsers` | int | 在线用户数 |
| `totalUsers` | int | 用户总数 |
| `newUsersToday` | int | 今日新增用户 |
| `activeConversations` | int | 活跃会话数 |
| `totalGroups` | int | 群总数 |
| `activeGroupsToday` | int | 今日活跃群数 |
| `messagesToday` | int | 今日消息数 |
| `webhookDeliveries` | int | Webhook 投递数 |
| `serviceAccounts` | int | 服务账号数 |
| `botApps` | int | BOT 应用数 |
| `systemAlerts` | int | 系统告警数 |
| `pendingOutbox` | int | 待处理 outbox 数 |
| `deadLetterDeliveries` | int | 死信投递数 |
| `messageTrend` | `TrendPointDto[]` | 消息趋势 |
| `userTrend` | `TrendPointDto[]` | 用户趋势 |

### 5.3 `AdminUserDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `loginName` | string | 登录名 |
| `lppId` | string? | LPP 标识 |
| `displayName` | string | 显示名 |
| `status` | string | `active/disabled` |
| `mobile` | string? | 手机 |
| `email` | string? | 邮箱 |
| `userType` | short | 用户类型；见 `field-enum-reference.md` |
| `membershipRole` | short | 租户成员角色 |
| `isOfficialServiceUser` | bool | 是否为默认官方账号投影用户 |
| `assignedStaffDisplayName` | string? | 当前负责该客户的员工显示名；仅客户账号有值 |
| `assignedCustomerCount` | int | 当前员工负责的客户数；仅员工/客服账号有意义 |
| `hasAdminAccess` | bool | 是否有管理后台权限 |
| `createdAt` | datetime | 创建时间 |
| `lastSeenAt` | datetime? | 最近活跃时间 |

### 5.4 `AdminUserSessionDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 会话 ID |
| `deviceId` | GUID | 设备 ID |
| `deviceType` | string | `ios/android/web/desktop/unknown` |
| `deviceName` | string? | 设备名称 |
| `lastIp` | string? | 最近 IP |
| `lastUserAgent` | string? | 最近 UA |
| `lastSeenAt` | datetime | 最近活动时间 |
| `refreshTokenExpiresAt` | datetime | RefreshToken 过期时间 |
| `isRevoked` | bool | 是否已撤销 |

### 5.5 `AdminUserDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `platformUserId` | GUID? | 关联的平台账号 ID；未绑定时为空 |
| `loginName` | string | 登录名 |
| `lppId` | string? | LPP 标识 |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 URL |
| `status` | string | 用户状态 |
| `mobile` | string? | 手机 |
| `email` | string? | 邮箱 |
| `userType` | short | 用户类型 |
| `membershipRole` | short | 租户成员角色 |
| `isOfficialServiceUser` | bool | 是否为默认官方账号 |
| `assignedStaffDisplayName` | string? | 当前归属客服显示名 |
| `assignedCustomerCount` | int | 当前负责客户数 |
| `hasAdminAccess` | bool | 是否具备后台权限 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |
| `roleCodes` | string[] | 当前角色编码 |
| `sessions` | `AdminUserSessionDto[]` | 当前会话列表 |
| `customerService` | `AdminCustomerServiceContextDto` | 客户服务上下文：官方账号、归属客服、可分配客服列表 |

### 5.6 `AdminCustomerServicePeerDto` / `AdminCustomerServiceContextDto`

`AdminCustomerServicePeerDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `displayName` | string | 显示名 |
| `loginName` | string | 登录名 |
| `lppId` | string? | LPP 标识 |
| `conversationId` | GUID? | 与当前客户的服务单聊 ID；不存在时为空 |
| `isFriend` | bool | 当前是否已建立好友关系 |

`AdminCustomerServiceContextDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `isOfficialServiceUser` | bool | 当前目标用户是否就是默认官方账号 |
| `officialAccount` | `AdminCustomerServicePeerDto?` | 当前租户默认官方账号 |
| `assignedStaff` | `AdminCustomerServicePeerDto?` | 当前负责该客户的员工 |
| `assignedAt` | datetime? | 当前归属建立时间 |
| `assignedCustomerCount` | int | 当前员工负责客户数 |
| `assignableStaff` | `AdminCustomerServicePeerDto[]` | 可分配客服列表，主要用于客户详情页 |

`AssignCustomerServiceRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID? | 目标员工 ID；为空表示按租户规则自动分配 |
| `transferConversation` | bool | 是否把客户与原客服的服务单聊直接转给新客服 |

`AssignCustomerServiceResultDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID? | 实际生效的员工 ID；自动分配失败时可为空 |
| `transferredConversationCount` | int | 成功转交的服务单聊数量 |
| `skippedConversationCount` | int | 因目标单聊已存在等原因跳过的数量 |

`BatchTransferCustomerServiceRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `fromStaffUserId` | GUID | 源员工 ID |
| `toStaffUserId` | GUID | 目标员工 ID |
| `customerUserIds` | GUID[]? | 要转交的客户 ID 列表；为空表示转交源员工名下全部当前客户 |
| `transferConversation` | bool | 是否同时转交服务单聊 |

`BatchTransferCustomerServiceResultDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `selectedCustomerCount` | int | 本次实际纳入处理的客户数 |
| `transferredCustomerCount` | int | 成功改绑归属的客户数 |
| `transferredConversationCount` | int | 成功转交的服务单聊数量 |
| `skippedConversationCount` | int | 因目标单聊已存在等原因跳过的会话数量 |
| `skippedCustomerCount` | int | 调用方提交但不属于源员工名下的客户数量 |

### 5.7 `AdminGroupDto` / `AdminGroupDetailDto`

`AdminGroupDto` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 会话 ID |
| `title` | string | 群名称 |
| `memberCount` | int | 成员数 |
| `lastMessagePreview` | string | 最后一条消息预览 |
| `updatedAt` | datetime | 更新时间 |

`AdminGroupDetailDto` 额外字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationType` | string | 会话类型 |
| `lastMessageSeq` | long | 最后消息序号 |
| `ownerUserId` | GUID? | 群主用户 ID |
| `ownerDisplayName` | string? | 群主显示名 |
| `isArchived` | bool | 是否归档 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |
| `members` | `AdminGroupMemberDto[]` | 成员列表 |

`AdminGroupMemberDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `displayName` | string | 显示名 |
| `loginName` | string? | 登录名 |
| `memberRole` | short | 群内角色数值 |
| `lastReadSeq` | long | 最后已读序号 |
| `joinedAt` | DateTimeOffset | 入群时间 |

`AdminRemoveGroupMemberRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标成员用户 ID |

`AdminGroupMuteMemberRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标成员用户 ID |
| `durationMinutes` | int? | 禁言时长分钟；为空表示不限时 |
| `reason` | string? | 禁言原因 |

`AdminGroupMuteAllRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `enabled` | bool | 是否开启全员禁言 |

`AdminFreezeConversationRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `frozen` | bool | 是否冻结 |
| `reason` | string? | 冻结原因 |

### 5.8 `AdminMessageDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `messageId` | GUID | 消息 ID |
| `conversationTitle` | string | 会话标题 |
| `senderName` | string | 发送者名称 |
| `messageType` | string | 消息类型 |
| `preview` | string | 预览内容 |
| `sentAt` | datetime | 发送时间 |

### 5.9 `AdminServiceAccountDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `serviceAccountId` | GUID | 服务账号 ID |
| `accountCode` | string | 账号编码 |
| `displayName` | string | 显示名 |
| `status` | string | 状态字符串 |
| `conversationTitle` | string? | 绑定会话标题 |

`AdminCreateServiceAccountRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `accountCode` | string | 账号编码，同租户内唯一 |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |

`AdminCreateServiceAccountResponse`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `serviceAccountId` | GUID | 服务账号 ID |
| `accountCode` | string | 账号编码 |

`AdminUpdateServiceAccountRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `status` | string | 状态字符串 |

补充：

- `accountCode="official"` 表示租户默认官方账号
- 客户加入租户后，系统会确保该默认官方账号存在，并建立客户与官方账号的关系

### 5.10 `AdminRoleDto` / `AdminRolePermissionConfigDto`

`AdminRoleDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleId` | GUID | 角色 ID |
| `roleCode` | string | 角色编码 |
| `roleName` | string | 角色名称 |
| `assignedUserCount` | int | 分配用户数 |
| `status` | string | `active/disabled` |
| `updatedAt` | datetime | 更新时间 |

`AdminRolePermissionConfigDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleId` | GUID | 角色 ID |
| `roleCode` | string | 角色编码 |
| `roleName` | string | 角色名称 |
| `permissions` | `AdminRolePermissionDto[]` | 权限列表 |

`AdminRolePermissionDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `permissionCode` | string | 权限编码 |
| `permissionName` | string | 权限名 |
| `category` | string | 分类 |
| `description` | string | 描述 |
| `isEnforced` | bool | 是否强制启用 |
| `assigned` | bool | 当前角色是否已分配 |

### 5.11 `AdminWebhookDeliveryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `deliveryId` | GUID | 投递 ID |
| `appId` | GUID | 应用 ID |
| `appCode` | string | 应用编码 |
| `appName` | string | 应用名 |
| `topic` | string | 事件主题 |
| `requestUrl` | string | 回调 URL |
| `status` | string | 投递状态：`pending`、`delivered`、`retrying`、`dead_letter` |
| `retryCount` | int | 重试次数 |
| `responseStatus` | int? | 回调 HTTP 状态码 |
| `lastError` | string? | 最后错误 |
| `nextRetryAt` | datetime? | 下次重试时间 |
| `createdAt` | datetime | 创建时间 |
| `deliveredAt` | datetime? | 送达时间 |

### 5.12 `SystemConfigItemDto` / `SystemConfigHistoryDto`

`SystemConfigItemDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `configKey` | string | 配置键 |
| `configScope` | string | `global/tenant/user` |
| `version` | int | 当前版本 |
| `updatedAt` | datetime | 更新时间 |
| `description` | string | 描述 |
| `valuePreview` | string | 值预览 |
| `jsonValue` | string | 完整 JSON 值 |

`SystemConfigHistoryDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `historyId` | GUID | 历史记录 ID |
| `configKey` | string | 配置键 |
| `version` | int | 版本 |
| `operationCode` | string | 操作类型 |
| `jsonValue` | string | 完整 JSON |
| `valuePreview` | string | 值预览 |
| `changedByDisplayName` | string? | 操作人显示名 |
| `createdAt` | datetime | 创建时间 |

### 5.13 `AdminServiceHealthDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `serviceName` | string | 服务名 |
| `url` | string | 健康检查 URL |
| `status` | string | `healthy/degraded/unhealthy/unknown` |
| `latencyMs` | double? | 延迟 |
| `detail` | string? | 详细说明 |

### 5.14 `AdminBotAppDto` / `AdminBotConversationGrantDto`

`AdminBotAppDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |
| `appCode` | string | 应用编码 |
| `appName` | string | 应用名 |
| `environment` | string | 环境 |
| `callbackUrl` | string? | Webhook 地址 |
| `status` | string | `active/disabled` |
| `subscriptionCount` | int | 订阅事件数 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

`AdminCreateBotAppRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appCode` | string | 应用编码，同租户内唯一 |
| `appName` | string | 应用名称 |
| `environment` | string | 环境，`sandbox` 或 `production` |

`AdminCreateBotAppResponse`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |
| `appCode` | string | 应用编码 |
| `appName` | string | 应用名称 |
| `secret` | string | 新生成的应用密钥明文，只返回一次 |

`AdminBotConversationGrantDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 会话 ID |
| `grantedAt` | datetime | 授权时间 |
| `grantedByUserId` | GUID | 授权人 |

`AdminUpdateBotConversationGrantsRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationIds` | GUID[] | 授权会话 ID 列表，整体覆盖 |

### 5.14 `AdminOutboxItemDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `outboxId` | GUID | Outbox ID |
| `aggregateType` | string | 聚合类型 |
| `aggregateId` | GUID | 聚合 ID |
| `eventType` | string | 事件类型 |
| `status` | string | `pending/published/retrying/dead_letter` |
| `retryCount` | int | 重试次数 |
| `lastError` | string? | 最后错误 |
| `nextRetryAt` | datetime? | 下次重试时间 |
| `createdAt` | datetime | 创建时间 |

### 5.15 `AdminOnlineUserDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `loginName` | string | 登录名 |
| `displayName` | string | 显示名 |
| `deviceType` | string? | 设备类型 |
| `lastSeenAt` | datetime | 最后活跃时间 |

### 5.16 用户治理 DTO

`AdminMuteUserRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `mode` | string | 禁言模式：`muted`（明确禁言）或 `shadow_muted`（影子禁言） |
| `durationMinutes` | int? | 禁言时长分钟；为空表示不限时 |
| `reason` | string? | 禁言原因 |

`AdminSetRateLimitRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `maxMessagesPerMinute` | int? | 每分钟最大消息数；为空表示清除覆盖值 |

`AdminForceProfileRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `displayName` | string? | 强制修改的显示名 |
| `avatarUrl` | string? | 强制修改的头像 |
| `lppId` | string? | 强制修改的 LPP 标识 |

`AdminSetNoteRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `note` | string? | 管理员备注内容；为空表示清除备注 |

`ResetAdminUserPasswordRequest`：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `newPassword` | string | 是 | 新密码;至少 8 个字符,不满足返回 `ADMIN_INVALID_PASSWORD` |

`UpdateAdminUserRolesRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleCodes` | string[] | 角色编码列表，整体覆盖 |

`UpdateAdminRolePermissionsRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `permissionCodes` | string[] | 权限编码列表，整体覆盖 |

`BulkAssignRolesRequest`:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `userIds` | GUID[] | 是 | 目标用户 ID 列表 |
| `roleCodes` | string[] | 是 | 整体覆盖目标用户当前角色 |

`BulkAssignRolesResultDto`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `successCount` | int | 成功更新的用户数 |
| `failCount` | int | 失败的用户数 |
| `errors` | `BatchErrorDto[]` | 失败明细 |

`CreateAdminRoleRequest`:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `roleCode` | string | 是 | 角色编码,租户内唯一,会被小写化 |
| `roleName` | string | 是 | 显示名 |
| `description` | string? | 否 | 描述 |
| `sourceRoleCode` | string? | 否 | 模板角色编码;不传则创建空角色 |

`AdminUserMuteStatusDto` / `AdminUserGovernanceSummaryDto` 关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `muteMode` | string | `normal/muted/shadow_muted` |
| `muteUntil` | datetime? | 禁言结束时间 |
| `muteReason` | string? | 禁言原因 |
| `rateLimitOverride` | int? | 速率限制覆盖值 |
| `adminNote` | string? | 管理员备注 |

### 5.17 告警 / 通知 / 公告 / 登录日志 / 导出

`AlertRuleDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ruleId` | GUID | 规则 ID |
| `ruleName` | string | 规则名 |
| `metricKey` | string | 指标键 |
| `condition` | string | `gt/lt/eq/gte/lte` |
| `threshold` | double | 阈值 |
| `severity` | string | `info/warning/critical` |
| `enabled` | bool | 是否启用 |
| `notifyChannels` | string[] | 通知渠道列表 |
| `cooldownMinutes` | int | 冷却分钟数 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

`AlertHistoryDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `alertId` | GUID | 告警 ID |
| `ruleId` | GUID | 规则 ID |
| `ruleName` | string | 规则名 |
| `metricKey` | string | 指标键 |
| `metricValue` | double | 指标值 |
| `severity` | string | 严重级别 |
| `status` | string | `firing/acknowledged/resolved/silenced` |
| `message` | string? | 告警消息 |
| `firedAt` | datetime | 触发时间 |
| `resolvedAt` | datetime? | 恢复时间 |
| `acknowledgedBy` | string? | 确认人 |

`NotifyChannelDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelId` | GUID | 通知渠道 ID |
| `channelName` | string | 名称 |
| `channelType` | string | 渠道类型 |
| `config` | string | 配置 JSON / 文本 |
| `enabled` | bool | 是否启用 |
| `createdAt` | datetime | 创建时间 |

`AnnouncementDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `announcementId` | GUID | 公告 ID |
| `title` | string | 标题 |
| `content` | string | 内容 |
| `targetScope` | string | `all/tenant/role` |
| `targetId` | GUID? | 目标对象 ID；仅 `targetScope=tenant` 时使用 |
| `targetCode` | string? | 目标角色代码；仅 `targetScope=role` 时使用，典型值：`customer` `staff` `member` `technical` `customer_service` `admin` `owner` |
| `priority` | string | `normal/important/urgent` |
| `status` | string | `draft/published/archived` |
| `publishedAt` | datetime? | 发布时间 |
| `expiresAt` | datetime? | 过期时间 |
| `createdAt` | datetime | 创建时间 |

`AdminLoginLogDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `logId` | GUID | 日志 ID |
| `userId` | GUID | 用户 ID |
| `displayName` | string | 显示名 |
| `loginIp` | string | 登录 IP |
| `userAgent` | string | UA |
| `result` | string | `success/failed` |
| `failReason` | string? | 失败原因 |
| `createdAt` | datetime | 发生时间 |

`ExportTaskDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `taskId` | GUID | 导出任务 ID |
| `tenantId` | GUID? | 所属租户 ID |
| `exportType` | string | 导出类型 |
| `status` | string | `pending/processing/completed/failed` |
| `fileName` | string? | 文件名 |
| `downloadUrl` | string? | 下载地址 |
| `recordCount` | int? | 记录数 |
| `createdAt` | datetime | 创建时间 |
| `completedAt` | datetime? | 完成时间 |

`CreateExportTaskRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `exportType` | string | 导出类型 |
| `filters` | object? | 自定义筛选条件键值对 |

`SilenceAlertRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `durationMinutes` | int | 静默时长分钟 |

`CreateAlertRuleRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ruleName` | string | 规则名称 |
| `metricKey` | string | 指标键 |
| `condition` | string | 条件：`gt`/`lt`/`eq`/`gte`/`lte` |
| `threshold` | double | 阈值 |
| `severity` | string | 严重级别：`info`/`warning`/`critical` |
| `notifyChannels` | string[]? | 通知渠道 |
| `cooldownMinutes` | int | 冷却分钟数 |

`UpdateAlertRuleRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ruleName` | string? | 规则名称 |
| `metricKey` | string? | 指标键 |
| `condition` | string? | 条件 |
| `threshold` | double? | 阈值 |
| `severity` | string? | 严重级别 |
| `notifyChannels` | string[]? | 通知渠道 |
| `cooldownMinutes` | int? | 冷却分钟数 |
| `enabled` | bool? | 是否启用 |

`CreateNotifyChannelRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelName` | string | 渠道名称 |
| `channelType` | string | 渠道类型 |
| `config` | string | 配置 JSON |

`UpdateNotifyChannelRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelName` | string? | 渠道名称 |
| `channelType` | string? | 渠道类型 |
| `config` | string? | 配置 JSON |
| `enabled` | bool? | 是否启用 |

`CreateAnnouncementRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 标题 |
| `content` | string | 内容 |
| `targetScope` | string | 目标范围：`all`/`tenant`/`role` |
| `targetId` | GUID? | 目标对象 ID；仅 `targetScope=tenant` 时使用 |
| `targetCode` | string? | 目标角色代码；仅 `targetScope=role` 时使用 |
| `priority` | string | 优先级：`normal`/`important`/`urgent` |
| `expiresAt` | DateTimeOffset? | 过期时间 |

`UpdateAnnouncementRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string? | 标题 |
| `content` | string? | 内容 |
| `targetScope` | string? | 目标范围：`all`/`tenant`/`role` |
| `targetId` | GUID? | 目标对象 ID；仅 `targetScope=tenant` 时使用 |
| `targetCode` | string? | 目标角色代码；仅 `targetScope=role` 时使用 |
| `priority` | string? | 优先级：`normal`/`important`/`urgent` |
| `expiresAt` | DateTimeOffset? | 过期时间 |

### 5.17A 广播消息

`AdminBroadcastRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `messageType` | string | 消息类型，当前通常为 `text` |
| `text` | string | 广播消息文本 |
| `conversationId` | GUID? | 指定目标会话；为空表示广播到所有群聊 |

`AdminBroadcastResponse`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sentCount` | int | 实际发送的会话数 |

### 5.18 会话转移

`TransferConversationsRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `fromUserId` | GUID | 源员工用户 ID |
| `toUserId` | GUID | 目标员工用户 ID |

`TransferConversationsResult`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `transferredDirectChats` | int | 成功转移的单聊数量 |
| `transferredGroupMemberships` | int | 成功转移的群成员身份数量 |

### 5.19 批量操作结果

| 字段 | 类型 | 说明 |
|---|---|---|
| `successCount` | int | 成功数 |
| `failCount` | int | 失败数 |
| `errors` | `BatchErrorDto[]` | 失败列表 |

`BatchErrorDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 失败对象 ID |
| `error` | string | 错误说明 |

### 5.20 平台管理 DTO

`PlatformTenantDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `status` | short | 租户状态，见 [field-enum-reference.md](./field-enum-reference.md) |
| `planCode` | string? | 套餐编码 |
| `memberCount` | int | 成员数 |
| `ownerUserId` | GUID? | 所有者用户 ID |
| `createdAt` | datetime | 创建时间 |
| `approvedAt` | datetime? | 审批时间 |
| `suspendedAt` | datetime? | 暂停时间 |

`PlatformTenantDetailDto` 除基础字段外，还包含：

- `logoUrl`
- `tenantDescription`
- `domain`
- `industry`
- `scale`
- `contactName`
- `contactMobile`
- `contactEmail`
- `isListed`
- `maxUsers`
- `maxGroups`
- `maxStorageMb`
- `featuresJson`
- `groupCount`
- `messageCount`
- `ownerDisplayName`
- `deletedAt`

`PlatformStatsDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalTenants` | int | 租户总数 |
| `activeTenants` | int | 激活租户数 |
| `pendingTenants` | int | 待审批租户数 |
| `suspendedTenants` | int | 暂停租户数 |
| `totalPlatformUsers` | int | 平台用户总数 |
| `totalTenantUsers` | int | 租户用户总数 |

`TenantStorageStatsDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantName` | string | 租户名称 |
| `usedStorageMb` | long | 已用存储 |
| `maxStorageMb` | long | 最大配额 |
| `fileCount` | int | 文件数 |
| `mediaCount` | int | 媒体数 |
| `documentCount` | int | 文档数 |

`PlatformTenantUserDto`(列表项关键字段):

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `platformUserId` | GUID? | 平台账号 ID |
| `loginName` | string | 登录名 |
| `lppId` | string? | LPP 标识 |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 |
| `mobile` | string? | 手机号 |
| `email` | string? | 邮箱 |
| `userType` | short | 用户类型(数值,见 field-enum-reference) |
| `status` | short | 用户状态(数值) |
| `muteMode` | short | 禁言模式(数值) |
| `gender` | short | 性别(数值) |
| `membershipRole` | short | 租户成员角色(数值) |
| `joinMethod` | short | 加入方式(数值) |
| `isOfficialServiceUser` | bool | 是否为默认官方账号 |
| `assignedStaffDisplayName` | string? | 当前归属客服显示名 |
| `assignedCustomerCount` | int | 当前负责客户数 |
| `joinedAt` | string? | 加入时间(ISO 8601) |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

`PlatformTenantUserDetailDto`(详情,在列表项基础上增加):

| 字段 | 类型 | 说明 |
|---|---|---|
| `muteUntil` | string? | 禁言截止时间(ISO 8601) |
| `muteReason` | string? | 禁言原因 |
| `rateLimitOverride` | int? | 速率限制覆盖值 |
| `adminNote` | string? | 管理员备注 |
| `signature` | string? | 个性签名 |
| `birthday` | string? | 生日 |
| `location` | string? | 位置 |
| `bio` | string? | 个人简介 |
| `roleCodes` | string[] | 角色编码列表 |
| `customerService` | `PlatformCustomerServiceContextDto` | 客服上下文(下方) |

`PlatformCustomerServiceContextDto`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `isOfficialServiceUser` | bool | 当前用户是否为默认官方账号 |
| `officialAccount` | object? | 当前租户默认官方账号摘要 |
| `assignedStaff` | object? | 当前归属客服摘要 |
| `assignedAt` | string? | 归属建立时间 |
| `assignedCustomerCount` | int | 当前员工负责客户数 |
| `assignableStaff` | array | 可分配客服摘要列表 |

枚举映射见 [field-enum-reference.md](./field-enum-reference.md)。


`PlatformCreateTenantUserRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `lppId` | string? | LPP 标识 |
| `password` | string | 密码 |
| `displayName` | string | 显示名 |
| `mobile` | string? | 手机号 |
| `email` | string? | 邮箱 |
| `userType` | short | 用户类型：`1=customer`、`2=staff` |
| `membershipRole` | short | 租户角色：`0=member`、`1=technical`、`2=customer_service`、`3=admin`、`4=owner` |

`PlatformUpdateTenantUserRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `displayName` | string? | 显示名 |
| `avatarUrl` | string? | 头像 |
| `lppId` | string? | LPP 标识 |
| `userType` | short? | 用户类型 |
| `status` | short? | 用户状态 |
| `membershipRole` | short? | 租户角色 |
| `adminNote` | string? | 管理备注 |

`PlatformResetTenantUserPasswordRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `newPassword` | string | 新密码 |

`PlatformAssignCustomerServiceRequest` / `PlatformAssignCustomerServiceResultDto` 与租户后台侧的
`AssignCustomerServiceRequest` / `AssignCustomerServiceResultDto` 语义一致，只是作用于平台后台的“租户详情 -> 成员详情”入口。

`UpdatePlatformUserRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `lppId` | string? | LPP 标识 |
| `status` | short? | 平台用户状态 |
| `isPlatformAdmin` | bool? | 是否为平台管理员 |

`PlatformUserDto` / `PlatformUserDetailDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `platformUserId` | GUID | 平台用户 ID |
| `lppId` | string? | LPP 标识 |
| `displayName` | string | 显示名 |
| `mobile` | string? | 手机 |
| `email` | string? | 邮箱 |
| `avatarUrl` | string? | 头像，详情中可用 |
| `status` | short | 平台用户状态 |
| `isPlatformAdmin` | bool | 是否平台管理员 |
| `tenantCount` | int | 加入租户数，仅列表中可用 |
| `lastLoginAt` | datetime? | 最近登录时间 |
| `spaceContext` | `PlatformSpaceContextDto` | 最近空间上下文 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间，详情中可用 |
| `tenants` | `TenantSummaryDto[]` | 已加入租户列表，详情中可用 |

`JoinRequestDto` 已在 [field-enum-reference.md](./field-enum-reference.md) 中统一定义。

`AdminCreateTenantRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | Logo |
| `tenantDescription` | string? | 组织说明 |
| `domain` | string? | 域名 |
| `industry` | string? | 行业 |
| `scale` | string? | 规模 |
| `contactName` | string? | 联系人 |
| `contactMobile` | string? | 联系电话 |
| `contactEmail` | string? | 联系邮箱 |
| `planCode` | string? | 套餐编码 |
| `maxUsers` | int? | 最大用户数 |
| `maxGroups` | int? | 最大群数 |
| `maxStorageMb` | long? | 最大存储 MB |

`AdminCreateTenantResponse`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 新租户 ID |
| `tenantCode` | string | 租户编码 |

`UpdatePlatformTenantInfoRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantName` | string? | 租户名称 |
| `logoUrl` | string? | Logo |
| `tenantDescription` | string? | 组织说明 |
| `domain` | string? | 域名 |
| `industry` | string? | 行业 |
| `scale` | string? | 规模 |
| `contactName` | string? | 联系人 |
| `contactMobile` | string? | 联系电话 |
| `contactEmail` | string? | 联系邮箱 |
| `isListed` | bool? | 是否允许搜索展示 |

`UpdateTenantQuotaRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `maxUsers` | int? | 最大用户数 |
| `maxGroups` | int? | 最大群数 |
| `maxStorageMb` | long? | 最大存储 MB |
| `planCode` | string? | 套餐编码 |

`UpdateTenantFeaturesRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `featuresJson` | string | 功能特性 JSON，整体覆盖 |

`ApproveTenantRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `planCode` | string? | 套餐编码 |
| `maxUsers` | int? | 最大用户数 |
| `maxGroups` | int? | 最大群数 |
| `maxStorageMb` | long? | 最大存储 MB |

`RejectTenantRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `reason` | string? | 拒绝原因 |

`SuspendTenantRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `reason` | string? | 暂停原因 |

`PermanentlyDeleteTenantRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantCodeConfirm` | string | 确认租户编码（必须与目标租户编码一致，防止误操作） |

`PlatformTenantPermanentDeletePlanDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `currentStatus` | short | 当前租户状态 |
| `archivedAt` | datetime? | 归档时间 |
| `canPermanentlyDelete` | bool | 是否可以执行永久删除 |
| `summary` | string | 影响摘要说明 |
| `recommendedSteps` | string[] | 建议的操作步骤列表 |
| `checks` | `PlatformTenantPermanentDeleteCheckDto[]` | 数据检查项列表 |

`PlatformTenantPermanentDeleteCheckDto`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `key` | string | 检查项键名（如 `users`、`groups`、`messages`） |
| `label` | string | 检查项显示名 |
| `count` | long | 数据条数 |
| `recommendation` | string | 处理建议 |

## 6. 管理端常用枚举与状态值

### 6.1 管理端常用字符串状态

| 字段 | 取值 |
|---|---|
| 用户 `status` | `active` `disabled` |
| Webhook 投递 `status` | `pending` `delivered` `retrying` `dead_letter` |
| Outbox `status` | `pending` `published` `retrying` `dead_letter` |
| 服务健康 `status` | `healthy` `degraded` `unhealthy` `unknown` |
| 用户治理 `muteMode` | `normal` `muted` `shadow_muted` |
| 节点 `status` | `online` `maintenance` `offline` |
| 告警 `severity` | `info` `warning` `critical` |
| 告警历史 `status` | `firing` `acknowledged` `resolved` `silenced` |
| 通知渠道 `channelType` | `email` `sms` `webhook` `dingtalk` `wecom` `feishu` |
| 公告 `targetScope` | `all` `tenant` `role` |
| 公告 `priority` | `normal` `important` `urgent` |
| 公告 `status` | `draft` `published` `archived` |
| 登录日志 `result` | `success` `failed` |
| 导出任务 `status` | `pending` `processing` `completed` `failed` |

### 6.2 数值型状态映射

这些字段在管理端接口里通常仍以数值返回：

- 平台租户 `status`
- 租户用户 `userType`
- 租户用户 `status`
- 租户用户 `muteMode`
- 租户用户 `gender`
- 租户用户 `membershipRole`
- 租户用户 `joinMethod`
- 平台用户 `spaceContext.spaceType`
- 加入申请 `status`

统一映射请查：

- [field-enum-reference.md](./field-enum-reference.md)

### 6.3 音视频枚举

以下枚举已在音视频文档中详细展开：

- `CallState`
- `HangupCause`

详见：

- [voice-video-call-reference.md](./voice-video-call-reference.md)

## 15. 移动推送 管理 接口速查

Base URL：`/api/admin/v1/notifications`

所有端点需管理端登录。规划权限码：`push.manage`（当前实现为 `RequireAuthorization()`）。

### 15.1 接口总览

| 端点 | 方法 | 请求字段 | 响应 `data` | 说明 |
|---|---|---|---|---|
| `/channels/{channel}` | GET | 路径参数：`channel`（见 §15.5） | `PushChannelConfigViewDto` | 查询指定通道当前凭证配置；凭证密文不返回明文，仅返回 `hasCredentials` 布尔位 |
| `/channels/{channel}` | PUT | `UpsertChannelConfigRequest` | `204` | 上传/更新通道凭证(明文传入,服务端加密落库)并开关该通道 |
| `/routing-rules` | GET | 无 | `PushRoutingRule[]` | 列出全部路由规则（按 `Priority` 升序） |
| `/routing-rules` | POST | `PushRoutingRule`（无需带 `id`） | `PushRoutingRule`（带生成的 `id`） | 新建路由规则 |
| `/routing-rules/{id}` | PUT | `PushRoutingRule`（`id` 来自路径） | `204` | 更新路由规则 |
| `/routing-rules/{id}` | DELETE | 路径参数：`id` | `204` | 删除路由规则 |
| `/test-push` | POST | `TestPushRequest` | `202 Accepted` | 调试端点；立即向指定 `(tenantId,userId)` 触发一次推送，走完整 Router + Dispatcher 流程并写 `PushLog` |

### 15.2 `PushChannelConfigViewDto`

`GET /channels/{channel}` 响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | GUID | 配置记录 ID |
| `channel` | short | 通道枚举，见 §15.5 |
| `enabled` | bool | 是否启用 |
| `hasCredentials` | bool | 是否已写入凭证（不返回明文/密文） |
| `extraOptionsJson` | string? | 通道额外参数（JSON 字符串），例如 JPush 的 `appKey`/`masterSecret` 存放方式 |
| `updatedAt` | DateTimeOffset | 最后更新时间 |
| `updatedBy` | GUID? | 最后更新人用户 ID |

### 15.3 `UpsertChannelConfigRequest`

`PUT /channels/{channel}` 请求体：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `enabled` | bool | 是 | 是否启用该通道；禁用后 Dispatcher 会在选通道时跳过 |
| `credentialsPlaintext` | string | 是 | 凭证明文：FCM 为 Service Account JSON 全文；JPush 为 `{"appKey":"xxx","masterSecret":"yyy"}` |
| `extraOptionsJson` | string? | 否 | 通道扩展 JSON（预留） |

后端处理:

- 凭证以加密形式落库,任何 GET 接口均不会回显明文 / 密文
- 服务端会基于凭证指纹做内部去重,凭证不变时不会重新初始化推送通道

### 15.4 `PushRoutingRule`

请求与响应 `data`（POST/PUT/GET）均为：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | GUID | 规则 ID；POST 时可省略由服务端生成 |
| `priority` | int | 优先级；值越小越先匹配（同类型内部） |
| `ruleType` | short | 规则类型，见 §15.6 `RoutingRuleType` |
| `matchValue` | string | 匹配值；语义由 `ruleType` 决定 |
| `targetChannel` | short | 命中后选用的推送通道（见 §15.5） |
| `enabled` | bool | 是否启用；禁用后跳过 |
| `createdAt` | DateTimeOffset | 创建时间（服务端维护） |
| `updatedAt` | DateTimeOffset | 更新时间（服务端维护） |

匹配语义：

| `ruleType` | `matchValue` 约定 | 比较方式 |
|---|---|---|
| `User=4` | `userId`（GUID 字符串） | 区分大小写精确匹配 |
| `Tenant=3` | `tenantId`（GUID 字符串） | 区分大小写精确匹配 |
| `Region=2` | 地域标识（例如 `CN`、`SG`） | 大小写不敏感 |
| `PlatformDefault=1` | `Android` / `iOS` | 区分大小写精确匹配 |

Dispatcher 选通道优先级：`User` → `Tenant` → `Region` → `PlatformDefault` → 设备自身 `channel`。

### 15.5 `PushChannel`

| 值 | 名称 | 说明 |
|---|---|---|
| `1` | `Fcm` | Firebase Cloud Messaging |
| `2` | `JPush` | 极光推送 |

### 15.6 `RoutingRuleType`

| 值 | 名称 | 说明 |
|---|---|---|
| `1` | `PlatformDefault` | 平台默认（按 `Android`/`iOS`） |
| `2` | `Region` | 按设备 `region` 匹配 |
| `3` | `Tenant` | 按 `tenantId` 匹配 |
| `4` | `User` | 按 `userId` 匹配 |

### 15.7 `TestPushRequest`

`POST /test-push` 请求体：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `tenantId` | GUID | 是 | 目标租户 |
| `userId` | GUID | 是 | 目标用户 |
| `scenario` | short | 是 | 场景枚举（`1=Message`、`2=Call`、`3=FriendRequest`），影响下行 `data.scenario` 与高优先级策略 |
| `title` | string | 是 | 通知标题 |
| `body` | string | 是 | 通知正文 |
| `data` | Map<string,string>? | 否 | 业务自定义 `data` / `extras` |
| `highPriority` | bool | 是 | 是否高优先级（叠加场景默认值） |

响应：`202 Accepted`。服务端异步执行 Dispatcher，日志写入 `PushLog`。

### 15.8 `PushLog` 字段

用于审计/排障（当前无独立查询端点，按需通过直查数据库或后续管理端页面查看）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | GUID | 日志 ID |
| `tenantId` | GUID | 目标租户 |
| `userId` | GUID | 目标用户 |
| `deviceId` | string | 目标设备 |
| `channel` | short | 实际选用的通道 |
| `scenario` | short | 推送场景 |
| `messageId` | string | 业务侧 `messageId`（用于跨端对账） |
| `status` | short | 发送结果（见 §15.9） |
| `errorCode` | string? | Provider 或系统错误码；Provider 未注册时为 `PROVIDER_NOT_REGISTERED` |
| `errorMessage` | string? | 错误描述 |
| `latencyMs` | int | 整体延迟（毫秒） |
| `createdAt` | DateTimeOffset | 发送时间 |

### 15.9 `PushStatus`

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `Pending` | 初始状态（入库瞬时状态） |
| `1` | `Success` | 发送成功 |
| `2` | `Failed` | 发送失败 |
| `3` | `TokenInvalid` | Token 已失效；服务端已将对应设备置为 `IsActive=false` |

### 15.10 可观测性指标

服务端暴露的推送相关 metrics(可由 Prometheus 兼容端点 `/metrics` 直接 scrape):

| 指标 | 类型 | Label |
|---|---|---|
| `push_sent_total` | Counter | `channel`、`scenario`、`status` |
| `push_latency_seconds` | Histogram | `channel`、`scenario`、`status` |
