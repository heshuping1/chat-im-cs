# 第三方对接指南 — 2026-05-23 服务端新增能力

> 面向第三方开发者的独立对接文档。本批(2026-05-23 发版,镜像 tag `prod-20260523-184859-301a942-server-support`)新增的全部功能、接口、数据结构、鉴权、错误码与典型对接流程都在本文件,**无需翻阅** `admin-api.md` / `client-api.md`。
> 详尽字段定义仍以 `admin-api.md §3.2A++`、`client-api.md §26` 为准;本文件是快速对接版。

---

## 0. 通用约定(先读这一节)

### 0.1 域名与端口路由
- `https://chat.hearteasechat.com` → **客户端/访客** API(`/api/client/v1/*`、`/api/widget/v1/*`、`/health`)。
- `https://admin.hearteasechat.com` → **管理后台** API(`/api/admin/v1/*`)。
- 同一逻辑接口**不要跨域名调**(如 admin 接口只在 admin 域)。

### 0.2 统一响应信封
所有 JSON 接口返回统一结构:
```json
{ "code": "OK", "message": "success", "requestId": "0H...", "data": <业务数据> }
```
- 成功 `code="OK"`;失败 `code` 为错误码(见各节错误码表),HTTP 状态码同时反映(400/401/403/404/409/429/500)。
- 业务数据在 `data`。下文"响应"均指 `data` 内字段。

### 0.3 鉴权
| 端 | 鉴权方式 |
|---|---|
| 客户端 `/api/client/v1/*` | `Authorization: Bearer <租户内 accessToken>` |
| 访客 widget `/api/widget/v1/{tenantCode}/*` | 多数无需登录(以路径 `tenantCode` 定位租户);会话类接口需 `visitorToken` |
| 管理后台 `/api/admin/v1/*` | `Authorization: Bearer <管理端 accessToken>` + 对应**权限码** |
| 员工侧客服工作台 `/api/client/v1/customer-service/*` | 租户内 `accessToken` + **客服身份**(否则 `403 CUSTOMER_SERVICE_STAFF_REQUIRED`) |

### 0.4 分页约定
本批所有管理端列表接口统一返回 `PagedResult<T>`:
```json
{ "items": [ ... ], "page": 1, "pageSize": 20, "total": 137, "hasMore": true }
```
请求用 `page`(从 1 起)、`pageSize`(默认 20,上限 200)。

### 0.5 本批新增权限码(管理端)
| 权限码 | 用途 | 默认授予角色 |
|---|---|---|
| `customer_service.customer.view` | 客户管理(已分配/未分配)只读 | owner / admin / ops / customer_service |
| `conversation.admin.view` | 会话管理只读 | owner / admin / ops |
| `enterprise_broadcast.send` | 企业群发 | owner / admin |
| `client_error.view` / `client_error.manage` | 客户端错误查看 / 处理 | owner / admin / ops |
| `feedback.view` / `feedback.manage` | 用户反馈查看 / 处理 | owner / admin / ops |
| `customer_service.center.freeze` | 客服线程冻结/解冻 | owner / admin / ops |

---

## 1. 功能总览(本批新增 11 块)

| # | 功能 | 端 | 简述 |
|---|---|---|---|
| 1 | 客户管理(已分配/未分配) | 管理端 | 统计概览 + 分页查询,按归属维度盘点客户 |
| 2 | 会话管理 | 管理端 | 后台全量会话(单聊/群/临时)统计 + 分页 |
| 3 | 客户端错误上报 | 客户端+widget+管理端 | 端上报崩溃/异常(指纹聚类),后台查看/处理/统计 |
| 4 | 用户反馈闭环 | 客户端+管理端 | 用户查处理进度;后台受理 |
| 5 | 知识库对人工/客户开放 | 员工+客户+widget | 人工客服检索;客户/访客自助 FAQ |
| 6 | RAG 辅助人工(AI 建议草稿) | 员工 | AI 生成草稿供人工编辑后发出(不直发客户) |
| 7 | 定时消息 | 客户端 | 设定未来时刻自动发送 |
| 8 | 企业群发 | 管理端 | 以企业官方账号身份群发 |
| 9 | 客服线程冻结 | 管理端 | 冻结后双方不可发送,历史可读 |
| 10 | 客户综合卡片(profile-card) | 员工+管理端 | 聚合客户资料/归属/风险/计数 |
| 11 | 企业公告已读统计 | 客户端+管理端 | 客户端上报已读,后台统计已读率 |

> 另有非接口性增强:工作台线程列表新增 VIP/优先级/标签字段 + summary;`/sync` 会话项带 `conversationType`;通话结束自动落 `call_log` 消息;修复 IM 注册用户客服通道 AI 代答未接知识库的问题。

---

## 2. 客户管理(已分配 / 未分配)

**权限**:`customer_service.customer.view`。客户 = 本租户活跃成员中的注册客户(排除官方服务账号)。

### `GET /api/admin/v1/customer-management/summary`
响应 `data`:`totalCustomers`、`assignedCount`、`unassignedCount`、`assignedByStaff[]`(每项 `staffUserId`/`staffName`/`count`)、`generatedAt`。
> 不变量:`assignedCount + unassignedCount == totalCustomers`。

### `GET /api/admin/v1/customer-management/customers`
查询参数:`assignment`(`assigned`/`unassigned`/缺省=全部)、`staffUserId?`、`keyword?`(姓名/账号/LPP号/手机)、`sortBy?`(`createdAt`默认/`assignedAt`/`lastActiveAt`)、`page?`、`pageSize?`。
响应 `data`:`PagedResult<CustomerManagementItem>`。
`CustomerManagementItem`:`userId`、`displayName`、`lppId?`、`mobileMasked?`、`avatarUrl?`、`status`、`assignmentStatus`(`assigned`/`unassigned`)、`assignedStaffUserId?`、`assignedStaffName?`、`assignedAt?`、`lastActiveAt?`、`createdAt`。

---

## 3. 会话管理

**权限**:`conversation.admin.view`。

### `GET /api/admin/v1/conversation-management/summary`
响应:`directCount`、`groupCount`、`tempSessionCount`、`frozenCount`、`serviceConversationCount`、`activeLast24h`、`generatedAt`。

### `GET /api/admin/v1/conversation-management/conversations`
查询参数:`type?`(`direct`/`group`/`temp_session`)、`frozen?`(bool)、`serviceOnly?`(bool,仅客服会话)、`keyword?`(标题)、`page?`、`pageSize?`。
响应:`PagedResult<AdminConversationItem>`。
`AdminConversationItem`:`conversationId`、`type`、`title?`、`memberCount`、`serviceMode`(`0`普通/`1` IM客服/`2` Widget客服)、`isFrozen`、`isArchived`、`lastMessageAt?`、`createdAt`。

---

## 4. 客户端错误上报

### 4.1 端上报(客户端 / widget)
| 端点 | 鉴权 |
|---|---|
| `POST /api/client/v1/client-errors` | 已登录 `accessToken` |
| `POST /api/widget/v1/{tenantCode}/client-errors` | 匿名(无需登录) |

请求体:
```json
{
  "platform": "android",          // android/ios/web/pc
  "appVersion": "1.2.3",          // 可选
  "errorLevel": 2,                 // 可选 1=warn 2=error 3=fatal,默认2
  "errorType": "unhandled",       // crash/unhandled/network/api/render/...
  "message": "NullReference at X", // 必填
  "stackTrace": "at A()\nat B()", // 可选
  "context": { "route": "/chat", "net": "wifi" }, // 可选,任意 JSON
  "clientTimestamp": "2026-05-23T10:00:00+08:00"  // 可选,端上发生时间
}
```
响应:`{ "errorId": "<GUID>" }`。
> **聚类规则**:服务端按 `errorType + message + stack头部` 的 SHA256 指纹合并;同一错误重复上报只累加 `occurrence`、刷新 `lastSeenAt`,不会爆库。已解决/已忽略的错误再次出现会自动复活为"新建"。
> **限额**:`message ≤ 8KB`、`stackTrace ≤ 32KB`、`context ≤ 16KB`,超出截断。`message` 为空返回 `CLIENT_ERROR_MESSAGE_REQUIRED`(400)。

### 4.2 管理端查看/处理
**权限**:查看 `client_error.view`;状态流转 `client_error.manage`。

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/admin/v1/client-errors/` | GET | 分页列表。参数:`status`、`platform`、`errorType`、`errorLevel`、`appVersion`、`keyword`、`from`、`to`、`page`、`pageSize` |
| `/api/admin/v1/client-errors/stats` | GET | 统计(`lookbackDays?`默认7) |
| `/api/admin/v1/client-errors/{errorId}` | GET | 单条详情 |
| `/api/admin/v1/client-errors/{errorId}/status` | POST | `{status, note?}`,写审计 |

`ClientErrorItem`:`errorId`、`userId?`、`platform`、`appVersion?`、`errorLevel`、`errorType`、`message`、`stackTrace?`、`contextJson?`、`clientTimestamp?`、`dedupHash?`、`occurrence`、`status`(`0`新建/`1`受理/`2`已解决/`3`已忽略)、`handledByUserId?`、`handleNote?`、`firstSeenAt`、`lastSeenAt`、`resolvedAt?`。

---

## 5. 用户反馈闭环

- 提交(已有):`POST /api/v1/feedback`(`type`∈complaint/suggestion/bug、`content`≤500、`contactInfo?`、`attachmentUrls?`)。
- **新增** `GET /api/client/v1/feedback/me` — 用户查自己反馈处理进度,返回 `{ items: FeedbackItem[] }`。
- **新增** 管理端(权限 `feedback.view` / `feedback.manage`):
  - `GET /api/admin/v1/feedbacks/`(分页,参数 `type`/`status`/`keyword`/`from`/`to`/`page`/`pageSize`)
  - `GET /api/admin/v1/feedbacks/{feedbackId}`
  - `POST /api/admin/v1/feedbacks/{feedbackId}/status`(`{status, note?}`,回写后用户可在 `feedback/me` 看到)

`FeedbackItem`:`feedbackId`、`userId`、`feedbackType`、`content`、`contactInfo?`、`attachmentUrls[]`、`status`(`0`新建/`1`受理/`2`已处理/`3`已关闭)、`handledByUserId?`、`handleNote?`、`handledAt?`、`createdAt`。

---

## 6. 知识库对人工 / 客户开放

> 知识库文档默认只给 AI 内部用;需管理端把文档标记 `customerVisible=true` 才对客户开放。

### 6.1 人工客服检索/浏览(员工侧,需客服身份)
- `GET /api/client/v1/customer-service/knowledge/search?q=&topK=8&knowledgeBaseId=` → `{ items: [{chunkId, knowledgeBaseId, knowledgeBaseName, documentId, documentTitle, headingPath?, snippet, score}] }`(与 AI 同源混合检索)
- `GET /api/client/v1/customer-service/knowledge/bases` → 启用的知识库列表
- `GET /api/client/v1/customer-service/knowledge/bases/{knowledgeBaseId}/documents` → 启用文档列表

### 6.2 客户/访客自助 FAQ(仅 `customerVisible` 文档)
| 端点 | 鉴权 |
|---|---|
| `GET /api/client/v1/help/articles?q=&page=&pageSize=` | 已登录 |
| `GET /api/client/v1/help/articles/{documentId}` | 已登录 |
| `GET /api/widget/v1/{tenantCode}/help/articles?q=&page=&pageSize=` | 匿名 |
| `GET /api/widget/v1/{tenantCode}/help/articles/{documentId}` | 匿名 |

列表项:`documentId`、`knowledgeBaseId`、`knowledgeBaseName`、`title`、`summary?`、`updatedAt`;详情另含 `content`。不存在/不可见返回 `HELP_ARTICLE_NOT_FOUND`(404)。

---

## 7. RAG 辅助人工(AI 建议草稿)

> 与"AI 直接代答客户"互补:本能力让 AI **只生成草稿**给人工客服参考/编辑,客户收不到任何消息。

员工侧(`/api/client/v1/customer-service/workbench`,需客服身份)。`{threadType}` ∈ `temp_session` / `im_direct`。

| 端点 | 方法 | 说明 |
|---|---|---|
| `/threads/{threadType}/{threadId}/ai-suggestion` | POST | 生成一条建议草稿。可选 `{ customerMessageId }`,缺省取最近一条客户消息 |
| `/threads/{threadType}/{threadId}/ai-suggestions` | GET | 历史建议(`limit?`) |
| `/ai-suggestions/{suggestionId}/adopt` | POST | 标记采纳(实际发送仍走既有工作台发送端点,可预填草稿文本) |

建议对象:`suggestionId`、`threadType`、`threadId`、`customerMessageId?`、`text`、`confidence`(0~1)、`source`(`external_rag`/`external`/`knowledge_fallback`/`builtin_*`/`fallback`)、`sources[]`(知识依据:`knowledgeBaseName`/`documentTitle`/`headingPath?`/`snippet`/`score`)、`model?`、`status`(`0`已生成/`1`已采纳/`2`已弃用)、`createdAt`、`adoptedAt?`。

错误码:`CS_SUGGESTION_NO_CUSTOMER_MESSAGE`(400 无客户消息可据)、`CS_SUGGESTION_NOT_FOUND`(404)、`CS_THREAD_TYPE_INVALID`(400)。

---

## 8. 定时消息

用户设定未来时刻发送一条消息;到点由服务端**按当时的发送权限校验后投递**(等待期内被禁言/拉黑/退群/会话冻结/审核拦截会失败并回传)。

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/client/v1/scheduled-messages` | POST | 创建 |
| `/api/client/v1/conversations/{conversationId}/scheduled-messages` | GET | 本人在该会话的待发任务 |
| `/api/client/v1/scheduled-messages/{scheduledMessageId}` | PUT | 改内容/时间(仅 pending) |
| `/api/client/v1/scheduled-messages/{scheduledMessageId}` | DELETE | 取消(仅 pending) |

创建请求体:
```json
{
  "conversationId": "<GUID>",
  "isGroup": false,
  "messageType": "text",
  "body": { "text": "明天上午提醒客户补资料" },
  "replyToMessageId": null,
  "scheduledAt": "2026-05-24T09:00:00+08:00"   // 须为未来且 ≤ 14 天
}
```
`ScheduledMessageDto`:`scheduledMessageId`、`conversationId`、`isGroup`、`messageType`、`body`、`replyToMessageId?`、`scheduledAt`、`status`(`0`待发/`1`已发/`2`已取消/`3`失败/`4`投递中)、`failureCode?`、`failureReason?`、`sentMessageId?`、`createdAt`、`updatedAt`。

**失败回传**:投递失败时服务端推送实时事件 `scheduled_message.failed`(payload:`scheduledMessageId`、`conversationId`、`reasonCode`、`reason`)到发送者各端。

错误码:`SCHEDULED_MESSAGE_TIME_PAST`(400)、`SCHEDULED_MESSAGE_TIME_TOO_FAR`(400,>14天)、`SCHEDULED_MESSAGE_TYPE_REQUIRED`(400)、`SCHEDULED_MESSAGE_CONVERSATION_NOT_FOUND`(404)、`SCHEDULED_MESSAGE_CONVERSATION_FROZEN`(409)、`SCHEDULED_MESSAGE_CONVERSATION_TYPE_MISMATCH`(400,isGroup 与会话类型不符)、`SCHEDULED_MESSAGE_NOT_A_MEMBER`(403)、`SCHEDULED_MESSAGE_NOT_FOUND`(404)、`SCHEDULED_MESSAGE_FORBIDDEN`(403,非本人)、`SCHEDULED_MESSAGE_NOT_EDITABLE` / `SCHEDULED_MESSAGE_NOT_CANCELABLE`(409,非 pending)。

---

## 9. 企业群发

> 与"客服群发"(`admin-api.md §3.2A+`)的区别:**发送身份是企业官方账号**(非操作人),目标更广,由所有者/管理员发起,记录实际操作人审计。

**权限**:`enterprise_broadcast.send`。Base:`/api/admin/v1/enterprise-broadcasts`。

目标类型 `targetType`:`1`=全体成员(员工+客户)、`2`=企业员工、`3`=企业客户、`4`=官方群(官方账号所在群,逐群群内发一条)。
任务状态 `status`:`0`待投递/`1`投递中/`2`已完成/`3`失败/`4`已取消。

| 端点 | 方法 | 请求 | 响应 `data` |
|---|---|---|---|
| `/preview` | POST | `targetType`、`groupId?` | `recipientCount`、`sampleDisplayNames[]`、`sampleGroupTitles[]`、`sender{officialAccountId,displayName,avatarUrl}` |
| `/` | POST | `targetType`、`groupId?`、`officialAccountId?`(空=企业默认官方账号)、`messageType`、`body`、`auditReason?` | `taskId`、`status`、`totalCount` |
| `/` | GET | `limit?` | `{ items: 任务列表项[] }` |
| `/{taskId}` | GET | — | 详情 + `sender` + `operator{userId,displayName,role}` + `failedRecipients[]` |
| `/{taskId}/retry-failed` | POST | — | `taskId`、`requeuedCount` |
| `/{taskId}/cancel` | POST | — | `taskId`、`status`、`canceledCount`(仅 `0`/`1` 可取消) |

群发**异步投递**:提交后立即返回 `taskId`,通过详情轮询进度。文本经敏感词审核。
错误码:`ENTERPRISE_OFFICIAL_ACCOUNT_MISSING`(404,未配官方账号,预览/提交均拦)、`ENTERPRISE_OFFICIAL_ACCOUNT_MISMATCH`(400)、`ENTERPRISE_BROADCAST_NO_OFFICIAL_GROUPS`(400)、`ENTERPRISE_BROADCAST_NO_RECIPIENTS`(400)、`ENTERPRISE_BROADCAST_TOO_MANY_RECIPIENTS`(400)、`ENTERPRISE_BROADCAST_BLOCKED_BY_MODERATION`(400)、`ENTERPRISE_BROADCAST_RATE_LIMITED`(429)、`ENTERPRISE_BROADCAST_NOT_FOUND`(404)、`ENTERPRISE_BROADCAST_RETRY_UNSUPPORTED`(400,官方群无逐人重试)、`ENTERPRISE_BROADCAST_NOT_CANCELABLE`(400)。

---

## 10. 客服线程冻结 / 解冻

冻结客服线程后双方均不可发送(历史可读),底层等价于冻结其承载会话,操作写审计。
**权限**:`customer_service.center.freeze`(或 `customer_service.center.force_close`)。`{threadType}` ∈ `temp_session` / `im_direct`(兼容 `direct_customer`)。

- `POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/freeze` — 可选 `{ reason }`
- `POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/unfreeze`

被冻结后,客户/客服发送被拦时返回 `CS_THREAD_FROZEN`(403)。

---

## 11. 客户综合卡片(profile-card)

聚合客户基础资料、归属、风险等级(取其客服线程最高风险)、隐私设置、会话/工单/好友计数;**交易类数据以 `externalSections[]` 插槽返回**(本系统无交易域,默认空,接了外部交易系统的租户可填充)。

- 管理端:`GET /api/admin/v1/customer-service/center/customers/{customerUserId}/profile-card`(权限 `customer_service.center.view` 或 `customer_service.customer.view`)
- 员工工作台(按线程):`GET /api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/profile-card`

主要字段:`customerUserId`、`displayName`、`lppId?`、`avatarUrl?`、`mobileMasked?`、`emailMasked?`、`status`、`assignedStaffUserId?`、`assignedStaffName?`、`assignedAt?`、`riskLevel`、`riskReasonsJson?`、`privacy{searchableByMobile,searchableByLppId,allowFriendRequest,profileVisibility}`、`isVip`、`tabCounts{sessions,openThreads,feedbacks,friends}`、`externalSections[]`、`lastActiveAt?`、`createdAt`、`generatedAt`。
> App 端取摘要子集、PC 端取全量;前端不需要两套字段定义。

---

## 12. 企业公告已读统计

- 客户端上报:`POST /api/client/v1/enterprise/announcements/{announcementId}/read`(幂等)。
- 管理端统计:`GET /api/admin/v1/announcements/{announcementId}/read-stats?page=&pageSize=`(权限 `announcement.manage`)→ `announcementId`、`totalRecipients`、`readCount`、`unreadCount`、`readers`(`PagedResult<{userId,displayName,readAt}>`)。

---

## 13. 工作台线程列表增强(非新端点,字段补充)

`GET /api/client/v1/customer-service/workbench/threads`(员工侧):
- 线程项新增:`isVip`(bool)、`customerLevel?`、`priority?`(`normal`/`high`/`urgent`)、`tags`(string[])。
- 响应顶层新增:`summary { allCount, queuedCount, activeCount, vipCount }`。

`isVip` 由**服务端统一判定**(优先级/等级/标签命中 VIP/重要/高价值/重点客户),客户端不必各自推断;`summary` 缺失时客户端可本地兜底。

`/sync` 返回的会话项(`SyncConversationItem`)新增 `conversationType`(`direct`/`group`/`temp_session`),便于把进行中的客服临时会话从普通 IM 列表中过滤。

---

## 14. 典型对接流程示例

### 14.1 自助 FAQ(客户端 / 访客)
1. (访客)先 `GET /api/widget/v1/{tenantCode}/config` 拿配置;(已登录客户)直接用 accessToken。
2. `GET .../help/articles?q=关键词&page=1&pageSize=20` 列表 → 取 `documentId`。
3. `GET .../help/articles/{documentId}` 取全文 `content` 展示。
4. 文章为空/被下架 → `HELP_ARTICLE_NOT_FOUND`(404),前端展示"暂无相关内容"。

### 14.2 定时消息(客户端)
1. `POST /scheduled-messages` 提交(`scheduledAt` 未来且 ≤14 天)→ 拿 `scheduledMessageId`。
2. 进入会话页时 `GET /conversations/{id}/scheduled-messages` 渲染"待发"列表。
3. 用户改/撤 → `PUT` / `DELETE`(仅 `status=0` 可操作)。
4. 订阅实时事件;收到 `scheduled_message.failed` 则把对应任务标记失败 + 提示 `reason`。

### 14.3 企业群发(管理端)
1. `POST /enterprise-broadcasts/preview`(选 `targetType`)→ 看 `recipientCount` + 样本 + `sender`(确认官方账号)。
   - 若 `ENTERPRISE_OFFICIAL_ACCOUNT_MISSING` → 提示"请先配置企业官方账号"。
2. `POST /enterprise-broadcasts` 提交 → 拿 `taskId`。
3. 轮询 `GET /enterprise-broadcasts/{taskId}` 看 `sentCount`/`failedCount`/`status`。
4. 有失败 → `POST .../retry-failed`;想中止未发部分 → `POST .../cancel`。

### 14.4 客户端错误监控(端 + 后台)
1. 端侧全局异常钩子 → `POST /api/client/v1/client-errors`(或匿名 widget 版)。
2. 后台 `GET /api/admin/v1/client-errors/stats` 看趋势,`GET /client-errors/` 列表筛 `status=0`。
3. 排查后 `POST /client-errors/{id}/status`(`1`受理 → `2`已解决)。

---

## 15. 数据库结构(供自建报表/数据对接参考,只读)

本批新增表(均在 `im` schema,均开 RLS 租户隔离;**第三方禁止直写**,仅供数据团队只读对接):
- `client_error_reports` — 客户端错误聚类
- `scheduled_messages` — 定时消息任务
- `cs_ai_suggestions` — AI 建议草稿
- `enterprise_broadcast_tasks` / `enterprise_broadcast_recipients` — 企业群发任务/收件人
- `announcement_reads` — 公告已读记录
- `temp_session_knowledge_documents` 新增列 `customer_visible`(对客户可见)

迁移文件:`database/postgresql/migrations/20260523_01..07`。
