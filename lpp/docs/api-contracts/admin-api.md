# 管理后台 API 文档

> 文档校对快照：2026-05-22

Base URL：`/api/admin/v1`

本文档面向管理后台前端、运维后台和内部工具开发者，覆盖：

- 管理后台认证
- 租户内管理能力
- 音视频运维管理
- 平台级多租户管理

字段、枚举、匿名响应与 DTO 速查见 [admin-api-reference.md](./admin-api-reference.md)。
通用字段与跨文档枚举补遗见 [field-enum-reference.md](./field-enum-reference.md)。

## 1. 鉴权与边界

### 1.1 公开接口

以下接口允许未登录访问：

- `GET /api/admin/v1/public/media/{mediaId}`
- `GET /api/admin/v1/auth/captcha/check`
- `POST /api/admin/v1/auth/captcha/generate`
- `POST /api/admin/v1/auth/login`

### 1.2 登录方式

管理端登录走：

```text
POST /api/admin/v1/auth/login
```

请求体核心字段：

- `loginName`
- `password`
- `deviceId?`
- `captchaToken?`
- `captchaAnswer?`

请求头要求：

- `X-Tenant-Id`

请求体字段表：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `loginName` | string | 是 | 管理员登录名 |
| `password` | string | 是 | 管理员密码 |
| `deviceId` | GUID? | 否 | 设备 ID；建议同一浏览器保持稳定值 |
| `captchaToken` | string? | 否 | 图形验证码 token |
| `captchaAnswer` | string? | 否 | 图形验证码答案 |
| `tenantId` | GUID? | 否 | 可在请求体中指定租户 ID，优先级低于 `X-Tenant-Id` 请求头 |
| `tenantCode` | string? | 否 | 可在请求体中指定租户编码，优先级低于 `tenantId` |

响应分支：

`/auth/login` 在两种情况下返回两种不同的 `data` 形状：

**(A) 已确定租户上下文,签发管理端 token：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `selectionRequired` | bool | `false`，表示已直接登录 |
| `tenantId` | GUID | 当前登录的租户 ID |
| `tenantCode` | string? | 当前登录的租户编码 |
| `tenantName` | string? | 当前登录的租户名称 |
| `userId` | GUID | 当前管理员用户 ID |
| `displayName` | string | 当前管理员显示名 |
| `accessToken` | string | 管理端访问 token |
| `expiresIn` | int | token 有效秒数 |
| `roleCodes` | string[] | 当前管理员拥有的角色编码列表 |
| `permissionCodes` | string[] | 当前管理员拥有的权限编码列表 |
| `isPlatformAdministrator` | bool | 是否为平台超级管理员 |

**(B) 凭据匹配多个租户、需要二次选择：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `selectionRequired` | bool | `true`,表示需要客户端展示租户选择页 |
| `availableTenants` | `TenantSummary[]` | 该凭据可登录的全部租户列表 |

`TenantSummary` 字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | Logo URL |
| `membershipRole` | short | 在该租户内的成员角色 |

客户端收到分支 (B) 后,引导用户挑选一个租户,然后用 `/auth/select-tenant` 完成登录。

补充：

- 已校验该用户在所选租户内拥有管理权限,否则视为登录失败
- 管理端登录必须显式给出租户上下文；当前要求在请求头传 `X-Tenant-Id`,或在请求体提供 `tenantId` / `tenantCode`
- 管理端登录建议在同一浏览器中保持稳定 `deviceId`
- 管理端当前返回的是 `accessToken`,不返回 `refreshToken`
- `roleCodes` 和 `permissionCodes` 可用于前端动态控制菜单和功能入口的显示

### 1.3 平台 Token 选择租户登录管理端

管理端还支持通过平台 Token 选择租户进入管理后台：

```text
POST /api/admin/v1/auth/select-tenant
```

请求体：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `tenantId` | GUID | 是 | 目标租户 ID |

请求头要求：

- `Authorization: Bearer {platformToken}`

响应 `data` 字段与 `/auth/login` 分支 (A) 一致,包含 `tenantId`、`tenantCode`、`tenantName`、`userId`、`displayName`、`accessToken`、`expiresIn`、`roleCodes`、`permissionCodes`、`isPlatformAdministrator`。

补充：

- 需要有效的平台 Token（通过 `/api/platform/v1/auth/login` 获取）
- 目标用户必须在该租户内拥有管理后台权限
- 适用于平台管理员需要跨租户管理的场景

### 1.4 权限层级

管理端接口大体分三类：

| 范围 | 路径前缀 | 说明 |
|---|---|---|
| 租户内后台 | `/api/admin/v1/*` | 面向当前租户的用户、群、配置、告警、BOT、导出等后台能力 |
| 音视频运维 | `/api/admin/v1/voicecall/*` | 面向当前租户的音视频节点、通话、录音运维 |
| 平台管理 | `/api/admin/v1/platform/*` | 平台级租户、平台用户、租户用户、加入审批等多租户管理能力 |

### 1.4A 可进入管理后台的角色

能登录管理后台（调用 `/api/admin/v1/*`）的角色共 7 个。每个具体接口在此基础上再用 `permissionCodes` 做细粒度校验，登录身份只决定"能不能进"，不直接等于"能做什么"。

| `role_code` | 名称 | 典型职责 |
|---|---|---|
| `platform_admin` | 平台超级管理员 | 跨租户最高权限：开通/停用租户、平台账号、平台统计与全部业务能力 |
| `tenant_owner` | 租户主账号 | 本租户最高负责人，可管理成员、群组、配置、客服、运维及租户级角色权限 |
| `tenant_admin` | 租户管理员 | 本租户日常管理者，可管理用户/群组/客服/运维/系统配置，但不能改角色权限本身 |
| `ops_operator` | 运营运维专员 | 用户治理、群组治理、客服调度、Webhook/投递/告警/健康度处理；无角色管理与系统配置权限 |
| `customer_service` | 客服坐席 | 客服工作台：接待、临时会话、快捷回复、知识库、客户归属转交、消息检索 |
| `audit_operator` | 审计合规员 | 以只读为主：审计日志、登录日志、消息检索、扩展资料查看、数据导出 |
| `config_operator` | 配置管理员 | 系统级配置：系统配置、健康度、通知渠道、推送、公告、语音节点 |

判定与查询：

- 一个账号是否能进某租户后台，取决于它在该租户被授予了上述 7 个角色之一（平台超管对所有租户成立）
- APP / 多租户场景下，账号可先用平台 Token 调 `GET /api/platform/v1/my/admin-tenants` 查"自己在哪些租户、以什么角色可进后台"，再换发对应租户的管理端 Token（见下方 §1.4B）
- 登录 / 换票响应里的 `roleCodes`、`permissionCodes` 可用于前端动态控制菜单与功能入口

### 1.4B APP 端用平台 Token 进入管理后台

除浏览器端的 `/auth/login`（§1.2）和 `/auth/select-tenant`（§1.3）外，APP 端可凭平台 Token 直接换发管理端 Token：

```text
POST /api/platform/v1/auth/admin-token
```

请求体 `{ tenantId }`，响应含 `accessToken`（管理端 JWT）、`refreshToken`、`expiresIn`（通常 21600=6 小时）、`roleCodes`、`permissionCodes`、`isPlatformAdministrator` 等。完整字段、切换租户语义与错误码（`ADMIN_FORBIDDEN` / `AUTH_NO_TENANT_USER` / `TENANT_NOT_ACTIVE`）见 [client-api.md §1.4.3](./client-api.md)。

关键点：

- 换发前应先用 `GET /api/platform/v1/my/admin-tenants` 确认账号确有管理角色，否则换发会返回 `403 ADMIN_FORBIDDEN`
- 拿到的 `accessToken` 与 `/auth/login` 颁发的管理端 Token 完全等价，可调用所有 `/api/admin/v1/*`
- Token 续期走标准 `POST /api/client/v1/auth/refresh`（用 `refreshToken` 换新 access + 新 refresh），无需重新换发；仅在 `refreshToken` 过期或切换租户时才需重新调本接口
- 退出登录调 `POST /api/platform/v1/account/sign-out`，会按设备撤销该账号的平台与管理端全部 session（见 [client-api.md §1.4.4](./client-api.md)）

### 1.5 当前管理员资料

#### `GET /api/admin/v1/me`

返回当前登录管理员的资料和权限快照,供前端在加载主框架时一次性拉取。

权限：任何已登录管理员。

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 当前管理员用户 ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 URL |
| `mobile` | string? | 手机号 |
| `email` | string? | 邮箱 |
| `roleCodes` | string[] | 当前管理员拥有的角色编码列表 |
| `permissionCodes` | string[] | 当前管理员拥有的权限编码列表 |

#### `POST /api/admin/v1/me/password`

当前管理员修改自己的登录密码。

权限：任何已登录管理员。

请求体：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `currentPassword` | string | 是 | 当前密码 |
| `newPassword` | string | 是 | 新密码,至少 8 个字符 |

响应 `data`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 当前管理员用户 ID |
| `updated` | bool | 固定为 `true` |

错误码:

| 错误码 | 触发条件 |
|---|---|
| `ADMIN_INVALID_PASSWORD` | 新密码不满足最小长度要求 |
| `ADMIN_CURRENT_PASSWORD_MISMATCH` | 当前密码错误 |

补充:

- 密码修改成功后,**该管理员的其它活跃 session 会被服务端撤销**,需重新登录
- 当前 session 通常会被保留,但客户端仍应在收到响应后刷新本地凭据状态

## 2. 通用响应约定

### 2.1 普通 JSON 响应

统一响应包：

```json
{
  "code": "OK",
  "message": "success",
  "requestId": "01...",
  "data": {}
}
```

`code` 字段约定:

- 成功时固定为 `"OK"`
- 失败时为大写蛇形命名,如 `ADMIN_INVALID_PASSWORD`、`AI_SERVICE_CONFIG_NOT_FOUND`、`AUTH_DEVICE_BOUND_RECENTLY_ACTIVE`
- 全部错误码总览见 §13 错误码总览

**例外:** 以下端点**不**使用上述统一响应壳,直接返回 `{ success, data }` 形式:

- `GET /api/admin/v1/ai-service/providers`
- `GET /api/admin/v1/ai-service/embedding-models`
- `GET /api/admin/v1/ai-service/reranker-models`
- `GET /api/admin/v1/ai-service/rag-fusion-strategies`

它们是 AI 配置中心的 preset 元数据接口,体格如:

```json
{
  "success": true,
  "data": [ /* preset 列表 */ ]
}
```

任何已登录管理员均可访问这 4 个 preset 路由,不需要 `ai_service.config.manage` 权限。

### 2.2 列表返回形式

管理端列表目前主要有两种返回风格:

| 形式 | 示例 |
|---|---|
| 直接数组 | `/verification-codes`、`/alert-rules`、`/platform/tenants` |
| `CursorPage` 风格 | 大部分后台列表(如 `/users`、`/groups`、`/webhook-deliveries`、`/voicecall/sessions`、`/voicecall/recordings` 等)返回 `{ items, nextCursor }`,当前许多接口 `nextCursor=null`,客户端按 cursor 翻页时遇到 null 即认为结束 |

两种列表容器的结构:

直接数组:

```json
[
  {}
]
```

`CursorPage`:

```json
{
  "items": [],
  "nextCursor": null
}
```

字段说明:

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array | 当前页数据 |
| `nextCursor` | string? | 下一页游标;空(`null`)表示已到末页 |

### 2.3 文件下载

以下接口直接返回文件流，而不是 JSON：

- `GET /api/admin/v1/public/media/{mediaId}`
- `GET /api/admin/v1/voicecall/recordings/{recordingId}/download`
- `GET /api/admin/v1/export-tasks/{taskId}/download`

## 3. 模块总览

### 3.1 认证与公共资源

- 验证是否需要图形验证码
- 生成图形验证码题目
- 管理端登录
- 公开访问后台上传后的公共媒体

### 3.2 租户内后台

主要覆盖：

- 仪表盘
- 用户管理
- 群管理
- 消息搜索与撤回
- 服务账号（详见 §3.2G）、BOT 应用（详见 §3.2F）
- Webhook 投递监控（详见 §3.2I）
- 系统配置、配置历史与回滚（详见 §3.2J）
- 审计日志
- 服务健康检查
- 在线用户
- 用户治理能力（详见 §3.2C）
  - 禁用 / 启用
  - 强制下线
  - 禁言 / 影子禁言
  - 禁言状态查询
  - 速率限制
  - 强制资料
  - 管理员备注
  - 治理摘要查询
  - 重置密码
  - 角色管理
  - 客户当前归属客服查看 / 改绑
  - 默认官方账号查看
- 群治理能力（详见 §3.2E）
  - 群详情查询
  - 成员禁言
  - 全员禁言
  - 冻结会话
  - 解散群
  - 移除成员
- 角色与权限管理（详见 §3.2H）
- 验证码记录和验证码配置（详见 §3.2K）
- 媒体上传
- 告警规则 / 告警历史（详见 §3.2L）
- 通知渠道（详见 §3.2M）
- 公告（详见 §3.2N）
- 登录日志
- 批量启用 / 禁用用户
- 导出任务（详见 §3.2O）
- 会话转移
- 仪表盘 V2（详见 §3.2P）
- 统一客服中心
- 临时会话（访客客服）专属治理

补充：

- 服务账号管理支持创建、编辑和删除官方服务账号；删除后可按最新配置重建并回填客户好友关系
- 公告管理支持编辑公告，并支持通过 `targetScope=role + targetCode` 做角色定向投放
- 访客客服员工工作台仅开放给 `userType=2` 且 `membershipRole>=2(customer_service)` 的租户员工
- 管理后台的客服运营主入口已经变成 `/api/admin/v1/customer-service/center/*`
- `/api/admin/v1/customer-service/temp-sessions/*` 现在主要保留给访客临时会话专属配置、知识库、AI、黑名单、敏感词和兼容路径

其中和"员工离职 / 调岗 / 客户接待"最相关的能力有两条：

- 单客户客服归属管理
  - 在租户成员详情中查看客户的默认官方账号、当前归属客服、可分配客服列表
  - 支持"自动分配""改绑不转交""改绑并转交会话"
- 客户归属工作台
  - 独立员工 / 客服列表
  - 独立客户归属列表
  - 按员工批量转交当前负责客户（详见 §3.2D）
- 统一客服中心
  - 统一看板、统一线程池、统一客服状态
  - 同时处理 `temp_session` 和 `direct_customer`
  - 支持线程转派和强制关闭
- 整体会话转移
  - 面向员工离职、整包移交场景
  - 会把原员工的客户单聊和群成员身份整体转给新员工

### 3.2A 统一客服中心与临时会话域

管理后台现在要把客服能力分成两层来理解。

第一层是统一客服中心，主入口是：

- `GET /api/admin/v1/customer-service/center/dashboard`
- `GET /api/admin/v1/customer-service/center/staff-statuses`
- `GET /api/admin/v1/customer-service/center/threads`
- `GET /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}`
- `POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/assign`
- `POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/force-close`
- `GET /api/admin/v1/customer-service/center/customers/service-history`
- `GET /api/admin/v1/customer-service/center/staff/{staffUserId}/service-history`

这一层是新后台和新运营工具应该优先接的主入口。它统一覆盖：

- `temp_session`：访客临时会话
- `direct_customer`：已注册客户客服线程

其中 `GET .../center/customers/service-history` 按客户身份聚合其跨频道（临时会话 + 直聊客服）历史，查询参数（`customerUserId` / `visitorUserId` / `customerId` 择一，加 `limit` / `cursor`）与响应字段与客户端同名接口一致，详见 [client-api.md §12.11A1](./client-api.md)。

`GET .../center/staff/{staffUserId}/service-history` 按**接待人**聚合：返回指定客服"曾参与"的跨频道历史会话（当前归属是他 **或** 转接历史里他是 from/to，已转交出去的也会出现）。查询参数 `threadType`(`temp_session`/`im_direct`)、`status`、`limit`、`cursor`；响应 `{ items, nextCursor }`，每项在客户端 §12.11A1 字段基础上额外带 `participation`(`current_owner`/`transferred`)。权限：`customer_service.center.view` 或 `customer_service.temp_session.view`。客户端（客服本人自查）同名接口见 [client-api.md §12.11A1b](./client-api.md)。

第二层是临时会话域专属能力，主入口仍然是：

- `/api/admin/v1/customer-service/temp-sessions/config*`
- `/api/admin/v1/customer-service/temp-sessions/knowledge-bases*`
- `/api/admin/v1/customer-service/temp-sessions/visitors*`
- `/api/admin/v1/customer-service/temp-sessions/blacklist*`
- `/api/admin/v1/customer-service/temp-sessions/sensitive-words*`

这一层主要负责：

- Widget / AI / 知识库 / 黑名单 / 敏感词等 temp 域治理
- 旧后台界面的兼容访问

权限上也建议按这两层理解：

- 统一客服中心主权限：`customer_service.center.view`、`customer_service.center.manage`、`customer_service.center.force_close`
- 临时会话兼容权限：`customer_service.temp_session.*`

### 3.2A+ 客服主动群发

> 自 2026-05-22 起新增。

客服可以主动发起群发，把同一条消息一次性发给一批成员，三种目标方式：

- **全租户成员**：给本租户每个活跃成员各开一个单聊，逐人私聊投递。
- **某个群的成员（逐人私聊）**：把目标群的成员展开，给每个成员单独私聊（不在群里出现）。
- **某个群（群内群发）**：直接在该群会话里发一条消息，群里所有成员在群聊中看到。

要点：

- 群发以**发起人本人的身份**发出。成员收到的是来自该客服的真实单聊/群消息，可以正常回复。
- 群目标只能选**发起人本人是成员的群**；不是该群成员会被拒绝。
- 支持的消息类型：`text`、`markdown`、`image`、`video`、`voice`、`file`、`contact_card`、`location`（与单聊消息体一致）。`event` 类型不允许群发。
- 群发是**异步投递**：提交后立即返回任务 ID，实际发送在后台进行。通过任务详情查询进度（成功 / 失败 / 跳过计数）。
- **发出后不可撤回**。文本内容会经过敏感词审核；命中拦截词会在提交时被拒。
- 发给已被对方拉黑、已注销的成员会被记为「跳过」，不计为失败。
- 有频率限制：同一操作者单位时间内的群发提交次数有上限，超出返回 `429`。

所有端点都在管理端，需管理端 `accessToken`，且操作者需要 `customer_service.broadcast.send` 权限。

#### 3.2A+.1 `POST /api/admin/v1/customer-service/broadcasts/preview`

干跑预览。解析目标范围，返回将影响多少人和样本展示名，供前端二次确认，不会真正发送。

权限：管理端 `accessToken`，需 `customer_service.broadcast.send`

请求体：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `targetType` | number | 是 | 目标方式：`1`=全租户成员；`2`=某群成员逐人私聊；`3`=某群群内群发 |
| `groupId` | GUID? | 当 `targetType` 为 2/3 时必填 | 目标群会话 ID |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `targetType` | number | 回显目标方式 |
| `groupId` | GUID? | 回显群 ID |
| `recipientCount` | number | 将影响的成员数（私聊=去重后的目标成员数；群内=群活跃成员数） |
| `groupTitle` | string? | 目标群标题（选了群时） |
| `sampleDisplayNames` | string[] | 部分目标成员的展示名样本 |

错误码：

| code | HTTP | 触发条件 |
|---|---|---|
| `CS_BROADCAST_INVALID_TARGET` | 400 | `targetType` 不在 1/2/3 |
| `CS_BROADCAST_GROUP_REQUIRED` | 400 | 群目标但未传 `groupId` |
| `CS_BROADCAST_GROUP_NOT_ALLOWED` | 400 | 全租户目标却传了 `groupId` |
| `CS_BROADCAST_GROUP_NOT_FOUND` | 404 | 目标群不存在 |
| `CS_BROADCAST_NOT_A_GROUP` | 400 | 目标会话不是群 |
| `CS_BROADCAST_GROUP_UNAVAILABLE` | 400 | 目标群已归档或已冻结 |
| `CS_BROADCAST_GROUP_FORBIDDEN` | 403 | 发起人不是该群成员 |

#### 3.2A+.2 `POST /api/admin/v1/customer-service/broadcasts/`

提交群发任务。校验通过后立即返回任务 ID，投递在后台异步进行。

权限：管理端 `accessToken`，需 `customer_service.broadcast.send`

请求体：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `targetType` | number | 是 | 同上 |
| `groupId` | GUID? | 当 `targetType` 为 2/3 时必填 | 目标群会话 ID |
| `messageType` | string | 是 | `text`/`markdown`/`image`/`video`/`voice`/`file`/`contact_card`/`location` |
| `body` | object | 是 | 消息体，结构同单聊消息体 `MessageBodyDto`（见 `field-enum-reference.md`）。媒体类型先用管理端媒体上传拿到 URL 再填入对应字段 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `taskId` | GUID | 群发任务 ID |
| `status` | number | 任务状态（提交后为 `0`=待投递） |
| `totalCount` | number | 解析出的目标总数 |

错误码：

| code | HTTP | 触发条件 |
|---|---|---|
| `CS_BROADCAST_INVALID_TYPE` | 400 | `messageType` 不支持 |
| `CS_BROADCAST_BODY_INVALID` | 400 | 消息体与类型不匹配（如 `image` 缺图片字段、`text` 文本为空） |
| `CS_BROADCAST_NO_RECIPIENTS` | 400 | 目标范围内没有可投递成员 |
| `CS_BROADCAST_TOO_MANY_RECIPIENTS` | 400 | 目标人数超过单任务上限 |
| `CS_BROADCAST_BLOCKED_BY_MODERATION` | 400 | 文本命中敏感词被拦截 |
| `CS_BROADCAST_RATE_LIMITED` | 429 | 群发提交频率超限 |
| `CS_BROADCAST_GROUP_FORBIDDEN` | 403 | 发起人不是该群成员 |

（群目标相关的 4xx 同 §3.2A+.1。）

#### 3.2A+.3 `GET /api/admin/v1/customer-service/broadcasts/`

群发任务列表。

权限：管理端 `accessToken`，需 `customer_service.broadcast.send`

请求参数（Query String）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `mine` | bool? | 否 | `true` 只返回当前操作者发起的任务；默认 `false`（本租户全部） |
| `limit` | number? | 否 | 返回条数上限，默认 50 |

响应 `data`：`{ items: CsBroadcastListItem[] }`，每项字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `taskId` | GUID | 任务 ID |
| `operatorUserId` | GUID | 发起人 ID |
| `operatorDisplayName` | string? | 发起人展示名 |
| `targetType` | number | 目标方式 1/2/3 |
| `targetGroupId` | GUID? | 目标群 ID |
| `targetGroupTitle` | string? | 目标群标题 |
| `messageType` | string | 消息类型 |
| `textPreview` | string? | 内容预览 |
| `status` | number | 任务状态：`0`=待投递 `1`=投递中 `2`=已完成 `3`=失败 |
| `totalCount` | number | 目标总数 |
| `sentCount` | number | 成功投递数 |
| `failedCount` | number | 失败数 |
| `skippedCount` | number | 跳过数（黑名单/已注销等） |
| `createdAt` | string | 创建时间（ISO8601） |
| `completedAt` | string? | 完成时间 |

#### 3.2A+.4 `GET /api/admin/v1/customer-service/broadcasts/{taskId}`

任务详情 + 进度 + 失败/跳过明细。

权限：管理端 `accessToken`，需 `customer_service.broadcast.send`

请求参数（Query String）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `failedLimit` | number? | 否 | 返回失败/跳过明细的条数上限，默认 100 |

响应 `data`：在列表项字段基础上增加：

| 字段 | 类型 | 说明 |
|---|---|---|
| `failureReason` | string? | 任务级失败原因（`status`=3 时） |
| `updatedAt` | string | 最近更新时间 |
| `failedRecipients` | object[] | 失败/跳过明细，每项：`targetUserId`(GUID)、`displayName`(string?)、`status`(number，`2`=失败 `3`=跳过)、`errorCode`(string?)、`retryCount`(number) |

错误码：

| code | HTTP | 触发条件 |
|---|---|---|
| `CS_BROADCAST_NOT_FOUND` | 404 | 任务不存在 |

#### 3.2A+.5 `POST /api/admin/v1/customer-service/broadcasts/{taskId}/retry-failed`

把该任务的失败收件人重新排队，等待下一轮自动投递。仅对私聊模式任务有效。

权限：管理端 `accessToken`，需 `customer_service.broadcast.send`

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `taskId` | GUID | 任务 ID |
| `requeuedCount` | number | 被重新排队的失败收件人数 |

错误码：

| code | HTTP | 触发条件 |
|---|---|---|
| `CS_BROADCAST_NOT_FOUND` | 404 | 任务不存在 |
| `CS_BROADCAST_RETRY_UNSUPPORTED` | 400 | 群内群发任务没有逐收件人重试 |

### 3.2A++ 2026-05-23 服务端补全(客户/会话管理、企业群发、客户端错误、用户反馈、客服线程冻结、客户综合卡片、公告已读)

> 自 2026-05-23 起新增。统一约定:所有端点均需管理端 `accessToken`;分页响应统一为 `PagedResult<T>`(字段:`items[]`、`page`、`pageSize`、`total`、`hasMore`)。

#### 3.2A++.1 `GET /api/admin/v1/customer-management/summary` — 客户管理统计

按「已分配 / 未分配」维度返回客户统计概览。客户 = 本租户活跃成员中 `userType=1` 的注册客户(排除官方服务账号)。「未分配」= 没有归属客服记录的客户。

权限:`customer_service.customer.view`

响应 `data`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalCustomers` | number | 客户总数 |
| `assignedCount` | number | 已分配客户数 |
| `unassignedCount` | number | 未分配客户数 |
| `assignedByStaff` | object[] | 各客服已分配数:`staffUserId`(GUID)、`staffName`(string)、`count`(number) |
| `generatedAt` | string | 生成时间(ISO8601) |

#### 3.2A++.2 `GET /api/admin/v1/customer-management/customers` — 客户管理分页查询

权限:`customer_service.customer.view`

请求参数(Query String):

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `assignment` | string? | 否 | `assigned`=仅已分配;`unassigned`=仅未分配;其它/缺省=全部 |
| `staffUserId` | GUID? | 否 | 限定某客服的客户(配合 `assignment=assigned` 或全部) |
| `keyword` | string? | 否 | 匹配姓名/账号/LPP号/手机 |
| `sortBy` | string? | 否 | `createdAt`(默认)/`assignedAt`/`lastActiveAt` |
| `page` | number? | 否 | 页码,默认 1 |
| `pageSize` | number? | 否 | 每页条数,默认 20,上限 200 |

响应 `data`:`PagedResult<CustomerManagementItem>`,每项字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 客户用户 ID |
| `displayName` | string | 昵称 |
| `lppId` | string? | LPP 号 |
| `mobileMasked` | string? | 手机号掩码 |
| `avatarUrl` | string? | 头像 |
| `status` | number | 用户状态(`1`=正常) |
| `assignmentStatus` | string | `assigned` / `unassigned` |
| `assignedStaffUserId` | GUID? | 归属客服 ID |
| `assignedStaffName` | string? | 归属客服名 |
| `assignedAt` | string? | 分配时间 |
| `lastActiveAt` | string? | 最近活跃时间 |
| `createdAt` | string | 创建时间 |

#### 3.2A++.3 `GET /api/admin/v1/conversation-management/summary` — 会话管理统计

后台全量会话(单聊/群聊/临时会话)统计概览。

权限:`conversation.admin.view`

响应 `data`:`directCount`、`groupCount`、`tempSessionCount`、`frozenCount`、`serviceConversationCount`(客服会话数)、`activeLast24h`(24h 内有消息)、`generatedAt`,均为 number(末项为时间字符串)。

#### 3.2A++.4 `GET /api/admin/v1/conversation-management/conversations` — 会话管理分页查询

权限:`conversation.admin.view`

请求参数(Query String):`type`(`direct`/`group`/`temp_session`)、`frozen`(bool)、`serviceOnly`(bool,仅客服会话)、`keyword`(标题)、`page`、`pageSize`。

响应 `data`:`PagedResult<AdminConversationItem>`,每项:`conversationId`(GUID)、`type`(string)、`title`(string?)、`memberCount`(number)、`serviceMode`(number,`0`普通/`1` IM 客服/`2` Widget 客服)、`isFrozen`(bool)、`isArchived`(bool)、`lastMessageAt`(string?)、`createdAt`(string)。

#### 3.2A++.5 企业群发(`/api/admin/v1/enterprise-broadcasts`)

与「客服群发」(§3.2A+)的区别:**发送身份是企业官方账号**(非操作人),目标是 `all_members`/`staff`/`customers`/`official_groups`,由所有者/管理员发起,记录实际操作人用于审计。

权限:`enterprise_broadcast.send`(默认仅 `tenant_owner` / `tenant_admin`)。

目标类型(`targetType`):`1`=全体成员(员工+客户)、`2`=企业员工、`3`=企业客户、`4`=官方群(官方账号所在群,逐群群内发一条)。任务状态(`status`):`0` 待投递 / `1` 投递中 / `2` 已完成 / `3` 失败 / `4` 已取消。

端点:

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/enterprise-broadcasts/preview` | 干跑预览:返回 `recipientCount`、`sampleDisplayNames[]`、`sampleGroupTitles[]`、`sender`(官方账号)。请求体:`targetType`、`groupId?` |
| POST | `/enterprise-broadcasts` | 提交任务。请求体:`targetType`、`groupId?`、`officialAccountId?`(空则取企业默认官方账号)、`messageType`、`body`(同单聊 `MessageBodyDto`)、`auditReason?`。返回 `taskId`、`status`、`totalCount` |
| GET | `/enterprise-broadcasts` | 任务列表(`limit?`)。每项含 `taskId`、`operatorUserId`、`operatorDisplayName`、`operatorRole`、`officialAccountId`、`officialDisplayName`、`targetType`、`status`、`totalCount`、`sentCount`、`failedCount`、`skippedCount`、`createdAt`、`completedAt` |
| GET | `/enterprise-broadcasts/{taskId}` | 任务详情:`sender{officialAccountId,displayName,avatarUrl}`、`operator{userId,displayName,role}`、计数、`failureReason`、`failedRecipients[]`(`targetUserId`/`displayName`/`status`/`errorCode`/`retryCount`) |
| POST | `/enterprise-broadcasts/{taskId}/retry-failed` | 失败收件人重排队。返回 `taskId`、`requeuedCount` |
| POST | `/enterprise-broadcasts/{taskId}/cancel` | 取消未投递部分(仅 `0`/`1` 状态可取消)。返回 `taskId`、`status`、`canceledCount` |

关键错误码:`ENTERPRISE_OFFICIAL_ACCOUNT_MISSING`(404,企业未配置官方账号,预览/提交均会拦)。

#### 3.2A++.6 客户端错误上报治理(`/api/admin/v1/client-errors`)

查看 App/Web/PC 端上报的崩溃与异常聚类(同指纹合并计数)。权限:查看 `client_error.view`;状态流转 `client_error.manage`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/client-errors/` | 分页列表。Query:`status`(0新建/1受理/2解决/3忽略)、`platform`、`errorType`、`errorLevel`(1警告/2错误/3致命)、`appVersion`、`keyword`、`from`、`to`、`page`、`pageSize`。返回 `PagedResult<ClientErrorItem>` |
| GET | `/client-errors/stats` | 统计概览(`lookbackDays?`,默认7):`totalClusters`、`totalOccurrences`、各状态计数、`byPlatform[]`/`byErrorType[]`/`byAppVersion[]`(每项 `key`/`clusters`/`occurrences`) |
| GET | `/client-errors/{errorId}` | 单条详情(含 `stackTrace`、`contextJson`、`occurrence`、首末次时间) |
| POST | `/client-errors/{errorId}/status` | 状态流转。请求体:`status`(0..3)、`note?`。写审计 |

`ClientErrorItem` 字段:`errorId`、`userId?`、`platform`、`appVersion?`、`errorLevel`、`errorType`、`message`、`stackTrace?`、`contextJson?`、`clientTimestamp?`、`dedupHash?`、`occurrence`、`status`、`handledByUserId?`、`handleNote?`、`firstSeenAt`、`lastSeenAt`、`resolvedAt?`。

#### 3.2A++.7 用户反馈治理(`/api/admin/v1/feedbacks`)

查看用户从客户端提交的反馈并受理。权限:查看 `feedback.view`;处理 `feedback.manage`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/feedbacks/` | 分页列表。Query:`type`(complaint/suggestion/bug)、`status`(0新建/1受理/2已处理/3已关闭)、`keyword`、`from`、`to`、`page`、`pageSize`。返回 `PagedResult<FeedbackItem>` |
| GET | `/feedbacks/{feedbackId}` | 单条详情 |
| POST | `/feedbacks/{feedbackId}/status` | 受理/处理。请求体:`status`、`note?`。回写后用户可在客户端 `GET /api/client/v1/feedback/me` 看到进度 |

`FeedbackItem` 字段:`feedbackId`、`userId`、`feedbackType`、`content`、`contactInfo?`、`attachmentUrls[]`、`status`、`handledByUserId?`、`handleNote?`、`handledAt?`、`createdAt`。

#### 3.2A++.8 客服线程冻结 / 解冻

冻结客服线程(访客临时会话或注册客户直聊线程)后,双方均不可发送(历史可读)。底层等价于冻结其承载会话。权限:`customer_service.center.freeze`(或 `customer_service.center.force_close`)。

- `POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/freeze` — 请求体可选 `{ reason }`。`threadType` ∈ `temp_session` / `im_direct`(亦兼容 `direct_customer`)。
- `POST /api/admin/v1/customer-service/center/threads/{threadType}/{threadId}/unfreeze`

操作写审计(`cs.thread.frozen` / `cs.thread.unfrozen`)。客户端发送被拦时返回 `CS_THREAD_FROZEN`(403)。

#### 3.2A++.9 `GET /api/admin/v1/customer-service/center/customers/{customerUserId}/profile-card` — 客户综合卡片(PC 高密度视图)

聚合客户基础资料、归属、风险等级(取其客服线程最高 `RiskLevel`)、隐私设置、会话/工单/好友计数(`tabCounts`)。交易类数据以 `externalSections[]` 插槽返回(本系统无交易域,默认空,接了外部交易系统的租户填充)。权限(任一):`customer_service.center.view`、`customer_service.customer.view`。

主要字段:`customerUserId`、`displayName`、`lppId?`、`avatarUrl?`、`mobileMasked?`、`emailMasked?`、`status`、`assignedStaffUserId?`、`assignedStaffName?`、`assignedAt?`、`riskLevel`、`riskReasonsJson?`、`privacy{searchableByMobile,searchableByLppId,allowFriendRequest,profileVisibility}`、`isVip`、`tabCounts{sessions,openThreads,feedbacks,friends}`、`externalSections[]`、`lastActiveAt?`、`createdAt`、`generatedAt`。客服工作台(员工侧)亦可按线程取卡片,见客户端文档 §26。

#### 3.2A++.10 `GET /api/admin/v1/announcements/{announcementId}/read-stats` — 企业公告已读统计

权限:`announcement.manage`。Query:`page`、`pageSize`。响应 `data`:`announcementId`、`totalRecipients`、`readCount`、`unreadCount`、`readers`(`PagedResult<{userId,displayName,readAt}>`)。客户端用 `POST /api/client/v1/enterprise/announcements/{announcementId}/read` 上报已读。

> 另:`workbench/threads`(§见统一客服工作台)线程项已新增 `isVip`/`customerLevel`/`priority`/`tags` 字段,并在工作台响应增加 `summary{allCount,queuedCount,activeCount,vipCount}`。AI 建议草稿端点见客户端文档 §26。

### 3.2B 临时会话域端点详细文档

以下是 `/api/admin/v1/customer-service/temp-sessions/` 路由组下的全部端点详细文档。所有端点均需管理端 `accessToken` 鉴权。

#### 3.2B.1 `GET /api/admin/v1/customer-service/temp-sessions/`

临时会话列表。返回当前租户下的临时会话列表，支持按关键词、状态、负责客服和语言筛选。

权限要求（任一）：`customer_service.temp_session.view`、`customer_service.center.view`

请求参数（Query String）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `keyword` | string? | 否 | 搜索关键词（匹配访客名、客户 ID 等） |
| `status` | string? | 否 | 会话状态筛选，参见临时会话状态枚举 |
| `assignedStaffUserId` | GUID? | 否 | 按负责客服 ID 筛选 |
| `locale` | string? | 否 | 按语言筛选，如 `zh-CN`、`en-US` |

响应 `data`：`TempSessionAdminListItemDto[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 会话 ID |
| `conversationId` | GUID | 底层会话 ID |
| `status` | string | 会话状态 |
| `visitorId` | GUID | 访客 ID |
| `visitorName` | string | 访客显示名 |
| `customerId` | string? | 外部客户 ID |
| `locale` | string | 语言 |
| `category` | string? | 会话分类 |
| `sourceChannel` | string | 来源渠道 |
| `currentOwnerStaffUserId` | GUID? | 当前负责客服用户 ID |
| `currentOwnerStaffDisplayName` | string? | 当前负责客服显示名 |
| `currentResponderType` | string | 当前响应者类型（`ai` / `staff` / `none`） |
| `currentResponderDisplayName` | string? | 当前响应者显示名 |
| `ai` | object? | AI 服务信息，参见 `TempSessionAiInfoDto` |
| `queuePosition` | int? | 排队位置（仅排队中有值） |
| `estimatedWaitSeconds` | int? | 预估等待秒数 |
| `priority` | string | 优先级 |
| `visitorMessageCount` | int | 访客消息数 |
| `staffMessageCount` | int | 客服消息数 |
| `createdAt` | string | 创建时间（ISO 8601） |
| `lastMessageAt` | string? | 最后消息时间 |

#### 3.2B.2 `GET /api/admin/v1/customer-service/temp-sessions/{sessionId}`

临时会话详情。返回指定会话的完整信息，包含访客画像、参与者、消息列表、事件时间线、备注、评价和质检信息。

权限要求（任一）：`customer_service.temp_session.view`、`customer_service.center.view`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 临时会话 ID |

响应 `data`：`TempSessionDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `session` | object | 会话摘要，结构同 `TempSessionAdminListItemDto` |
| `visitor` | object | 访客画像，参见下方 `TempSessionAdminVisitorDto` |
| `participants` | array | 参与者列表 |
| `messages` | array | 消息列表 |
| `events` | array | 事件时间线 |
| `notes` | array | 客服备注列表 |
| `rating` | object? | 访客评价 |
| `quality` | object | 质检信息 |
| `ai` | object? | AI 服务信息 |

`visitor` 字段（`TempSessionAdminVisitorDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `visitorId` | GUID | 访客 ID |
| `visitorUserId` | GUID | 访客对应的用户 ID |
| `visitorName` | string | 访客显示名 |
| `mobileMasked` | string? | 脱敏手机号 |
| `emailMasked` | string? | 脱敏邮箱 |
| `customerId` | string? | 外部客户 ID |
| `customerName` | string? | 外部客户名 |
| `linkedUserId` | GUID? | 关联的注册用户 ID |
| `locale` | string | 语言 |
| `from` | string? | 来源标签 |
| `ref` | string? | 引荐标签 |
| `sourceUrl` | string? | 来源页面 URL |
| `ipMasked` | string? | 脱敏 IP |
| `totalSessions` | int | 历史会话总数 |
| `metadata` | object? | 自定义元数据 |

`participants` 数组项（`TempSessionParticipantDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 参与者用户 ID |
| `displayName` | string | 参与者显示名 |
| `role` | string | 角色（`visitor` / `primary_staff` / `assist_staff` / `ai_bot`） |

`messages` 数组项（`TempSessionMessageDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `messageId` | GUID | 消息 ID |
| `conversationId` | GUID | 会话 ID |
| `conversationSeq` | long | 会话内序号 |
| `senderUserId` | GUID | 发送者用户 ID |
| `senderDisplayName` | string | 发送者显示名 |
| `senderType` | string | 发送者类型（`visitor` / `staff` / `ai` / `system`） |
| `messageType` | string | 消息类型（`text` / `image` / `file` / `audio` / `video` 等） |
| `body` | object | 消息体（JSON 结构，按 `messageType` 不同而异） |
| `sentAt` | string | 发送时间（ISO 8601） |
| `replyToMessageId` | GUID? | 引用回复的消息 ID |

`events` 数组项（`TempSessionTimelineItemDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `eventId` | GUID | 事件 ID |
| `eventType` | string | 事件类型 |
| `actorDisplayName` | string? | 操作者显示名 |
| `detail` | object? | 事件详情 |
| `createdAt` | string | 事件时间（ISO 8601） |

`notes` 数组项（`TempSessionNoteDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `noteId` | GUID | 备注 ID |
| `staffDisplayName` | string | 客服显示名 |
| `content` | string | 备注内容 |
| `isPinned` | bool | 是否置顶 |
| `createdAt` | string | 创建时间 |

`rating` 字段（`TempSessionRatingDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `rating` | short? | 评分（1-5） |
| `tags` | string[] | 评价标签 |
| `comment` | string? | 评价文本 |
| `ratedAt` | string? | 评价时间 |

`quality` 字段（`TempSessionQualityDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `score` | string | 质检评分 |
| `tags` | string[] | 质检标签 |
| `comment` | string? | 质检意见 |
| `checkedBy` | string? | 质检人 |
| `checkedAt` | string? | 质检时间 |

#### 3.2B.3 `GET /api/admin/v1/customer-service/temp-sessions/stats`

临时会话统计。返回当前租户的临时会话运营统计数据，包含趋势、渠道分布、分类分布、语言分布和客服绩效。

> **2026-06-07 变更 — 客服绩效跨渠道统一**：`staffPerformance` 已从「仅临时会话(Widget)」
> 扩成「**按客服本人合并**临时会话 + IM 注册客户直聊两个渠道」。顶层字段是**跨渠道合并** KPI
> (看人不看渠道,首响/时长按会话量加权、合格率按质检数合并);新增 `byChannel` 数组做**渠道下钻**
> (`widget` / `im_direct` 各自 KPI)。合并不变量:顶层 `sessionsServed` == Σ `byChannel[].sessionsServed`。
> 数据由后台 Worker 周期聚合(约 5 分钟一次,UPSERT 当天+昨天),故统计有分钟级延迟,不是实时。

权限要求：`customer_service.temp_stats.view`

无请求参数。

响应 `data`：`TempSessionStatsDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalSessions` | int | 总会话数 |
| `totalQueued` | int | 总排队数 |
| `totalServed` | int | 总服务数 |
| `totalAbandoned` | int | 总放弃数 |
| `avgWaitSeconds` | int | 平均等待秒数 |
| `avgFirstResponseSeconds` | int | 平均首次响应秒数 |
| `avgDurationSeconds` | int | 平均会话时长秒数 |
| `avgRating` | decimal | 平均评分 |
| `aiServedSessions` | int | AI 服务的会话数 |
| `aiHandoffSessions` | int | AI 转人工的会话数 |
| `aiResolvedSessions` | int | AI 独立解决的会话数 |
| `aiMessageCount` | int | AI 消息总数 |
| `failedAiJobs` | int | 失败的 AI 任务数 |
| `avgAiLatencyMs` | int | AI 平均响应延迟（毫秒） |
| `aiEstimatedCostUsd` | decimal | AI 预估费用（美元） |
| `sessionTrend` | array | 会话趋势分布 |
| `channelDistribution` | array | 渠道分布 |
| `categoryDistribution` | array | 分类分布 |
| `localeDistribution` | array | 语言分布 |
| `staffPerformance` | array | 客服绩效列表 |

`sessionTrend` / `channelDistribution` / `categoryDistribution` / `localeDistribution` 数组项（`TempDistributionPointDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `label` | string | 标签（日期 / 渠道名 / 分类名 / 语言代码） |
| `value` | int | 数值 |

`staffPerformance` 数组项（`TempStaffPerformanceDto`）—— 顶层为**跨渠道合并** KPI：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID | 客服用户 ID |
| `displayName` | string | 客服显示名 |
| `sessionsServed` | int | 服务会话数（两渠道合并;== Σ `byChannel[].sessionsServed`） |
| `avgFirstResponseSeconds` | int | 平均首次响应秒数（按会话量加权合并） |
| `avgDurationSeconds` | int | 平均会话时长秒数（按会话量加权合并） |
| `avgRating` | decimal | 平均评分（按评分数加权合并） |
| `excellentRate` | decimal | 质检合格率（(优秀+合格)/被质检会话总数;两渠道合并） |
| `byChannel` | array | 渠道下钻（见下） |

`byChannel` 数组项（`StaffChannelBreakdownDto`）—— 单个渠道的 KPI：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channel` | string | 渠道判别符：`widget`（临时会话 / Web Widget 匿名访客）\| `im_direct`（IM 注册客户直聊） |
| `sessionsServed` | int | 该渠道服务会话数 |
| `avgFirstResponseSeconds` | int | 该渠道平均首次响应秒数 |
| `avgDurationSeconds` | int | 该渠道平均会话时长秒数 |
| `avgRating` | decimal | 该渠道平均评分 |
| `excellentRate` | decimal | 该渠道质检合格率 |

#### 3.2B.4 `GET /api/admin/v1/customer-service/temp-sessions/visitors/{visitorId}`

访客详情。返回指定访客的完整画像信息及其历史会话列表。

权限要求：`customer_service.temp_visitor.view`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `visitorId` | GUID | 访客 ID |

响应 `data`：`TempVisitorDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `visitor` | object | 访客基本信息，参见 `TempVisitorListItemDto` |
| `fingerprint` | string? | 浏览器指纹 |
| `visitorMobile` | string? | 访客手机号 |
| `visitorEmail` | string? | 访客邮箱 |
| `sourceUrl` | string? | 来源页面 URL |
| `from` | string? | 来源标签 |
| `ref` | string? | 引荐标签 |
| `ipMasked` | string? | 脱敏 IP |
| `userAgent` | string? | 浏览器 User-Agent |
| `metadata` | object? | 自定义元数据 |
| `acquisition` | object | 获客入口结构化字段（见下；2026-06-07 起） |
| `sessions` | array | 历史会话列表，结构同 `TempSessionAdminListItemDto` |

`acquisition` 字段（`TempSessionAcquisitionDto`，2026-06-07 新增）—— 临时会话/访客的结构化获客来源。也出现在临时会话列表项 `TempSessionAdminListItemDto.acquisition` 与访客列表项里。全部可选，缺失为 `null`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `applicationId` | string? | 接入方自定义的应用/站点标识（区别于 `customerId` 业务客户标识） |
| `sourcePlatform` | string? | 来源渠道：`app` / `h5` / `web` / `miniprogram` / 其它（服务层宽松归一，已知值小写收敛，未知原样存） |
| `chatTool` | string? | 聊天工具：`wechat` / `telegram` / `whatsapp` / `line` / `messenger` / 其它 |
| `deviceType` | string? | 设备：`mobile` / `desktop` / `tablet` / 其它 |
| `os` | string? | 操作系统名（`ios` / `android` / `windows` …） |
| `osVersion` | string? | 操作系统版本 |
| `utmSource` | string? | 营销归因 source |
| `utmMedium` | string? | 营销归因 medium |
| `utmCampaign` | string? | 营销归因 campaign |
| `appVersion` | string? | 接入 App 版本号（配合 `applicationId`） |
| `country` | string? | 地区（国家） |
| `region` | string? | 地区（省/州/城市，接入方自定义粒度） |
| `timezone` | string? | IANA 时区，如 `Asia/Shanghai` |

> 渠道分布统计 `channelDistribution` 自 2026-06-07 起优先按 `sourcePlatform` 分组（旧数据无 `sourcePlatform` 时回退 `sourceChannel`）。Widget 进线上报这些字段的入口见 client/widget 接入文档。

`visitor` 字段（`TempVisitorListItemDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `visitorId` | GUID | 访客 ID |
| `visitorName` | string | 访客显示名 |
| `customerId` | string? | 外部客户 ID |
| `customerName` | string? | 外部客户名 |
| `locale` | string | 语言 |
| `sourceChannel` | string | 来源渠道 |
| `linkedUserId` | GUID? | 关联的注册用户 ID |
| `totalSessions` | int | 历史会话总数 |
| `lastPrimaryStaffDisplayName` | string? | 上次主要客服显示名 |
| `firstVisitAt` | string | 首次访问时间 |
| `lastVisitAt` | string | 最后访问时间 |

#### 3.2B.5 `PUT /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}`

更新客服状态。修改指定客服的服务状态、排队接受开关和最大并发会话数。

权限要求（任一）：`customer_service.temp_session.manage`、`customer_service.center.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID | 客服用户 ID |

请求体（`UpdateTempSessionStaffStatusRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `serviceStatus` | string | 是 | 服务状态，参见客服状态枚举 |
| `queueAcceptEnabled` | bool? | 否 | 是否接受排队分配 |
| `maxConcurrentSessions` | int? | 否 | 最大并发会话数 |

响应 `data`：`TempStaffStatusDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID | 客服用户 ID |
| `displayName` | string | 客服显示名 |
| `serviceStatus` | string | 服务状态 |
| `maxConcurrentSessions` | int | 最大并发会话数 |
| `reservedSessionCount` | int | 预留会话数 |
| `activeSessionCount` | int | 活跃会话数 |
| `queueAcceptEnabled` | bool | 是否接受排队分配 |
| `lastAssignedAt` | string? | 最后分配时间 |
| `lastOnlineAt` | string? | 最后上线时间 |
| `locales` | string[] | 支持的语言列表 |
| `skillGroups` | string[] | 所属技能组列表 |

#### 3.2B.6 `POST /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}/force-offline`

强制下线客服。将指定客服强制设为离线状态。

权限要求（任一）：`customer_service.temp_session.manage`、`customer_service.center.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID | 客服用户 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID | 被强制下线的客服用户 ID |

#### 3.2B.7 `POST /api/admin/v1/customer-service/temp-sessions/staff-statuses/{staffUserId}/reset-load`

重置客服负载。将指定客服的活跃会话计数和预留计数重置为实际值，用于修复计数不一致的情况。

权限要求（任一）：`customer_service.temp_session.manage`、`customer_service.center.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID | 客服用户 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID | 被重置负载的客服用户 ID |

#### 3.2B.8 `POST /api/admin/v1/customer-service/temp-sessions/blacklist`

创建黑名单条目。按指定维度封禁访客。

权限要求：`customer_service.temp_visitor.block`

请求体（`CreateTempBlacklistRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `targetType` | short | 是 | 封禁维度类型（0=IP, 1=fingerprint, 2=customer_id, 3=visitor_id） |
| `targetValue` | string | 是 | 封禁目标值 |
| `reason` | string? | 否 | 封禁原因 |
| `expiresAt` | string? | 否 | 过期时间（ISO 8601）；不传则永久封禁 |

响应 `data`：`TempSessionBlacklistEntry`

| 字段 | 类型 | 说明 |
|---|---|---|
| `blacklistId` | GUID | 黑名单条目 ID |
| `targetType` | short | 封禁维度类型 |
| `targetValue` | string | 封禁目标值 |
| `reason` | string? | 封禁原因 |
| `expiresAt` | string? | 过期时间 |
| `createdBy` | GUID? | 创建者用户 ID |
| `createdAt` | string | 创建时间 |

#### 3.2B.9 `DELETE /api/admin/v1/customer-service/temp-sessions/blacklist/{blacklistId}`

删除黑名单条目。解除指定的访客封禁。

权限要求：`customer_service.temp_visitor.block`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `blacklistId` | GUID | 黑名单条目 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `blacklistId` | GUID | 被删除的黑名单条目 ID |

#### 3.2B.10 `POST /api/admin/v1/customer-service/temp-sessions/sensitive-words`

创建敏感词。添加一条敏感词规则。

权限要求：`customer_service.temp_session.manage`

请求体（`CreateTempSensitiveWordRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `locale` | string | 是 | 适用语言，`*` 表示所有语言 |
| `wordText` | string | 是 | 敏感词文本 |
| `actionMode` | short | 是 | 处理模式（0=标记, 1=替换, 2=拦截） |

响应 `data`：`TempSessionSensitiveWord`

| 字段 | 类型 | 说明 |
|---|---|---|
| `wordId` | GUID | 敏感词 ID |
| `locale` | string | 适用语言 |
| `wordText` | string | 敏感词文本 |
| `actionMode` | short | 处理模式 |
| `createdAt` | string | 创建时间 |

#### 3.2B.11 `DELETE /api/admin/v1/customer-service/temp-sessions/sensitive-words/{wordId}`

删除敏感词。移除指定的敏感词规则。

权限要求：`customer_service.temp_session.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `wordId` | GUID | 敏感词 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `wordId` | GUID | 被删除的敏感词 ID |

#### 3.2B.12 `GET /api/admin/v1/customer-service/temp-sessions/knowledge-bases`

知识库列表。返回当前租户下的全部知识库。

权限要求：`customer_service.temp_config.manage`

无请求参数。

响应 `data`：`TempSessionKnowledgeBaseDto[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |
| `name` | string | 知识库名称 |
| `description` | string? | 知识库描述 |
| `isEnabled` | bool | 是否启用 |
| `buildStatus` | string | 构建状态（`queued` / `processing` / `ready` / `failed`） |
| `lastBuildError` | string? | 最后构建错误信息 |
| `documentCount` | int | 文档数量 |
| `chunkCount` | int | 分块数量 |
| `lastBuiltAt` | string? | 最后构建时间 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

#### 3.2B.13 `POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases`

创建知识库。

权限要求：`customer_service.temp_config.manage`

请求体（`TempSessionKnowledgeBaseUpsertRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | 是 | 知识库名称 |
| `description` | string? | 否 | 知识库描述 |
| `isEnabled` | bool | 否 | 是否启用，默认 `true` |

响应 `data`：`TempSessionKnowledgeBaseDto`（结构同上）

#### 3.2B.14 `PUT /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}`

更新知识库。修改知识库的名称、描述和启用状态。

权限要求：`customer_service.temp_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |

请求体（`TempSessionKnowledgeBaseUpsertRequest`）：同创建知识库。

响应 `data`：`TempSessionKnowledgeBaseDto`（结构同上）

#### 3.2B.15 `DELETE /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}`

删除知识库。删除指定知识库及其下所有文档和分块。

权限要求：`customer_service.temp_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 被删除的知识库 ID |

#### 3.2B.16 `POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/rebuild`

重建知识库索引。将知识库下所有文档重新分块并构建向量索引。操作为异步，返回后任务进入队列。

权限要求：`customer_service.temp_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |
| `queued` | bool | 是否已入队（固定为 `true`） |

#### 3.2B.17 `GET /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents`

知识库文档列表。返回指定知识库下的全部文档。

权限要求：`customer_service.temp_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |

响应 `data`：`TempSessionKnowledgeDocumentDto[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| `documentId` | GUID | 文档 ID |
| `knowledgeBaseId` | GUID | 所属知识库 ID |
| `title` | string | 文档标题 |
| `summary` | string? | 文档摘要 |
| `content` | string | 文档内容 |
| `sourceType` | string | 来源类型（`manual` / `import`） |
| `sourceFileName` | string? | 导入时的原始文件名 |
| `buildStatus` | string | 构建状态（`queued` / `processing` / `ready` / `failed`） |
| `lastBuildError` | string? | 最后构建错误信息 |
| `isEnabled` | bool | 是否启用 |
| `chunkCount` | int | 分块数量 |
| `lastBuiltAt` | string? | 最后构建时间 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

#### 3.2B.18 `POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents`

创建知识库文档。手动添加一篇文档到指定知识库。

权限要求：`customer_service.temp_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |

请求体（`TempSessionKnowledgeDocumentUpsertRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 是 | 文档标题 |
| `summary` | string? | 否 | 文档摘要 |
| `content` | string | 是 | 文档内容 |
| `isEnabled` | bool | 否 | 是否启用，默认 `true` |

响应 `data`：`TempSessionKnowledgeDocumentDto`（结构同上）

#### 3.2B.19 `POST /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents/import`

导入知识库文档。通过文件上传方式导入文档。请求必须使用 `multipart/form-data` 格式。

权限要求：`customer_service.temp_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |

请求体（`multipart/form-data`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `file` | file | 是 | 要导入的文件 |
| `title` | string? | 否 | 文档标题（不传则使用文件名） |
| `summary` | string? | 否 | 文档摘要 |
| `isEnabled` | string? | 否 | 是否启用（`true` / `false`），默认 `true` |

响应 `data`：`TempSessionKnowledgeDocumentDto`（结构同上，`sourceType` 为 `import`，`sourceFileName` 为上传文件名）

错误码：

| 错误码 | 说明 |
|---|---|
| `TEMP_SESSION_KNOWLEDGE_IMPORT_FORM_REQUIRED` | 请求未使用 `multipart/form-data` 格式 |
| `TEMP_SESSION_KNOWLEDGE_IMPORT_FILE_REQUIRED` | 未上传文件或文件为空 |

#### 3.2B.20 `PUT /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents/{documentId}`

更新知识库文档。修改指定文档的标题、摘要、内容和启用状态。

权限要求：`customer_service.temp_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |
| `documentId` | GUID | 文档 ID |

请求体（`TempSessionKnowledgeDocumentUpsertRequest`）：同创建知识库文档。

响应 `data`：`TempSessionKnowledgeDocumentDto`（结构同上）

#### 3.2B.21 `DELETE /api/admin/v1/customer-service/temp-sessions/knowledge-bases/{knowledgeBaseId}/documents/{documentId}`

删除知识库文档。删除指定文档及其分块。

权限要求：`customer_service.temp_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |
| `documentId` | GUID | 文档 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |
| `documentId` | GUID | 被删除的文档 ID |

#### 3.2B.22 `PUT /api/admin/v1/customer-service/temp-sessions/config`

更新临时会话配置。覆盖当前租户的临时会话全局配置，包括队列、超时、Widget、AI、安全等全部配置项。

权限要求：`customer_service.temp_config.manage`

请求体（`TempSessionConfigModel`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `enabled` | bool | 是 | 是否启用临时会话功能 |
| `defaultLocale` | string | 是 | 默认语言，如 `zh-CN` |
| `supportedLocales` | string[] | 是 | 支持的语言列表 |
| `priorityEnabled` | bool | 是 | 是否启用优先级 |
| `maxQueueSize` | int | 是 | 最大排队数 |
| `queueTimeoutMinutes` | int | 是 | 排队超时分钟数 |
| `visitorTimeoutMinutes` | int | 是 | 访客无响应超时分钟数 |
| `staffTimeoutMinutes` | int | 是 | 客服无响应超时分钟数 |
| `sessionMaxDurationMinutes` | int | 是 | 会话最大时长分钟数 |
| `allowAssist` | bool | 是 | 是否允许协助 |
| `allowTransfer` | bool | 是 | 是否允许转接 |
| `allowRating` | bool | 是 | 是否允许评价 |
| `allowQualityCheck` | bool | 是 | 是否允许质检 |
| `skillGroupRoutingEnabled` | bool | 是 | 是否启用技能组路由 |
| `requireVisitorInfo` | bool | 是 | 是否要求访客填写信息 |
| `visitorInfoFields` | string[] | 是 | 要求填写的访客信息字段列表 |
| `categoryMappings` | object? | 否 | 分类映射配置（JSON） |
| `workingHoursEnabled` | bool | 是 | 是否启用工作时间 |
| `workingHoursTimezone` | string | 是 | 工作时间时区 |
| `workingHoursSchedule` | object? | 否 | 工作时间排班（JSON） |
| `widgetTitle` | object? | 否 | Widget 标题（多语言 JSON） |
| `widgetSubtitle` | object? | 否 | Widget 副标题（多语言 JSON） |
| `widgetPrimaryColor` | string | 是 | Widget 主色调 |
| `widgetPosition` | string | 是 | Widget 位置（`bottom-right` / `bottom-left`） |
| `widgetAllowedDomains` | string[] | 是 | Widget 允许嵌入的域名列表 |
| `showPoweredBy` | bool | 是 | 是否显示 Powered By |
| `showQueueEstimate` | bool | 是 | 是否显示排队预估 |
| `ai` | object | 是 | AI 客服配置，参见下方 `AiCustomerServiceConfigModel` |
| `customerIdSignEnabled` | bool | 是 | 是否启用客户 ID 签名验证 |
| `messageMaxLength` | int | 是 | 消息最大长度 |
| `sessionCreateCooldownSeconds` | int | 是 | 会话创建冷却秒数 |
| `ipRateLimitPerMinute` | int | 是 | IP 每分钟限流 |
| `fingerprintRateLimitPerMinute` | int | 是 | 指纹每分钟限流 |
| `webhookEvents` | string[] | 是 | 启用的 Webhook 事件列表 |

`ai` 字段（`AiCustomerServiceConfigModel`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `enabled` | bool | 是 | 是否启用 AI 客服 |
| `botDisplayName` | string | 是 | AI 机器人显示名 |
| `autoGreetEnabled` | bool | 是 | 是否启用自动问候 |
| `autoReplyEnabled` | bool | 是 | 是否启用自动回复 |
| `autoHandoffEnabled` | bool | 是 | 是否启用自动转人工 |
| `ragEnabled` | bool | 是 | 是否启用 RAG（知识库检索增强） |
| `ragTopK` | int | 是 | RAG 检索 Top-K |
| `ragScoreThreshold` | double | 是 | RAG 相关性分数阈值 |
| `ragMaxContextChars` | int | 是 | RAG 最大上下文字符数 |
| `replyProvider` | string | 是 | 回复供应商（`builtin` 或自定义） |
| `replyModel` | string | 是 | 回复模型标识 |
| `apiBaseUrl` | string | 是 | API 基础 URL |
| `siteUrl` | string? | 否 | 站点 URL |
| `appName` | string? | 否 | 应用名称 |
| `apiKeyPlaintext` | string? | 否 | API Key 明文（仅写入时使用） |
| `apiKeyCiphertext` | string? | 否 | API Key 密文（仅读取时返回） |
| `apiKeyPreview` | string? | 否 | API Key 预览（脱敏显示） |
| `maxOutputTokens` | int | 是 | 最大输出 Token 数 |
| `temperature` | double | 是 | 温度参数 |
| `maxAutoRepliesPerSession` | int | 是 | 每会话最大自动回复数 |
| `maxConsecutiveAiMessages` | int | 是 | 最大连续 AI 消息数 |
| `idleReplyCooldownSeconds` | int | 是 | 空闲回复冷却秒数 |
| `escalationKeywords` | string[] | 是 | 转人工关键词列表 |
| `greetingMessages` | string[] | 是 | 问候消息列表 |
| `fallbackReplies` | string[] | 是 | 兜底回复列表 |
| `handoffReplies` | string[] | 是 | 转人工回复列表 |
| `disclaimerMessages` | string[] | 是 | 免责声明消息列表 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `updated` | bool | 是否更新成功（固定为 `true`） |

#### 3.2B.23 `POST /api/admin/v1/customer-service/temp-sessions/config/ai/probe`

AI 供应商探测。测试 AI 供应商连通性和模型可用性，返回探测结果。

权限要求：`customer_service.temp_config.manage`

请求体（`TempSessionAiProbeRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `ai` | object? | 否 | AI 配置（`AiCustomerServiceConfigModel`），不传则使用当前已保存配置 |
| `prompt` | string? | 否 | 测试提示词 |

响应 `data`：`TempSessionAiProviderProbeResultDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | bool | 探测是否成功 |
| `provider` | string | 供应商标识 |
| `model` | string | 模型标识 |
| `statusCode` | int? | HTTP 状态码 |
| `message` | string | 结果消息 |
| `replyPreview` | string? | 回复预览文本 |
| `latencyMs` | int | 响应延迟（毫秒） |
| `inputTokens` | int? | 输入 Token 数 |
| `outputTokens` | int? | 输出 Token 数 |
| `totalTokens` | int? | 总 Token 数 |
| `estimatedCostUsd` | decimal? | 预估费用（美元） |

#### 3.2B.24 `GET /api/admin/v1/customer-service/temp-sessions/widget/test-url`

生成 Widget 测试 URL。返回一个可直接在浏览器中打开的 Widget 测试页面地址。

权限要求：`customer_service.temp_config.manage`

无请求参数。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `url` | string | Widget 测试页面 URL |

#### 3.2B.25 `POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/claim`

认领临时会话。当前管理员认领一个排队中或未分配的临时会话。

权限要求（任一）：`customer_service.temp_session.manage`、`customer_service.center.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 临时会话 ID |

无请求体。

响应 `data`：`TempSessionStateDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 会话 ID |
| `conversationId` | GUID | 底层会话 ID |
| `status` | string | 会话状态 |
| `locale` | string | 语言 |
| `queuePosition` | int? | 排队位置 |
| `estimatedWaitSeconds` | int? | 预估等待秒数 |
| `visitorId` | GUID | 访客 ID |
| `visitorUserId` | GUID | 访客用户 ID |
| `currentOwnerStaffUserId` | GUID? | 当前负责客服用户 ID |
| `currentOwnerStaffDisplayName` | string? | 当前负责客服显示名 |
| `currentResponderType` | string | 当前响应者类型 |
| `currentResponderDisplayName` | string? | 当前响应者显示名 |
| `ai` | object? | AI 服务信息 |
| `createdAt` | string | 创建时间 |
| `lastMessageAt` | string? | 最后消息时间 |

#### 3.2B.26 `POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/takeover`

接管临时会话。当前管理员接管一个已分配给其他客服的临时会话。

权限要求（任一）：`customer_service.temp_session.manage`、`customer_service.center.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 临时会话 ID |

无请求体。

响应 `data`：`TempSessionStateDto`（结构同认领会话）

#### 3.2B.27 `POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/resume-ai`

恢复 AI 接管。将一个已由人工客服服务的临时会话重新交给 AI 处理。

权限要求（任一）：`customer_service.temp_session.manage`、`customer_service.center.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 临时会话 ID |

无请求体。

响应 `data`：`TempSessionStateDto`（结构同认领会话）

#### 3.2B.28 `POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/messages`

管理端发送消息。以当前管理员身份向指定临时会话发送一条消息。

权限要求（任一）：`customer_service.temp_session.manage`、`customer_service.center.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 临时会话 ID |

请求体（`TempSessionAdminSendMessageRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `clientMsgId` | string | 是 | 客户端消息幂等 ID |
| `messageType` | string | 是 | 消息类型（`text` / `image` / `file` / `audio` / `video` 等） |
| `body` | object | 是 | 消息体（JSON 结构，按 `messageType` 不同而异） |
| `interventionReason` | string? | 条件必填 | 见下方"介入语义" |

**介入语义**:

- 当调用者是该临时会话的当前归属客服(或协助客服)时,可省略 `interventionReason`,正常发言
- 当调用者**不是**当前归属客服,但拥有「管理员介入」权限(`customer_service.center.manage` / `customer_service.temp_session.manage`)时,本接口仍可发言,但**必须**提交非空的 `interventionReason`,否则返回 400 `TEMP_SESSION_ADMIN_INTERVENTION_REASON_REQUIRED`
- 介入产生的消息会在会话事件时间线上额外写入一条"管理员介入"事件,`interventionReason` 会被保留作为审计内容
- 介入不会自动改变 `currentOwnerStaffUserId`;如果同时需要接管会话归属,客户端应另外调用 `/takeover`

响应 `data`：`TempSessionMessageDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `messageId` | GUID | 消息 ID |
| `conversationId` | GUID | 会话 ID |
| `conversationSeq` | long | 会话内序号 |
| `senderUserId` | GUID | 发送者用户 ID |
| `senderDisplayName` | string | 发送者显示名 |
| `senderType` | string | 发送者类型 |
| `messageType` | string | 消息类型 |
| `body` | object | 消息体 |
| `sentAt` | string | 发送时间 |
| `replyToMessageId` | GUID? | 引用回复的消息 ID |

#### 3.2B.29 `POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/force-close`

强制关闭临时会话。管理员强制关闭一个临时会话，无论当前状态。

权限要求（任一）：`customer_service.temp_session.force_close`、`customer_service.center.force_close`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 临时会话 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 被强制关闭的会话 ID |

#### 3.2B.30 `POST /api/admin/v1/customer-service/temp-sessions/{sessionId}/close`

正常关闭临时会话。客服主动关闭一个临时会话。

权限要求（任一）：`customer_service.temp_session.manage`、`customer_service.center.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 临时会话 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessionId` | GUID | 被关闭的会话 ID |

#### 3.2B.31 临时会话域枚举参考

临时会话状态（`sessionStatus`）：

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `created` | 已创建 |
| `1` | `queued` | 排队中 |
| `2` | `active` | 服务中 |
| `3` | `assisting` | 协助中 |
| `4` | `transfer_pending` | 转接中 |
| `5` | `closed_by_visitor` | 访客关闭 |
| `6` | `closed_by_staff` | 客服关闭 |
| `7` | `closed_timeout` | 超时关闭 |
| `8` | `closed_system` | 系统关闭 |
| `9` | `archived` | 已归档 |

AI 服务状态（`aiServiceStatus`）：

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `inactive` | 未激活 |
| `1` | `bot_active` | AI 服务中 |
| `2` | `handoff_pending` | 转人工中 |
| `3` | `human_serving` | 人工服务中 |

客服服务状态（`serviceStatus`）：

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `offline` | 离线 |
| `1` | `online` | 在线 |
| `2` | `busy` | 忙碌 |
| `3` | `break` | 休息 |

参与者角色（`participantRole`）：

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `visitor` | 访客 |
| `1` | `primary_staff` | 主要客服 |
| `2` | `assist_staff` | 协助客服 |
| `3` | `ai_bot` | AI 机器人 |

知识库构建状态（`buildStatus`）：

| 值 | 说明 |
|---|---|
| `queued` | 排队中 |
| `processing` | 处理中 |
| `ready` | 就绪 |
| `failed` | 失败 |

黑名单封禁维度（`targetType`）：

| 值 | 说明 |
|---|---|
| `0` | IP 地址 |
| `1` | 浏览器指纹 |
| `2` | 外部客户 ID |
| `3` | 访客 ID |

敏感词处理模式（`actionMode`）：

| 值 | 说明 |
|---|---|
| `0` | 标记（仅标记不处理） |
| `1` | 替换（替换为 ***） |
| `2` | 拦截（阻止发送） |

AI 信息字段（`TempSessionAiInfoDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `botUserId` | GUID? | AI 机器人用户 ID |
| `botDisplayName` | string? | AI 机器人显示名 |
| `serviceStatus` | string | AI 服务状态 |
| `enabled` | bool | 是否启用 |
| `isActive` | bool | 是否活跃 |
| `humanRequested` | bool | 是否已请求人工 |
| `firstResponseAt` | string? | AI 首次响应时间 |
| `lastResponseAt` | string? | AI 最后响应时间 |
| `messageCount` | int | AI 消息数 |
| `humanRequestedAt` | string? | 请求人工时间 |
| `humanHandoffAt` | string? | 转人工时间 |
| `handoffReasonCode` | string? | 转人工原因代码 |
| `handoffReasonText` | string? | 转人工原因文本 |
| `handoffSummary` | string? | 转人工摘要 |
| `lastReplySource` | string? | 最后回复来源 |
| `lastProvider` | string? | 最后使用的供应商 |
| `lastModel` | string? | 最后使用的模型 |
| `lastLatencyMs` | int? | 最后响应延迟（毫秒） |
| `lastInputTokens` | int? | 最后输入 Token 数 |
| `lastOutputTokens` | int? | 最后输出 Token 数 |
| `lastTotalTokens` | int? | 最后总 Token 数 |
| `lastEstimatedCostUsd` | decimal? | 最后预估费用（美元） |
| `lastReplyPreview` | string? | 最后回复预览 |
| `lastError` | string? | 最后错误信息 |
| `lastJobStatus` | string? | 最后任务状态 |
| `lastJobUpdatedAt` | string? | 最后任务更新时间 |
| `lastKnowledgeHits` | array | 最后知识库命中列表 |

`lastKnowledgeHits` 数组项（`TempSessionAiKnowledgeHitDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `knowledgeBaseId` | GUID | 知识库 ID |
| `documentId` | GUID | 文档 ID |
| `knowledgeBaseName` | string | 知识库名称 |
| `documentTitle` | string | 文档标题 |
| `snippet` | string | 命中片段 |
| `score` | decimal | 相关性分数 |

#### 3.2B.32 临时会话域只读 GET 端点速览

下列只读 GET 端点存在于临时会话域,主文档其它小节未单独展开:

| 端点 | 说明 | 响应 `data` 形状 |
|---|---|---|
| `GET /customer-service/temp-sessions/dashboard` | 临时会话域看板 | `TempSessionDashboardDto`(下方) |
| `GET /customer-service/temp-sessions/staff-statuses` | 当前租户全部客服状态 | `TempStaffStatusDto[]` |
| `GET /customer-service/temp-sessions/auto-replies` | 自动回复规则列表 | `TempSessionAutoReplyDto[]` |
| `GET /customer-service/temp-sessions/quick-replies` | 快捷回复列表(兼容入口;新接入用 `/customer-service/quick-replies`) | `CustomerServiceQuickReplyDto[]` |
| `GET /customer-service/temp-sessions/skill-groups` | 技能组列表 | `TempSessionSkillGroupDto[]` |
| `GET /customer-service/temp-sessions/blacklist` | 黑名单列表 | `TempSessionBlacklistEntry[]` |
| `GET /customer-service/temp-sessions/sensitive-words` | 敏感词列表 | `TempSessionSensitiveWord[]` |
| `GET /customer-service/temp-sessions/config` | 当前生效配置 | `TempSessionConfigModel`(同 §3.2B.22 写入字段,API key 字段脱敏) |

权限要求(任一):`customer_service.temp_session.view`、`customer_service.center.view`(部分配置类需要 `customer_service.temp_config.manage`)

`TempSessionDashboardDto` 字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `queuedCount` | int | 排队访客会话数 |
| `activeCount` | int | 服务中访客会话数 |
| `assistingCount` | int | 协助中访客会话数 |
| `aiServingCount` | int | AI 正在服务的会话数 |
| `humanServingCount` | int | 人工正在服务的会话数 |
| `onlineStaffCount` | int | 在线客服数 |
| `busyStaffCount` | int | 忙碌客服数 |
| `awayStaffCount` | int | 休息/暂离客服数 |
| `breakStaffCount` | int | 同上,break 状态 |
| `todaySessions` | int | 今日新增会话数 |
| `todayServed` | int | 今日已服务数 |
| `todayAbandoned` | int | 今日访客主动放弃数 |
| `avgWaitSeconds` | int | 平均等待秒数 |
| `avgDurationSeconds` | int | 平均会话时长秒数 |
| `avgRating` | decimal | 平均评分 |

### 3.2C 用户治理端点详细文档

以下是 `/api/admin/v1/users/{userId}/` 路由组下的用户治理端点详细文档。所有端点均需管理端 `accessToken` 鉴权。

已有的用户治理端点（禁用/启用、强制下线、禁言/解除禁言）在 §3.2 模块总览中已提及，此处补齐缺失的独立端点文档。

#### 3.2C.1 `GET /api/admin/v1/users/{userId}/mute-status`

查询用户禁言状态。返回指定用户当前的禁言模式、禁言截止时间和禁言原因。

权限要求：`admin.user.view`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

无请求体。

响应 `data`：`AdminUserMuteStatusDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `muteMode` | string | 禁言模式：`normal`（正常）、`muted`（明确禁言）、`shadow_muted`（影子禁言） |
| `muteUntil` | datetime? | 禁言截止时间（ISO 8601）；`null` 表示不限时或未禁言 |
| `muteReason` | string? | 禁言原因 |

补充：

- 如果禁言已过期（`muteUntil` 早于当前时间），服务端会自动返回 `muteMode=normal`
- 影子禁言（`shadow_muted`）下用户发送消息时客户端显示发送成功，但服务端不会将消息转发给其他成员

#### 3.2C.2 `POST /api/admin/v1/users/{userId}/rate-limit`

设置用户发消息频率限制。为指定用户设置自定义发消息频率上限，覆盖全局限流策略。

权限要求：`admin.user.rate_limit`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

请求体（`AdminSetRateLimitRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `maxMessagesPerMinute` | int? | 否 | 每分钟最大消息数；为空或 ≤0 表示清除覆盖值，恢复全局策略 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

#### 3.2C.3 `POST /api/admin/v1/users/{userId}/force-profile`

强制修改用户资料。管理员强制修改用户的显示名、头像或 LPP 标识，适用于违规内容治理。

权限要求：`admin.user.force_profile`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

请求体（`AdminForceProfileRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `displayName` | string? | 否 | 强制修改的显示名 |
| `avatarUrl` | string? | 否 | 强制修改的头像 URL |
| `lppId` | string? | 否 | 强制修改的 LPP 标识 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

补充：

- 仅传入非空字段会被修改，未传入的字段保持不变

#### 3.2C.4 `PUT /api/admin/v1/users/{userId}/note`

设置管理员备注。为指定用户添加或更新内部治理备注，仅管理员可见。

权限要求：`admin.user.note`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

请求体（`AdminSetNoteRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `note` | string? | 否 | 管理员备注内容；为空表示清除备注 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

#### 3.2C.5 `GET /api/admin/v1/users/{userId}/governance`

查询用户治理摘要。返回指定用户的禁言状态、速率限制覆盖值和管理员备注的综合摘要。

权限要求：`admin.user.view`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

无请求体。

响应 `data`：`AdminUserGovernanceSummaryDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `muteMode` | string | 禁言模式：`normal` / `muted` / `shadow_muted` |
| `muteUntil` | datetime? | 禁言截止时间 |
| `muteReason` | string? | 禁言原因 |
| `rateLimitOverride` | int? | 速率限制覆盖值（每分钟最大消息数）；`null` 表示使用全局策略 |
| `adminNote` | string? | 管理员备注 |

#### 3.2C.6 `POST /api/admin/v1/users/{userId}/reset-password`

重置用户密码。管理员为指定用户重置登录密码。重置后该用户的所有活跃会话将被撤销，用户会被强制下线。

权限要求：`admin.user.reset_password`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

请求体（`ResetAdminUserPasswordRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `newPassword` | string | 是 | 新密码，至少 8 个字符 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

错误码：

| 错误码 | 说明 |
|---|---|
| `ADMIN_INVALID_PASSWORD` | 新密码不满足最低 8 字符要求 |

补充：

- 密码重置后,该用户的所有活跃 Session 会被撤销,用户需要重新登录
- 服务端只接受明文密码 + 内部安全加盐哈希存储,客户端无需做预哈希
- 新密码不满足最小长度(8 字符)时返回 `ADMIN_INVALID_PASSWORD`

#### 3.2C.7 `PUT /api/admin/v1/users/{userId}/roles`

更新用户角色。为指定用户分配角色列表，整体覆盖（非增量）。

权限要求：`admin.user.manage_roles`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

请求体（`UpdateAdminUserRolesRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `roleCodes` | string[] | 是 | 角色编码列表，整体覆盖当前用户的角色分配 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 目标用户 ID |

错误码：

| 错误码 | 说明 |
|---|---|
| `ADMIN_SELF_ROLE_REVOKE_FORBIDDEN` | 不能移除当前管理员自身的所有角色 |
| `ADMIN_ROLE_NOT_FOUND` | 提交的角色编码中包含不存在或未激活的角色 |

补充：

- 角色编码会被自动转为小写并去重
- 传入空数组 `[]` 表示移除该用户的所有角色（但不能对自己执行此操作）
- 角色变更会影响用户的权限范围，前端应在角色变更后刷新权限列表

### 3.2D 客服批量转移端点

#### 3.2D.1 `POST /api/admin/v1/customer-service/batch-transfer`

批量转移客服归属。将一个员工名下的客户批量转交给另一个员工，适用于员工离职、调岗等场景。

权限要求：`customer_service.assign`

请求体（`BatchTransferCustomerServiceRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `fromStaffUserId` | GUID | 是 | 源员工用户 ID |
| `toStaffUserId` | GUID | 是 | 目标员工用户 ID |
| `customerUserIds` | GUID[]? | 否 | 要转移的客户用户 ID 列表；为空表示转移源员工名下的全部客户 |
| `transferConversation` | bool | 是 | 是否同时转交服务单聊会话 |

响应 `data`：`BatchTransferCustomerServiceResultDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `selectedCustomerCount` | int | 实际选中的客户数量（源员工名下且在提交列表中的） |
| `transferredCustomerCount` | int | 成功转移的客户数量 |
| `transferredConversationCount` | int | 成功转移的会话数量 |
| `skippedConversationCount` | int | 因目标单聊已存在等原因跳过的会话数量 |
| `skippedCustomerCount` | int | 调用方提交但不属于源员工名下的客户数量 |

错误码：

| 错误码 | 说明 |
|---|---|
| `CUSTOMER_SERVICE_TRANSFER_SAME_STAFF` | 源员工和目标员工不能是同一人 |

补充：

- 源员工和目标员工都必须是可分配客服的角色（`membershipRole >= 2`）
- 当 `customerUserIds` 为空时，会转移源员工名下的全部客户
- 当 `transferConversation=true` 时，会同时将客户与源员工的单聊会话转交给目标员工
- 如果目标员工与某客户已存在单聊会话，该会话会被跳过（计入 `skippedConversationCount`）

### 3.2E 群组治理端点详细文档

以下是 `/api/admin/v1/groups/{conversationId}/` 路由组下的群组治理端点详细文档。所有端点均需管理端 `accessToken` 鉴权。

#### 3.2E.1 `GET /api/admin/v1/groups/{conversationId}`

群详情。返回指定群的完整信息，包含群基本信息和成员列表（最多 500 条）。

权限要求：`conversation.manage.members`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |

无请求体。

响应 `data`：`AdminGroupDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |
| `title` | string | 群名称 |
| `conversationType` | string | 会话类型（`group` / `direct`） |
| `memberCount` | int | 成员数量 |
| `lastMessageSeq` | long | 最后消息序号 |
| `ownerUserId` | GUID? | 群主用户 ID |
| `ownerDisplayName` | string? | 群主显示名 |
| `isArchived` | bool | 是否已归档 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |
| `members` | array | 成员列表（最多 500 条），参见下方 `AdminGroupMemberDto` |

`members` 数组项（`AdminGroupMemberDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 成员用户 ID |
| `displayName` | string | 成员显示名 |
| `loginName` | string? | 成员登录名 |
| `memberRole` | short | 成员角色（0=member, 1=admin, 2=owner） |
| `lastReadSeq` | long | 最后已读消息序号 |
| `joinedAt` | datetime | 加入时间 |

#### 3.2E.2 `POST /api/admin/v1/groups/{conversationId}/mute-member`

禁言群成员。对指定群中的某个成员执行禁言操作。

权限要求：`admin.group.mute_member`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |

请求体（`AdminGroupMuteMemberRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `userId` | GUID | 是 | 目标成员用户 ID |
| `durationMinutes` | int? | 否 | 禁言时长分钟；为空表示不限时 |
| `reason` | string? | 否 | 禁言原因 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |
| `userId` | GUID | 被禁言的成员用户 ID |

#### 3.2E.3 `POST /api/admin/v1/groups/{conversationId}/unmute-member`

解除群成员禁言。解除指定群中某个成员的禁言状态。

权限要求：`admin.group.mute_member`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |

请求体（`AdminRemoveGroupMemberRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `userId` | GUID | 是 | 目标成员用户 ID |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |
| `userId` | GUID | 被解除禁言的成员用户 ID |

#### 3.2E.4 `POST /api/admin/v1/groups/{conversationId}/mute-all`

全员禁言。开启或关闭指定群的全员禁言模式。

权限要求：`admin.group.mute_all`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |

请求体（`AdminGroupMuteAllRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `enabled` | bool | 是 | 是否开启全员禁言 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |

#### 3.2E.5 `POST /api/admin/v1/groups/{conversationId}/freeze`

冻结会话。冻结或解冻指定群会话，冻结后所有成员均无法发送消息。

权限要求：`admin.group.freeze`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |

请求体（`AdminFreezeConversationRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `frozen` | bool | 是 | 是否冻结 |
| `reason` | string? | 否 | 冻结原因 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |

#### 3.2E.6 `POST /api/admin/v1/groups/{conversationId}/disband`

解散群。管理员强制解散指定群。

权限要求：`conversation.disband`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 被解散的群会话 ID |

#### 3.2E.7 `POST /api/admin/v1/groups/{conversationId}/members/remove`

移除群成员。管理员从指定群中移除一个成员。

权限要求：`conversation.manage.members`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |

请求体（`AdminRemoveGroupMemberRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `userId` | GUID | 是 | 要移除的成员用户 ID |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 群会话 ID |
| `userId` | GUID | 被移除的成员用户 ID |

### 3.2F BOT 应用管理端点详细文档

以下是 `/api/admin/v1/bot-apps/` 路由组下的 BOT 应用管理端点详细文档。所有端点均需管理端 `accessToken` 鉴权。

#### 3.2F.1 `GET /api/admin/v1/bot-apps`

BOT 应用列表。返回当前租户下的全部 BOT 应用，按创建时间倒序排列，最多返回 100 条。

权限要求：`bot_app.manage`

无请求参数。

响应 `data`：`CursorPage<AdminBotAppDto>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array | BOT 应用列表，参见下方 `AdminBotAppDto` |
| `nextCursor` | string? | 下一页游标；当前固定为 `null` |

`items` 数组项（`AdminBotAppDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |
| `appCode` | string | 应用编码 |
| `appName` | string | 应用名称 |
| `environment` | string | 环境（`sandbox` / `production`） |
| `callbackUrl` | string? | 回调 URL |
| `status` | string | 状态（`active` / `disabled`） |
| `subscriptionCount` | int | 订阅数量 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

#### 3.2F.2 `POST /api/admin/v1/bot-apps`

创建 BOT 应用。在当前租户下创建一个新的 BOT 应用，返回应用 ID 和密钥。

权限要求：`bot_app.manage`

请求体（`AdminCreateBotAppRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `appCode` | string | 是 | 应用编码，租户内唯一 |
| `appName` | string | 是 | 应用名称 |
| `environment` | string | 是 | 环境（`sandbox` / `production`） |

响应 `data`：`AdminCreateBotAppResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 新创建的应用 ID |
| `appCode` | string | 应用编码 |
| `appName` | string | 应用名称 |
| `secret` | string | 应用密钥（仅创建时返回，请妥善保存） |

补充：

- `secret` 仅在创建时返回一次，后续无法再次获取；如果丢失需要重新创建应用

#### 3.2F.3 `POST /api/admin/v1/bot-apps/{appId}/disable`

禁用 BOT 应用。将指定 BOT 应用设为禁用状态，禁用后该应用无法接收和发送消息。

权限要求：`bot_app.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 被禁用的应用 ID |

#### 3.2F.4 `POST /api/admin/v1/bot-apps/{appId}/enable`

启用 BOT 应用。将指定 BOT 应用恢复为启用状态。

权限要求：`bot_app.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 被启用的应用 ID |

#### 3.2F.5 `GET /api/admin/v1/bot-apps/{appId}/conversation-grants`

查询 BOT 会话授权。返回指定 BOT 应用被授权访问的会话列表。

权限要求：`bot_app.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |

无请求参数。

响应 `data`：`AdminBotConversationGrantDto[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | GUID | 被授权的会话 ID |
| `grantedAt` | datetime | 授权时间 |
| `grantedByUserId` | GUID | 授权操作者用户 ID |

#### 3.2F.6 `PUT /api/admin/v1/bot-apps/{appId}/conversation-grants`

更新 BOT 会话授权。整体覆盖指定 BOT 应用的会话授权列表。传入的会话 ID 列表将替换现有全部授权记录。

权限要求：`bot_app.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |

请求体（`AdminUpdateBotConversationGrantsRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `conversationIds` | GUID[] | 是 | 要授权的会话 ID 列表；传空数组表示清除全部授权 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `appId` | GUID | 应用 ID |
| `updated` | bool | 是否更新成功（固定为 `true`） |

错误码：

| 错误码 | 说明 |
|---|---|
| `ADMIN_BOT_APP_NOT_FOUND` | 指定的 BOT 应用不存在 |
| `ADMIN_BOT_APP_GRANT_CONVERSATION_NOT_FOUND` | 提交的会话 ID 中包含不存在的会话 |

补充：

- 此操作为整体覆盖，不是增量添加；每次调用会先清除该应用的全部现有授权，再写入新的授权列表
- 会话 ID 列表中的空 GUID 和重复值会被自动过滤
- 所有提交的会话 ID 必须在当前租户内存在，否则返回错误

### 3.2G 服务账号管理端点详细文档

以下是 `/api/admin/v1/service-accounts/` 路由组下的服务账号管理端点详细文档。所有端点均需管理端 `accessToken` 鉴权。

服务账号是租户内的官方服务号，用于系统自动消息推送、客户接待等场景。每个服务账号有唯一的 `accountCode`。

#### 3.2G.1 `GET /api/admin/v1/service-accounts`

服务账号列表。返回当前租户下的全部服务账号，按创建时间倒序排列。

权限要求：`service_account.manage`

无请求参数。

响应 `data`：`CursorPage<AdminServiceAccountDto>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array | 服务账号列表，参见下方 `AdminServiceAccountDto` |
| `nextCursor` | string? | 下一页游标；当前固定为 `null` |

`items` 数组项（`AdminServiceAccountDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `serviceAccountId` | GUID | 服务账号 ID |
| `accountCode` | string | 账号编码（租户内唯一） |
| `displayName` | string | 显示名 |
| `status` | string | 状态（`active` / `disabled`） |
| `conversationTitle` | string? | 关联的会话标题 |

#### 3.2G.2 `POST /api/admin/v1/service-accounts`

创建服务账号。在当前租户下创建一个新的官方服务账号。

权限要求：`service_account.manage`

请求体（`AdminCreateServiceAccountRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `accountCode` | string | 是 | 账号编码，租户内唯一 |
| `displayName` | string | 是 | 显示名 |
| `avatarUrl` | string? | 否 | 头像 URL |

响应 `data`：`AdminCreateServiceAccountResponse`

| 字段 | 类型 | 说明 |
|---|---|---|
| `serviceAccountId` | GUID | 新创建的服务账号 ID |
| `accountCode` | string | 账号编码 |

错误码：

| 错误码 | 说明 |
|---|---|
| `ADMIN_SERVICE_ACCOUNT_EXISTS` | 账号编码已存在 |

#### 3.2G.3 `PUT /api/admin/v1/service-accounts/{serviceAccountId}`

更新服务账号。修改指定服务账号的显示名、头像和状态。

权限要求：`service_account.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `serviceAccountId` | GUID | 服务账号 ID |

请求体（`AdminUpdateServiceAccountRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `displayName` | string | 是 | 显示名 |
| `avatarUrl` | string? | 否 | 头像 URL |
| `status` | string | 是 | 状态（`active` / `disabled`） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `serviceAccountId` | GUID | 被更新的服务账号 ID |

错误码：

| 错误码 | 说明 |
|---|---|
| `ADMIN_SERVICE_ACCOUNT_NOT_FOUND` | 指定的服务账号不存在 |

补充：

- 如果更新的是默认官方服务账号（`accountCode` 为系统预设值），系统会自动同步更新该服务账号在租户内的用户投影信息

#### 3.2G.4 `DELETE /api/admin/v1/service-accounts/{serviceAccountId}`

删除服务账号。删除指定的服务账号。如果删除的是默认官方服务账号，系统会同时清理该服务账号的好友关系并禁用对应的用户投影。

权限要求：`service_account.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `serviceAccountId` | GUID | 服务账号 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `serviceAccountId` | GUID | 被删除的服务账号 ID |

错误码：

| 错误码 | 说明 |
|---|---|
| `ADMIN_SERVICE_ACCOUNT_NOT_FOUND` | 指定的服务账号不存在 |

补充：

- 删除默认官方服务账号时，系统会自动清理该服务账号对应用户的全部好友关系，并将该用户状态设为禁用
- 删除操作不可逆；如需恢复，需重新创建服务账号并重建客户好友关系

### 3.2H 角色与权限管理端点

以下是 `/api/admin/v1/roles/` 路由组下的角色与权限管理端点。所有端点均需管理端 `accessToken` 鉴权。

#### 3.2H.0 `POST /api/admin/v1/users/bulk-assign-roles`

批量给一批用户分配同一组角色。

权限要求：`admin.user.manage_roles`

请求体（`BulkAssignRolesRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `userIds` | GUID[] | 是 | 目标用户 ID 列表 |
| `roleCodes` | string[] | 是 | 要分配的角色编码列表;整体覆盖目标用户当前角色 |

响应 `data`(`BulkAssignRolesResultDto`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `successCount` | int | 成功更新的用户数 |
| `failCount` | int | 失败的用户数 |
| `errors` | `BatchErrorDto[]` | 失败明细;每项含 `id`(用户 ID 字符串)、`error`(错误信息) |

错误码（按单项汇总到 `errors`，整体始终 200）：

| 错误码 | 触发条件 |
|---|---|
| `ADMIN_SELF_ROLE_REVOKE_FORBIDDEN` | 列表里包含当前管理员自己且新角色集为空 |
| `ADMIN_ROLE_NOT_FOUND` | 提交的角色编码中包含不存在或未激活的角色 |
| `ADMIN_USER_NOT_FOUND` | 列表中某用户在当前租户内不存在 |

#### 3.2H.1 `GET /api/admin/v1/roles/{roleCode}/permissions`

查询角色权限。返回指定角色的全部权限配置，包含每个权限的分配状态。

权限要求：`admin.role.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleCode` | string | 角色编码 |

响应 `data`：`AdminRolePermissionConfigDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleId` | GUID | 角色 ID |
| `roleCode` | string | 角色编码 |
| `roleName` | string | 角色名称 |
| `permissions` | array | 权限列表，参见下方 `AdminRolePermissionDto` |

`permissions` 数组项（`AdminRolePermissionDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `permissionCode` | string | 权限编码 |
| `permissionName` | string | 权限名称 |
| `category` | string | 权限分类 |
| `description` | string | 权限描述 |
| `isEnforced` | bool | 是否为强制权限（不可取消） |
| `assigned` | bool | 当前角色是否已分配该权限 |

#### 3.2H.2 `PUT /api/admin/v1/roles/{roleCode}/permissions`

更新角色权限。覆盖指定角色的全部权限分配。

权限要求：`admin.role.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleCode` | string | 角色编码 |

请求体（`UpdateAdminRolePermissionsRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `permissionCodes` | string[] | 是 | 要分配给该角色的权限编码列表 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleCode` | string | 被更新的角色编码 |

补充：

- 强制权限（`isEnforced=true`）即使不在 `permissionCodes` 列表中也会保留
- 更新操作为全量覆盖，未在列表中的非强制权限将被取消分配

#### 3.2H.3 `POST /api/admin/v1/roles`

创建租户角色。

权限要求：`admin.role.manage`

请求体（`CreateAdminRoleRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `roleCode` | string | 是 | 角色编码,租户内唯一,会被转为小写 |
| `roleName` | string | 是 | 显示名 |
| `description` | string? | 否 | 描述 |
| `sourceRoleCode` | string? | 否 | 用作模板的现有角色编码;不传则只创建空角色 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleId` | GUID | 新角色 ID |
| `roleCode` | string | 角色编码（已小写化） |

错误码:

| 错误码 | 触发条件 |
|---|---|
| `ADMIN_ROLE_EXISTS` | 角色编码已存在 |
| `ADMIN_ROLE_TEMPLATE_NOT_FOUND` | `sourceRoleCode` 指定的模板角色不存在或未激活 |

补充:

- 若提供 `sourceRoleCode`,新角色会继承模板角色的全部权限分配(非强制权限可后续调整)
- 强制权限始终自动分配,无论模板如何

#### 3.2H.4 `PUT /api/admin/v1/roles/{roleCode}/status`

启用 / 停用角色。

权限要求：`admin.role.manage`

路径参数:

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleCode` | string | 角色编码 |

请求体:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `status` | string | 是 | `active` 或 `disabled` |

响应 `data`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleCode` | string | 被更新的角色编码 |
| `status` | string | 更新后的状态 |

补充:

- 停用角色后,系统不再允许把该角色分配给新用户,但已经持有该角色的用户保留
- 内建强制角色不允许停用,会返回 `ADMIN_ROLE_FORBIDDEN`

#### 3.2H.5 `DELETE /api/admin/v1/roles/{roleCode}`

删除自定义角色。

权限要求：`admin.role.manage`

路径参数:

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleCode` | string | 角色编码 |

无请求体。

响应 `data`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleCode` | string | 被删除的角色编码 |

错误码:

| 错误码 | 触发条件 |
|---|---|
| `ADMIN_ROLE_NOT_FOUND` | 指定的角色不存在 |
| `ADMIN_ROLE_FORBIDDEN` | 该角色是内建强制角色,不允许删除 |
| `ADMIN_ROLE_IN_USE` | 该角色仍有用户分配,需先解除分配 |

#### 3.2H.6 `GET /api/admin/v1/roles/{sourceRoleCode}/template-permissions`

预览模板角色权限。

供前端在「基于已有角色复制创建新角色」流程里预览源角色的权限集合。

权限要求：`admin.role.manage`

路径参数:

| 字段 | 类型 | 说明 |
|---|---|---|
| `sourceRoleCode` | string | 源角色编码 |

响应 `data`(`AdminRolePermissionConfigDto`,结构同 §3.2H.1):

| 字段 | 类型 | 说明 |
|---|---|---|
| `roleId` | GUID | 源角色 ID |
| `roleCode` | string | 源角色编码 |
| `roleName` | string | 源角色名称 |
| `permissions` | array | 权限列表(含 `assigned` 标记) |

### 3.2I Webhook 投递管理端点

以下是 `/api/admin/v1/webhook-deliveries/` 路由组下的 Webhook 投递管理端点。所有端点均需管理端 `accessToken` 鉴权。

#### 3.2I.1 `POST /api/admin/v1/webhook-deliveries/{deliveryId}/retry`

重试 Webhook 投递。对指定的失败投递记录发起重试。

权限要求：`webhook.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `deliveryId` | GUID | 投递记录 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `deliveryId` | GUID | 被重试的投递记录 ID |

#### 3.2I.2 `POST /api/admin/v1/webhook-deliveries/{deliveryId}/replay`

重放 Webhook 投递。对指定的投递记录创建一条新的投递任务，使用原始 payload 重新投递。

权限要求：`webhook.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `deliveryId` | GUID | 投递记录 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `deliveryId` | GUID | 被重放的投递记录 ID |

补充：

- `retry` 是在原投递记录上重试，会增加 `retryCount`
- `replay` 是创建一条全新的投递记录，原记录不变

#### 3.2I.3 `POST /api/admin/v1/outbox/dead-letters/retry`

批量重投消息发件箱死信。将当前租户所有 `publishStatus=3`（死信）的 outbox 记录重置为 `publishStatus=0` + `retryCount=0`，交由后台 Worker 重新投递。

权限要求：`outbox.view`

无请求体 / 无路径参数。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `reset` | int | 本次重置的死信记录数量 |

补充：

- 该接口只处理死信态（`publishStatus=3`）记录，不会影响 pending / retrying / published 记录
- Worker 周期任务会对死信量 > 0 时上报心跳并记录 LogError 告警

### 3.2J 系统配置管理端点

以下是 `/api/admin/v1/system-configs/` 路由组下的系统配置管理端点。所有端点均需管理端 `accessToken` 鉴权。

#### 3.2J.1 `PUT /api/admin/v1/system-configs/{configKey}`

更新配置项。修改指定配置项的值。

权限要求：`system_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `configKey` | string | 配置项键名 |

请求体（`UpdateSystemConfigRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `jsonValue` | string | 是 | 配置项的新值（JSON 字符串） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `configKey` | string | 被更新的配置项键名 |

#### 3.2J.2 `GET /api/admin/v1/system-configs/{configKey}/history`

配置变更历史。返回指定配置项的全部变更记录。

权限要求：`system_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `configKey` | string | 配置项键名 |

响应 `data`：`CursorPage<SystemConfigHistoryDto>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | array | 变更记录列表 |
| `nextCursor` | string? | 下一页游标 |

`items` 数组项（`SystemConfigHistoryDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `historyId` | GUID | 历史记录 ID |
| `configKey` | string | 配置项键名 |
| `version` | int | 版本号 |
| `operationCode` | string | 操作类型（`update` / `rollback`） |
| `jsonValue` | string | 该版本的配置值（JSON 字符串） |
| `valuePreview` | string | 值预览（截断显示） |
| `changedByDisplayName` | string? | 操作者显示名 |
| `createdAt` | string | 变更时间（ISO 8601） |

#### 3.2J.3 `POST /api/admin/v1/system-configs/{configKey}/rollback`

回滚配置。将指定配置项回滚到历史版本。

权限要求：`system_config.manage`

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `configKey` | string | 配置项键名 |

请求体（`RollbackSystemConfigRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `historyId` | GUID | 是 | 要回滚到的历史记录 ID |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `configKey` | string | 被回滚的配置项键名 |

补充：

- 回滚操作本身也会生成一条新的历史记录（`operationCode=rollback`）
- 回滚后配置项的 `version` 会递增

### 3.2K 验证设置管理端点

#### 3.2K.0 `GET /api/admin/v1/verification-settings`

读取当前租户的验证设置（敏感字段脱敏读出）。

权限要求：`system_config.view`

响应 `data`（`AdminVerificationSettingsDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `smsRequired` | bool | 是否强制短信验证码 |
| `emailRequired` | bool | 是否强制邮件验证码 |
| `smsEnabled` | bool | 是否启用短信能力 |
| `emailEnabled` | bool | 是否启用邮件能力 |
| `smsSname` | string? | 短信服务商账号 |
| `smsSpwd` | string? | **恒为 null**（明文不再回读，改用 preview + has 开关判断） |
| `smsSpwdPreview` | string? | 短信密码末 4 位脱敏预览 |
| `hasSmsSpwd` | bool | 是否已配置短信密码 |
| `smsSprdid` | string? | 短信服务商产品 ID |
| `smsSign` | string? | 短信签名 |
| `smsProvider` | string? | 当前生效短信提供商名 |
| `emailApiKey` | string? | **恒为 null**（明文不再回读，改用 preview + has 开关判断） |
| `emailApiKeyPreview` | string? | 邮件 API Key 末 4 位脱敏预览 |
| `hasEmailApiKey` | bool | 是否已配置邮件 API Key |
| `emailSender` | string? | 邮件发件地址 |
| `emailSenderName` | string? | 邮件发件人名称 |
| `emailProvider` | string? | 当前生效邮件提供商名 |

客户端渲染指南：
- 前端把 `smsSpwdPreview` / `emailApiKeyPreview` 展示为输入框的 `placeholder`，用户若留空提交则应从请求体剔除对应字段，语义为"保持原值不修改"。
- 若需要判断"是否已配置"，使用 `hasSmsSpwd` / `hasEmailApiKey` 而非判断 `smsSpwd != null`。

#### 3.2K.1 `PUT /api/admin/v1/verification-settings`

更新验证设置。修改当前租户的短信和邮件验证配置，包括启用/禁用开关和供应商凭据。

权限要求：`system_config.manage`

请求体（`UpdateVerificationSettingsRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `smsRequired` | bool? | 否 | 是否要求短信验证 |
| `emailRequired` | bool? | 否 | 是否要求邮件验证 |
| `smsEnabled` | bool? | 否 | 是否启用短信通道 |
| `emailEnabled` | bool? | 否 | 是否启用邮件通道 |
| `smsSname` | string? | 否 | 短信供应商用户名（乐信） |
| `smsSpwd` | string? | 否 | 短信供应商密码（乐信） |
| `smsSprdid` | string? | 否 | 短信供应商产品 ID（乐信） |
| `smsSign` | string? | 否 | 短信签名（乐信） |
| `emailApiKey` | string? | 否 | 邮件供应商 API Key（SMTP2GO） |
| `emailSender` | string? | 否 | 邮件发送者地址（SMTP2GO） |
| `emailSenderName` | string? | 否 | 邮件发送者名称（SMTP2GO） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `updated` | bool | 是否更新成功（固定为 `true`） |

补充：

- 所有字段均为可选，只传需要修改的字段即可
- 内部实现会将每个字段映射为独立的系统配置项进行更新
- 短信供应商当前为乐信，邮件供应商当前为 SMTP2GO

### 3.2L 告警规则与告警历史端点

以下是告警规则和告警历史管理端点。所有端点均需管理端 `accessToken` 鉴权。

#### 3.2L.1 `POST /api/admin/v1/alert-rules`

创建告警规则。

无额外权限要求（需管理端登录）。

请求体（`CreateAlertRuleRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `ruleName` | string | 是 | 规则名称 |
| `metricKey` | string | 是 | 监控指标键名 |
| `condition` | string | 是 | 触发条件（如 `gt`、`lt`、`eq`） |
| `threshold` | double | 是 | 阈值 |
| `severity` | string | 是 | 严重级别（`info` / `warning` / `critical`） |
| `notifyChannels` | string[]? | 否 | 通知渠道 ID 列表 |
| `cooldownMinutes` | int | 是 | 冷却时间（分钟） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ruleId` | GUID | 新创建的告警规则 ID |

#### 3.2L.2 `PUT /api/admin/v1/alert-rules/{ruleId}`

更新告警规则。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ruleId` | GUID | 告警规则 ID |

请求体（`UpdateAlertRuleRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `ruleName` | string? | 否 | 规则名称 |
| `metricKey` | string? | 否 | 监控指标键名 |
| `condition` | string? | 否 | 触发条件 |
| `threshold` | double? | 否 | 阈值 |
| `severity` | string? | 否 | 严重级别 |
| `notifyChannels` | string[]? | 否 | 通知渠道 ID 列表 |
| `cooldownMinutes` | int? | 否 | 冷却时间（分钟） |
| `enabled` | bool? | 否 | 是否启用 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ruleId` | GUID | 被更新的告警规则 ID |

#### 3.2L.3 `DELETE /api/admin/v1/alert-rules/{ruleId}`

删除告警规则。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ruleId` | GUID | 告警规则 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ruleId` | GUID | 被删除的告警规则 ID |

#### 3.2L.4 `POST /api/admin/v1/alert-history/{alertId}/acknowledge`

确认告警。将指定告警标记为已确认。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `alertId` | GUID | 告警记录 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `alertId` | GUID | 被确认的告警记录 ID |

#### 3.2L.5 `POST /api/admin/v1/alert-history/{alertId}/silence`

静默告警。在指定时间内静默该告警，不再触发通知。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `alertId` | GUID | 告警记录 ID |

请求体（`SilenceAlertRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `durationMinutes` | int | 是 | 静默时长（分钟） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `alertId` | GUID | 被静默的告警记录 ID |

补充：

- 告警规则的 `AlertRuleDto` 完整字段参见 [admin-api-reference.md](./admin-api-reference.md)
- 告警历史的 `AlertHistoryDto` 完整字段参见 [admin-api-reference.md](./admin-api-reference.md)

### 3.2M 通知渠道管理端点

以下是 `/api/admin/v1/notify-channels/` 路由组下的通知渠道管理端点。所有端点均需管理端 `accessToken` 鉴权。

#### 3.2M.1 `POST /api/admin/v1/notify-channels`

创建通知渠道。

请求体（`CreateNotifyChannelRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `channelName` | string | 是 | 渠道名称 |
| `channelType` | string | 是 | 渠道类型（如 `email`、`webhook`、`sms`） |
| `config` | string | 是 | 渠道配置（JSON 字符串，按 `channelType` 不同而异） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelId` | GUID | 新创建的通知渠道 ID |

#### 3.2M.2 `PUT /api/admin/v1/notify-channels/{channelId}`

更新通知渠道。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelId` | GUID | 通知渠道 ID |

请求体（`UpdateNotifyChannelRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `channelName` | string? | 否 | 渠道名称 |
| `channelType` | string? | 否 | 渠道类型 |
| `config` | string? | 否 | 渠道配置（JSON 字符串） |
| `enabled` | bool? | 否 | 是否启用 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelId` | GUID | 被更新的通知渠道 ID |

#### 3.2M.3 `DELETE /api/admin/v1/notify-channels/{channelId}`

删除通知渠道。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelId` | GUID | 通知渠道 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelId` | GUID | 被删除的通知渠道 ID |

#### 3.2M.4 `POST /api/admin/v1/notify-channels/{channelId}/test`

测试通知渠道。向指定渠道发送一条测试通知，验证渠道配置是否正确。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelId` | GUID | 通知渠道 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `channelId` | GUID | 被测试的通知渠道 ID |
| `sent` | bool | 测试通知是否已发送（固定为 `true`） |

补充：

- 通知渠道的 `NotifyChannelDto` 完整字段：`channelId`、`channelName`、`channelType`、`config`、`enabled`、`createdAt`
- `config` 字段为 JSON 字符串，具体结构取决于 `channelType`

### 3.2N 公告管理端点

以下是 `/api/admin/v1/announcements/` 路由组下的公告管理端点。所有端点均需管理端 `accessToken` 鉴权。

#### 3.2N.1 `POST /api/admin/v1/announcements`

创建公告。创建一条新的企业公告（草稿状态）。

请求体（`CreateAnnouncementRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 是 | 公告标题 |
| `content` | string | 是 | 公告内容 |
| `targetScope` | string | 是 | 投放范围（`all` / `role`） |
| `targetId` | GUID? | 否 | 投放目标 ID（`targetScope=role` 时使用） |
| `targetCode` | string? | 否 | 投放目标编码（`targetScope=role` 时使用，如角色编码） |
| `priority` | string | 是 | 优先级（`normal` / `important` / `urgent`） |
| `expiresAt` | string? | 否 | 过期时间（ISO 8601） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `announcementId` | GUID | 新创建的公告 ID |

#### 3.2N.2 `PUT /api/admin/v1/announcements/{announcementId}`

更新公告。修改指定公告的内容。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `announcementId` | GUID | 公告 ID |

请求体（`UpdateAnnouncementRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string? | 否 | 公告标题 |
| `content` | string? | 否 | 公告内容 |
| `targetScope` | string? | 否 | 投放范围 |
| `targetId` | GUID? | 否 | 投放目标 ID |
| `targetCode` | string? | 否 | 投放目标编码 |
| `priority` | string? | 否 | 优先级 |
| `expiresAt` | string? | 否 | 过期时间 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `announcementId` | GUID | 被更新的公告 ID |

#### 3.2N.3 `POST /api/admin/v1/announcements/{announcementId}/publish`

发布公告。将草稿状态的公告发布给目标用户。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `announcementId` | GUID | 公告 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `announcementId` | GUID | 被发布的公告 ID |

#### 3.2N.4 `POST /api/admin/v1/announcements/{announcementId}/archive`

归档公告。将已发布的公告归档，不再对用户展示。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `announcementId` | GUID | 公告 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `announcementId` | GUID | 被归档的公告 ID |

补充：

- 公告生命周期：`draft`（草稿）→ `published`（已发布）→ `archived`（已归档）
- `targetScope=role` 时需配合 `targetCode` 指定角色编码，实现角色定向投放
- 公告的 `AnnouncementDto` 完整字段：`announcementId`、`title`、`content`、`targetScope`、`targetId`、`targetCode`、`priority`、`status`、`publishedAt`、`expiresAt`、`createdAt`

### 3.2N+ 审计日志端点扩展

#### `GET /api/admin/v1/audit-logs/action-codes`

返回该租户审计日志支持的 `actionCode` 枚举字典。供前端在筛选器中渲染下拉项。

权限要求:`audit_log.view`

响应 `data`:`AuditLogActionCodeDto[]`,每项字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `actionCode` | string | 动作代码 |
| `displayName` | string | 展示名 |
| `category` | string | 分类(如 `user`、`role`、`config`、`customer_service`) |

#### `GET /api/admin/v1/audit-logs/stats`

返回审计日志的统计概览。

权限要求:`audit_log.view`

Query 参数:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `from` | string? | 否 | ISO 8601 开始时间 |
| `to` | string? | 否 | ISO 8601 结束时间 |

响应 `data`(`AuditLogStatsDto`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalCount` | int | 总条数 |
| `byActionCode` | array | 每项 `actionCode` + `count` |
| `byActor` | array | 每项 `actorUserId` + `displayName` + `count` |
| `byTargetType` | array | 每项 `targetType` + `count` |
| `trend` | array | 每项 `label`(日期) + `value` |

#### `GET /api/admin/v1/audit-logs/export`

异步导出审计日志。返回导出任务 ID,实际下载需通过 §3.2O 的 export-task 接口。

权限要求:`audit_log.view`

Query 参数:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `actionCode` | string? | 否 | 单值匹配 |
| `targetType` | string? | 否 | 单值匹配 |
| `from` | string? | 否 | ISO 8601 |
| `to` | string? | 否 | ISO 8601 |
| `format` | string? | 否 | `csv`(默认) / `xlsx` |

响应 `data`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `taskId` | GUID | 导出任务 ID,后续在 `/export-tasks/{taskId}` 跟进 |

### 3.2N++ 管理员登录日志 insights

#### `GET /api/admin/v1/admin-login-logs/insights`

返回管理后台登录日志的概览洞察。

权限要求:`admin_login_log.view`

Query 参数:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `from` | string? | 否 | ISO 8601 开始时间 |
| `to` | string? | 否 | ISO 8601 结束时间 |

响应 `data`(`AdminLoginLogInsightsDto`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalLogins` | int | 期间登录总数 |
| `successLogins` | int | 成功数 |
| `failedLogins` | int | 失败数 |
| `uniqueAccounts` | int | 涉及的不同账号数 |
| `uniqueIps` | int | 涉及的不同 IP 数 |
| `topAccounts` | array | 每项 `userId` + `displayName` + `loginCount` |
| `topFailureReasons` | array | 每项 `reason` + `count` |
| `recentFailures` | array | 最近若干次失败记录(摘要) |

### 3.2O 导出任务端点

#### 3.2O.1 `POST /api/admin/v1/export-tasks`

创建导出任务。提交一个异步导出任务，导出完成后可通过下载端点获取文件。

请求体（`CreateExportTaskRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `exportType` | string | 是 | 导出类型（如 `users`、`messages`、`audit_logs`） |
| `filters` | object? | 否 | 筛选条件（键值对，按 `exportType` 不同而异） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `taskId` | GUID | 新创建的导出任务 ID |

补充：

- 导出任务为异步执行，创建后状态为 `pending`
- 可通过 `GET /api/admin/v1/export-tasks` 查询任务列表和状态
- 导出完成后通过 `GET /api/admin/v1/export-tasks/{taskId}/download` 下载文件
- 导出任务的 `ExportTaskDto` 完整字段：`taskId`、`tenantId`、`exportType`、`status`、`fileName`、`downloadUrl`、`recordCount`、`createdAt`、`completedAt`

### 3.2P 仪表盘 V2 与消息搜索别名

#### 3.2P.1 `GET /api/admin/v1/dashboard/v2`

V2 仪表盘。返回增强版管理后台仪表盘数据，包含更多维度的统计信息和趋势数据。

权限要求：`dashboard.view`

无请求参数。

响应 `data`：`AdminDashboardV2Dto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `onlineUsers` | int | 当前在线用户数 |
| `totalUsers` | int | 总用户数 |
| `newUsersToday` | int | 今日新增用户数 |
| `activeConversations` | int | 活跃会话数 |
| `totalGroups` | int | 总群组数 |
| `activeGroupsToday` | int | 今日活跃群组数 |
| `messagesToday` | int | 今日消息数 |
| `webhookDeliveries` | int | Webhook 投递数 |
| `serviceAccounts` | int | 服务账号数 |
| `botApps` | int | BOT 应用数 |
| `systemAlerts` | int | 系统告警数 |
| `pendingOutbox` | int | 待处理发件箱数 |
| `deadLetterDeliveries` | int | 死信投递数 |
| `messageTrend` | array | 消息趋势，参见 `TrendPointDto` |
| `userTrend` | array | 用户趋势，参见 `TrendPointDto` |

`messageTrend` / `userTrend` 数组项（`TrendPointDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `label` | string | 标签（日期） |
| `value` | int | 数值 |

#### 3.2P.2 `GET /api/admin/v1/messages/search`

消息搜索（别名路由）。与 `GET /api/admin/v1/messages` 共用同一处理函数，提供语义更明确的搜索路由。

权限要求：与 `GET /api/admin/v1/messages` 一致。

请求参数、响应结构与 `GET /api/admin/v1/messages` 完全相同。

### 3.2Q AI 服务配置中心

Base URL：`/api/admin/v1/ai-service`

AI 服务中心是当前租户全部 AI 能力(临时会话 AI 客服、IM 客服 AI 辅助、RAG 等)的统一配置入口,覆盖：

- 当前生效的 AI 配置(LLM Provider、Reranker、Embedding、RAG 融合策略、节流预算、话术)
- 配置探测(同步探测和流式 SSE 探测)
- AI 用量统计、断路器状态、调用审计
- 各类 preset 元数据(provider 列表、嵌入模型列表、reranker 模型列表、融合策略列表)

主权限码:`ai_service.config.manage`(包含读和写);4 个 preset 路由不需要该权限,任何已登录管理员均可访问。

#### 3.2Q.1 `GET /ai-service/config`

读取当前租户生效的 AI 服务配置。

权限要求：`ai_service.config.manage`

无请求体。

响应 `data`:`AiServiceConfigModel`(完整字段表见 §3.2Q.13)。

**重要说明:** GET 返回的配置里**所有 API key 字段是脱敏的**。

- `*ApiKeyCiphertext` 字段在 GET 响应里**为 null**
- 只保留 `*ApiKeyPreview`,显示末 4 位
- 客户端如果要写入新的 key,使用 PUT 接口 + `*ApiKeyPlaintext` 字段提交明文,服务端会自行加密保存
- 仅写入不修改 key 时,可以省略 `*ApiKeyPlaintext` / `*ApiKeyCiphertext`,key 保持原值

#### 3.2Q.2 `PUT /ai-service/config`

整体覆盖当前租户的 AI 服务配置。

权限要求：`ai_service.config.manage`

请求体:`AiServiceConfigModel`(同 §3.2Q.13)。

注意点:

- 写入 LLM / Reranker / Embedding 的 API key 时,使用 `replyApiKeyPlaintext` / `rerankerApiKeyPlaintext` / `embeddingApiKeyPlaintext`,服务端会加密落库
- 留空 `*ApiKeyPlaintext` + 留空 `*ApiKeyCiphertext` = 保留原 key
- 显式置空字符串("") = 清除该 key
- `ragFusionStrategy` 见 §3.2Q.14

响应 `data`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `updated` | bool | 固定为 `true` |

#### 3.2Q.3 `POST /ai-service/config/probe`

同步探测 AI 配置。

权限要求：`ai_service.config.manage`

请求体（`AiServiceProbeRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `config` | `AiServiceConfigModel?` | 否 | 临时探测用的配置;不传则使用当前已保存配置 |
| `prompt` | string? | 否 | 测试提示词;不传则使用内置默认 |

响应 `data`（`AiServiceProbeResultDto`）:

| 字段 | 类型 | 说明 |
|---|---|---|
| `success` | bool | 探测是否成功 |
| `provider` | string | 实际命中的 provider 标识 |
| `model` | string | 实际命中的模型标识 |
| `statusCode` | int? | provider 上游返回的 HTTP 状态码 |
| `message` | string | 结果消息或错误说明 |
| `replyPreview` | string? | 返回内容的前若干字符预览 |
| `latencyMs` | int | 端到端往返耗时(毫秒) |
| `inputTokens` | int? | 输入 token 数 |
| `outputTokens` | int? | 输出 token 数 |
| `totalTokens` | int? | 总 token 数 |
| `estimatedCostUsd` | decimal? | 预估美元成本 |

补充:

- 此端点不消耗 monthly budget,但会写入用量审计
- 与旧的 `/customer-service/temp-sessions/config/ai/probe` 区别:本端点请求体字段名是 `config`,旧端点是 `ai`;旧端点保留作为兼容入口

#### 3.2Q.4 `POST /ai-service/config/probe/stream`

流式探测 AI 配置。返回 Server-Sent Events 流。

权限要求：`ai_service.config.manage`

响应 Content-Type:`text/event-stream`

请求体同 §3.2Q.3(`AiServiceProbeRequest`)。

事件流格式:

```text
data: {"chunk":"...","isDone":false}\n\n
data: {"chunk":"...","isDone":false}\n\n
data: {"chunk":"","isDone":true,"summary":{...}}\n\n
```

每条 `data:` 行的 JSON 字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `chunk` | string | 本次增量文本 |
| `isDone` | bool | 是否为最后一段 |
| `summary` | object? | 仅最后一段携带,等价 §3.2Q.3 的 `AiServiceProbeResultDto` |
| `error` | string? | provider 报错时返回的错误信息 |

客户端处理建议:

- 收到 `isDone=true` 后停止读取
- 任何一帧上的 `error` 字段非空都视为整体探测失败
- 客户端断开连接服务端会停止生成

#### 3.2Q.5 `GET /ai-service/usage`

查询当前租户的 AI 月度用量。

权限要求：`ai_service.config.manage`

Query 参数:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `month` | string | 是 | `YYYY-MM` 格式 |

响应 `data`(`AiServiceUsageDto`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `month` | string | `YYYY-MM` |
| `totalCalls` | int | 调用次数 |
| `successCalls` | int | 成功次数 |
| `failedCalls` | int | 失败次数 |
| `totalInputTokens` | long | 输入 token 总数 |
| `totalOutputTokens` | long | 输出 token 总数 |
| `totalTokens` | long | token 总数 |
| `estimatedCostUsd` | decimal | 预估成本(美元) |
| `budgetUsd` | decimal? | 该月预算(为空表示无预算) |
| `budgetUsagePercent` | decimal? | 预算消耗百分比 |
| `byFeature` | array | 按 feature 维度细分;每项含 `feature`、`calls`、`tokens`、`costUsd` |
| `byProvider` | array | 按 provider 维度细分;每项含 `provider`、`calls`、`tokens`、`costUsd` |

#### 3.2Q.6 `GET /ai-service/circuit`

查询断路器状态。AI 服务发生连续失败时,服务端会自动暂时短路相关 provider,这个端点用于运营查看当前短路情况。

权限要求：`ai_service.config.manage`

响应 `data`(`AiServiceCircuitStatusDto`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `state` | string | `closed`(正常)、`open`(短路中)、`half_open`(试探中) |
| `provider` | string | 当前生效的 reply provider |
| `model` | string | 当前生效的 reply model |
| `lastFailureAt` | string? | 最后一次失败时间 |
| `lastFailureReason` | string? | 最后一次失败原因 |
| `consecutiveFailures` | int | 当前连续失败计数 |
| `cooldownUntil` | string? | 短路解除时间;`state=open` 时有值 |

#### 3.2Q.7 `GET /ai-service/audits`

查询 AI 调用审计明细。

权限要求：`ai_service.config.manage`

Query 参数:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `from` | string? | 否 | ISO 8601 开始时间 |
| `to` | string? | 否 | ISO 8601 结束时间 |
| `sessionRef` | string? | 否 | 关联会话标识(临时会话 `sessionId`、direct chat `threadId` 等) |
| `provider` | string? | 否 | provider 标识精确匹配 |
| `feature` | string? | 否 | 业务模块标识(如 `temp_session.reply`、`im_direct.suggest`) |
| `successOnly` | bool? | 否 | `true` 仅返回成功项 |
| `limit` | int? | 否 | 返回条数上限(默认 100,最大 500) |

响应 `data`:`AiServiceAuditDto[]`,每项字段见 §3.2Q.8。

#### 3.2Q.8 `GET /ai-service/audits/{auditId}`

查询单条 AI 调用审计详情。

权限要求：`ai_service.config.manage`

路径参数:

| 字段 | 类型 | 说明 |
|---|---|---|
| `auditId` | GUID | 审计 ID |

响应 `data`(`AiServiceAuditDto`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `auditId` | GUID | 审计 ID |
| `tenantId` | GUID | 租户 ID |
| `sessionRef` | string? | 关联会话标识 |
| `feature` | string | 业务模块标识 |
| `provider` | string | provider 标识 |
| `model` | string | 模型标识 |
| `success` | bool | 是否成功 |
| `statusCode` | int? | provider HTTP 状态码 |
| `latencyMs` | int | 端到端耗时 |
| `inputTokens` | int? | 输入 token 数 |
| `outputTokens` | int? | 输出 token 数 |
| `totalTokens` | int? | 总 token 数 |
| `estimatedCostUsd` | decimal? | 预估成本 |
| `prompt` | string? | 完整 prompt;仅在 `logPromptsForAudit=true` 时记录,且可能根据 `maskPiiInLogs` 做脱敏 |
| `reply` | string? | 完整回复;同上 |
| `error` | string? | 失败时的错误描述 |
| `createdAt` | string | ISO 8601 时间 |

补充:

- 审计数据保留期由 `auditRetentionDays`(配置项)控制,默认 90 天
- 默认不记录完整 prompt / reply,需要在配置中显式打开 `logPromptsForAudit=true`

#### 3.2Q.9 `GET /ai-service/providers`

返回内置 LLM provider preset 列表。**响应不走标准壳**,直接返回 `{ success, data }`。

权限要求：任何已登录管理员。

响应:

```json
{
  "success": true,
  "data": [ { "providerCode": "...", "displayName": "...", "apiFormat": "...", "supportedFeatures": [...] } ]
}
```

`data` 数组项字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `providerCode` | string | provider 标识 |
| `displayName` | string | 展示名 |
| `apiFormat` | string | API 协议(如 `openai`、`anthropic`、`openrouter`) |
| `defaultBaseUrl` | string? | 缺省 API base URL |
| `defaultModel` | string? | 缺省模型 |
| `supportedFeatures` | string[] | 该 provider 支持的特性列表(`reply`、`embedding`、`reranker`、`multimodal` 等) |

#### 3.2Q.10 `GET /ai-service/embedding-models`

返回内置 embedding 模型 preset 列表。**响应不走标准壳**,直接返回 `{ success, data }`。

权限要求：任何已登录管理员。

`data` 数组项字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `providerCode` | string | provider 标识 |
| `model` | string | 模型标识 |
| `displayName` | string | 展示名 |
| `dimension` | int | 输出向量维度 |
| `defaultBaseUrl` | string? | 缺省 API base URL |

#### 3.2Q.11 `GET /ai-service/reranker-models`

返回内置 reranker 模型 preset 列表。**响应不走标准壳**,直接返回 `{ success, data }`。

权限要求：任何已登录管理员。

`data` 数组项字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `providerCode` | string | provider 标识 |
| `model` | string | 模型标识 |
| `displayName` | string | 展示名 |
| `defaultBaseUrl` | string? | 缺省 API base URL |

#### 3.2Q.12 `GET /ai-service/rag-fusion-strategies`

返回支持的 RAG 融合策略 preset 列表。**响应不走标准壳**,直接返回 `{ success, data }`。

权限要求：任何已登录管理员。

`data` 数组项字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | string | 策略代码,见 §3.2Q.14 |
| `displayName` | string | 展示名 |
| `description` | string | 策略说明 |
| `requiresReranker` | bool | 该策略是否需要配置 reranker |

#### 3.2Q.13 `AiServiceConfigModel` 字段表

**基础**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `enabled` | bool | 是否启用 AI 服务总开关 |
| `botDisplayName` | string | 机器人显示名,会出现在对话气泡 |

**Provider(LLM 主回复)**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `replyProvider` | string | provider 标识 |
| `replyModel` | string | 主模型 |
| `fallbackModel` | string? | 主模型不可用时的兜底模型 |
| `apiBaseUrl` | string | API base URL |
| `providerApiFormat` | string | API 协议(`openai`/`anthropic`/`openrouter` 等) |
| `anthropicVersion` | string? | `providerApiFormat=anthropic` 时使用的 API 版本头 |
| `siteUrl` | string? | OpenRouter HTTP-Referer |
| `appName` | string? | OpenRouter X-Title |
| `replyApiKeyPlaintext` | string? | 仅 PUT 写入时使用 |
| `replyApiKeyCiphertext` | string? | GET 恒为 null |
| `replyApiKeyPreview` | string? | 末 4 位脱敏预览 |

**模型行为**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `maxOutputTokens` | int | 单次回复最大 token 数 |
| `temperature` | double | 采样温度 |
| `requestTimeoutSeconds` | int | 单次请求超时 |
| `maxRetries` | int | 单次请求失败重试次数 |
| `streamingEnabled` | bool | 是否启用流式输出 |
| `allowMultimodal` | bool | 是否允许多模态输入 |
| `systemPromptOverride` | string? | 自定义 system prompt;为空时使用内置默认 |

**节流 / 预算**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `maxAutoRepliesPerSession` | int | 单会话最大自动回复条数 |
| `maxConsecutiveAiMessages` | int | 连续 AI 消息最大条数,超过则等待对方回应 |
| `idleReplyCooldownSeconds` | int | 空闲再回复的冷却秒数 |
| `monthlyBudgetUsd` | decimal? | 月度预算上限,为空表示不限 |

**话术**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `autoGreetEnabled` | bool | 自动打招呼 |
| `autoReplyEnabled` | bool | 自动回复 |
| `autoHandoffEnabled` | bool | 自动转人工 |
| `escalationKeywords` | string[] | 转人工触发关键词 |
| `greetingMessages` | string[] | 招呼语候选 |
| `fallbackReplies` | string[] | 兜底回复候选 |
| `handoffReplies` | string[] | 转人工时的过渡语 |
| `disclaimerMessages` | string[] | 免责声明文案 |

**RAG**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `ragEnabled` | bool | 是否启用知识库检索增强 |
| `ragTopK` | int | 检索召回条数 |
| `ragScoreThreshold` | double | 相似度阈值 |
| `ragMaxContextChars` | int | 注入 prompt 的最大字符数 |
| `ragChunkSize` | int | 入库分块大小 |
| `ragChunkOverlap` | int | 分块 overlap |

**审计**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `logPromptsForAudit` | bool | 是否记录完整 prompt / reply |
| `maskPiiInLogs` | bool | 是否对审计日志做 PII 脱敏 |
| `auditRetentionDays` | int | 审计保留天数,默认 90 |

**Embedding**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `embeddingProvider` | string? | provider 标识 |
| `embeddingModel` | string? | 模型标识 |
| `embeddingApiBaseUrl` | string? | API base URL |
| `embeddingApiKeyPlaintext` | string? | 仅 PUT 写入时使用 |
| `embeddingApiKeyCiphertext` | string? | GET 恒为 null |
| `embeddingApiKeyPreview` | string? | 末 4 位脱敏预览 |
| `embeddingDim` | int | 输出向量维度;默认 1024 |

**Chunker 版本**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `chunkerVersion` | int | 入库切片器版本,默认 2 |

**RAG 融合 + Reranker**:

| 字段 | 类型 | 说明 |
|---|---|---|
| `ragFusionStrategy` | string | 见 §3.2Q.14;默认 `rrf` |
| `rerankerProvider` | string? | reranker provider 标识 |
| `rerankerModel` | string? | reranker 模型标识 |
| `rerankerApiBaseUrl` | string? | reranker API base URL |
| `rerankerApiKeyPlaintext` | string? | 仅 PUT 写入时使用 |
| `rerankerApiKeyCiphertext` | string? | GET 恒为 null |
| `rerankerApiKeyPreview` | string? | 末 4 位脱敏预览 |
| `rerankerCandidateLimit` | int | 进入 reranker 的候选数上限;默认 16 |

#### 3.2Q.14 `RagFusionStrategy` 枚举

| 值 | 名称 | 说明 |
|---|---|---|
| `rrf` | RRF(默认) | 数学合并向量 + 词法 rank,零额外成本,延迟极低 |
| `reranker` | 纯 Reranker | 双源各取候选 → 合并 → reranker 重排;需要配置 reranker provider |
| `hybrid` | Hybrid(推荐) | RRF 先粗筛 → reranker 精排;质量和成本折中 |

补充:

- 选择 `reranker` 或 `hybrid` 时必须填齐 `rerankerProvider` / `rerankerModel` / API key,否则 PUT 时返回 `AI_SERVICE_RERANKER_CONFIG_INCOMPLETE`
- `rrf` 不需要 reranker 配置即可工作

### 3.2R 客服中心配置与 Widget 配置

Base URL:`/api/admin/v1/customer-service`

#### 3.2R.1 `GET /customer-service/config`

读取当前租户客服中心通用配置。

权限要求:`customer_service.center.manage`

响应 `data`(`CustomerServiceConfigModel`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `defaultAssignmentMode` | string | `auto` / `manual` / `round_robin` |
| `acceptQueueEnabled` | bool | 是否启用排队 |
| `maxQueueSize` | int | 最大排队数 |
| `staffOfflineGraceSeconds` | int | 客服离线宽限秒数;过期后自动从在线翻为离线 |
| `staffBusyThreshold` | int | 客服同时进行中线程数达到该值时自动标记忙碌 |
| `defaultStaffMaxConcurrentSessions` | int | 客服默认最大并发 |
| `transferRequireApproval` | bool | 转派是否需要目标方同意 |
| `allowSelfClaim` | bool | 客服是否可自助认领排队线程 |
| `allowSupervisorIntervention` | bool | 是否允许「管理员介入」直接发言而不接管 |
| `auditRetentionDays` | int | 客服线程审计保留天数 |
| `workingHoursEnabled` | bool | 是否启用工作时间限制 |
| `workingHoursTimezone` | string | 工作时间时区 |
| `workingHoursSchedule` | object? | 工作时间排班 JSON |

#### 3.2R.2 `PUT /customer-service/config`

整体覆盖客服中心通用配置。

权限要求:`customer_service.center.manage`

请求体:`CustomerServiceConfigModel`(字段同 §3.2R.1)。

响应 `data`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `updated` | bool | 固定为 `true` |

#### 3.2R.3 `GET /customer-service/widget/config`

读取当前租户 Widget(网页咨询挂件)配置。

权限要求:`customer_service.center.manage`

响应 `data`(`WidgetConfigModel`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `widgetEnabled` | bool | 是否启用 Widget |
| `widgetTitle` | object? | 多语言标题 JSON |
| `widgetSubtitle` | object? | 多语言副标题 JSON |
| `widgetPrimaryColor` | string | 主色调 |
| `widgetPosition` | string | `bottom-right` / `bottom-left` |
| `widgetLogoUrl` | string? | Widget logo |
| `allowedDomainsEnabled` | bool | **是否启用域名白名单;默认 `false`,意为允许任意 origin 接入 Widget** |
| `allowedDomains` | string[] | 当 `allowedDomainsEnabled=true` 时生效;允许嵌入的域名列表 |
| `showPoweredBy` | bool | 是否显示 powered-by 字样 |
| `showQueueEstimate` | bool | 是否显示排队预估 |
| `requireVisitorInfo` | bool | 是否强制要求访客留资 |
| `visitorInfoFields` | string[] | 留资字段列表 |
| `customerIdSignEnabled` | bool | 是否启用客户 ID 签名 |
| `messageMaxLength` | int | 单条消息最大长度 |
| `sessionCreateCooldownSeconds` | int | 同一访客新建会话冷却秒数 |
| `ipRateLimitPerMinute` | int | IP 维度每分钟限流 |
| `fingerprintRateLimitPerMinute` | int | 指纹维度每分钟限流 |

#### 3.2R.4 `PUT /customer-service/widget/config`

整体覆盖 Widget 配置。

权限要求:`customer_service.center.manage`

请求体:`WidgetConfigModel`(字段同 §3.2R.3)。

响应 `data`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `updated` | bool | 固定为 `true` |

补充:

- `allowedDomainsEnabled=false` 时,**任何 origin 都可以加载 Widget**;生产部署建议显式开启白名单
- 当开启 `customerIdSignEnabled=true` 时,前端嵌入 Widget 需带上签名(算法见 client-api.md)

### 3.2S 统一客服线程子端点

Base URL:`/api/admin/v1/customer-service`

§3.2A 列出了统一客服中心主入口,本节补充几个针对线程的二级动作和直聊线程列表。

#### 3.2S.1 `GET /customer-service/threads/{threadType}/{threadId}/rating`

读取线程上的访客评价。

权限要求(任一):`customer_service.center.view`、`customer_service.temp_session.view`

路径参数:

| 字段 | 类型 | 说明 |
|---|---|---|
| `threadType` | string | `temp_session` 或 `direct_customer`(下划线和中划线都接受) |
| `threadId` | GUID | 线程 ID |

响应 `data`(`CustomerServiceThreadRatingDto`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `rating` | short? | 评分(1-5) |
| `tags` | string[] | 评价标签 |
| `comment` | string? | 评价内容 |
| `ratedAt` | string? | ISO 8601 |
| `ratedByUserId` | GUID? | 评价者用户 ID |
| `ratedByDisplayName` | string? | 评价者显示名 |

#### 3.2S.2 `GET /customer-service/threads/{threadType}/{threadId}/quality-checks`

读取线程上的质检记录列表。

权限要求(任一):`customer_service.center.view`、`customer_service.temp_session.view`

路径参数同 §3.2S.1。

响应 `data`:`CustomerServiceThreadQualityCheckDto[]`,每项字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `qualityCheckId` | GUID | 质检 ID |
| `score` | string | 质检评分 |
| `tags` | string[] | 质检标签 |
| `comment` | string? | 质检意见 |
| `checkedByUserId` | GUID | 质检人用户 ID |
| `checkedByDisplayName` | string | 质检人显示名 |
| `checkedAt` | string | ISO 8601 |

#### 3.2S.3 `POST /customer-service/threads/{threadType}/{threadId}/quality-checks`

新增一条质检记录。

权限要求:`customer_service.quality.manage`

请求体:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `score` | string | 是 | 质检评分 |
| `tags` | string[]? | 否 | 质检标签 |
| `comment` | string? | 否 | 质检意见 |

响应 `data`:同 §3.2S.2 单项。

#### 3.2S.4 `GET /customer-service/threads/{threadType}/{threadId}/transfers`

读取线程的转派历史。

权限要求(任一):`customer_service.center.view`、`customer_service.temp_session.view`

响应 `data`:`CustomerServiceThreadTransferDto[]`,每项字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `transferId` | GUID | 转派记录 ID |
| `fromStaffUserId` | GUID? | 原归属客服(为空表示从未归属) |
| `fromStaffDisplayName` | string? | 原归属客服显示名 |
| `toStaffUserId` | GUID | 接手客服 |
| `toStaffDisplayName` | string | 接手客服显示名 |
| `initiatedByUserId` | GUID | 操作者 |
| `initiatedByDisplayName` | string | 操作者显示名 |
| `reason` | string? | 转派理由 |
| `transferType` | string | `manual` / `auto` / `force` |
| `createdAt` | string | ISO 8601 |

#### 3.2S.5 `GET /customer-service/im-direct/threads`

直聊客服线程池(`direct_customer` 类型的单聊线程汇总视图)。可视作 §3.2A 主入口的 direct 子集快捷视图,适合需要单独管理已注册客户客服线程的运营页面。

权限要求(任一):`customer_service.center.view`、`customer_service.direct.view`

Query 参数:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `keyword` | string? | 否 | 关键词,匹配客户名 / 客户登录名 |
| `status` | string? | 否 | 见 §6.X direct 客服线程状态枚举 |
| `assignedStaffUserId` | GUID? | 否 | 按归属客服筛选 |
| `unassignedOnly` | bool? | 否 | 是否只看未分配 |

响应 `data`:`CursorPage<CustomerServiceDirectThreadListItemDto>`

每项字段:

| 字段 | 类型 | 说明 |
|---|---|---|
| `threadId` | GUID | 线程 ID |
| `conversationId` | GUID | 底层直聊会话 ID |
| `customerUserId` | GUID | 客户用户 ID |
| `customerDisplayName` | string | 客户显示名 |
| `customerAvatarUrl` | string? | 客户头像 |
| `status` | string | 状态枚举值 |
| `assignedStaffUserId` | GUID? | 归属客服 |
| `assignedStaffDisplayName` | string? | 归属客服显示名 |
| `lastMessageType` | string? | 最后消息类型 |
| `lastMessagePreview` | string? | 最后消息预览 |
| `lastMessageAt` | string? | ISO 8601 |
| `unreadCount` | int | 客服视角未读 |
| `updatedAt` | string | ISO 8601 |

### 3.2T 客服在线状态语义

客服服务状态(`serviceStatus`)的四值定义:

| 值 | 含义 |
|---|---|
| `offline` | 离线;不接收新分配 |
| `online` | 在线;可接受自动分配和手工分配 |
| `busy` | 忙碌;不接收新自动分配,可接收手工分配 |
| `break` | 短暂离开;不接收任何分配 |

**显式 vs 隐式状态**:

- **显式状态**:`offline` / `busy` / `break` 是客服或管理员主动设置的状态,服务端不会主动覆盖
- **隐式状态**(`online`):由服务端自动维护,客户端无需显式调任何接口
  - 客服登录后状态自动置为 `online`
  - 任意已认证 HTTP 请求都会自动刷新该客服的活跃心跳
  - 长时间没有任何心跳的 `online` 客服会被自动翻回 `offline`(具体时长由 §3.2R.1 的 `staffOfflineGraceSeconds` 控制)
- 客服把状态从 `offline` 之外的任意值切回 `online`、或者从 `online` 切到 `busy` / `break` 都是显式操作,服务端不会覆盖

接入建议:

- 客户端**不需要**单独调用心跳接口;只要保持发起正常的业务请求,服务端就会自动认定该客服在线
- 长时间不发请求(例如挂起 tab),客户端会被识别为离线;客户端下次回到前台时,状态会被自动恢复为 `online`(在客户端发起任意 HTTP 调用后)
- 显式调用 `/staff-statuses/{staffUserId}/force-offline` 会立即把状态设为 `offline` 并停止隐式恢复

### 3.2U 设备登录抢占

管理端登录 `/auth/login` 在设备维度有以下行为:

- 同一管理员账号 + 不同 `deviceId` 视为不同设备
- 默认每账号最多保留 N 个在线设备(超过则拒绝新登录),N 由租户配置控制

错误码:

| 错误码 | HTTP 状态 | 触发条件 |
|---|---|---|
| `AUTH_DEVICE_BOUND_RECENTLY_ACTIVE` | 409 | 该 `deviceId` 在很短时间窗口内被另一个账号绑定过,系统拒绝在该静默期内抢占该设备 |
| `AUTH_DEVICE_LIMIT_EXCEEDED` | 409 | 当前账号在线设备数已达上限,需要先在其它设备上登出 |
| `AUTH_DEVICE_MISMATCH` | 409 | 提交的 `deviceId` 与当前 token 绑定的设备不一致 |

`AUTH_DEVICE_BOUND_RECENTLY_ACTIVE` / `AUTH_DEVICE_LIMIT_EXCEEDED` 错误响应携带的附加字段(在响应 `data` 里):

| 字段 | 类型 | 说明 |
|---|---|---|
| `maskedLoginName` | string? | 当前绑定/占用该设备的账号脱敏登录名 |
| `lastSeenAt` | string? | 该绑定上一次活跃时间 |

**强制踢出 WebSocket 推送**:

当某账号被新设备抢占成功(旧 session 被吊销),旧 session 关联的 `/ws/client` 连接会收到一条:

```json
{
  "type": "auth.force_logout",
  "data": {
    "reason": "device_claimed_by_other_user",
    "occurredAt": "..."
  }
}
```

收到该事件的客户端应立即丢弃本地 token 并跳回登录页。

### 3.3 音视频运维

Base URL:`/api/admin/v1/voicecall`

主要覆盖:

- 中继节点列表 / 节点配置
- 节点维护模式开关
- 节点 advertised IP 覆盖(给每个节点单独配置对外可路由的 IP)
- 全租户 Opus 编码 / 录音开关配置(对新通话生效)
- 通话历史(CursorPage)、活跃通话、单个通话详情
- 管理员强制结束通话
- 录音列表(CursorPage)、录音下载、删除录音、按保留期清理录音

#### 3.3.1 节点 advertised IP 覆盖

`PUT /api/admin/v1/voicecall/nodes/{nodeId}/advertised-ip`

权限要求:`voicecall.manage_nodes`

请求体(`UpsertNodeAdvertisedIpRequest`):

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `advertisedIp` | string? | 否 | 该中继节点对外公布的 IP;留空字符串或 null 表示**删除该节点的覆盖,恢复到部署默认值** |
| `notes` | string? | 否 | 备注,记录这次覆盖的运营意图 |

响应 `data`(`MediaRelayNodeConfigDto`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `nodeId` | string | 节点 ID |
| `advertisedIp` | string? | 当前覆盖值;为 null 表示使用部署默认 |
| `notes` | string? | 备注 |
| `updatedByUserId` | GUID? | 最后更新人 |
| `updatedAt` | string | ISO 8601 |

补充:

- 修改仅对**之后发起的新通话**生效,已有通话不会切换
- 各节点拉取新配置存在短暂时滞,通常 30 秒内全节点一致

#### 3.3.2 Opus 编码与录音全局配置

`GET /api/admin/v1/voicecall/codec/opus`(权限:`voicecall.view`)
`PUT /api/admin/v1/voicecall/codec/opus`(权限:`voicecall.manage_nodes`)

请求 / 响应 `data`(`OpusCodecConfigDto`):

| 字段 | 类型 | 必填(PUT) | 默认 | 说明 |
|---|---|---|---|---|
| `targetBitrateBps` | int | 是 | `32000` | OPUS 目标码率(bps) |
| `complexity` | int | 是 | `9` | 编码复杂度 0-10 |
| `fmtp` | string | 否 | 见服务端默认 | OPUS fmtp 参数串 |
| `rtpPayloadType` | int | 是 | `111` | RTP payload type |
| `recordingEnabled` | bool | 是 | **`false`** | 是否启用通话录音 |
| `forceRelay` | bool | 是 | **`true`** | 是否强制媒体走 relay(关闭则允许 P2P 候选) |

补充:

- 修改仅对**之后发起的新通话**生效
- 录音默认是**关闭**的;明确合规后再启用
- 关闭 `forceRelay` 后,如客户端网络允许,可能直连(P2P),此时不保证录音

#### 3.3.3 通话历史与录音列表(CursorPage 分页)

`GET /api/admin/v1/voicecall/sessions`

Query 参数:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `from` | string? | 否 | ISO 8601 起始时间 |
| `to` | string? | 否 | ISO 8601 截止时间 |
| `callerUserId` | GUID? | 否 | 主叫用户 ID |
| `calleeUserId` | GUID? | 否 | 被叫用户 ID |
| `state` | short? | 否 | 通话状态枚举(见 §6.6) |
| `cursor` | string? | 否 | 上一次响应返回的 `nextCursor` |
| `pageSize` | int? | 否 | 每页条数 |

响应 `data`:`CursorPage<CallSessionDto>`,即 `{ items, nextCursor }`。

`GET /api/admin/v1/voicecall/recordings`

Query 参数:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `from` | string? | 否 | ISO 8601 起始时间 |
| `to` | string? | 否 | ISO 8601 截止时间 |
| `callId` | GUID? | 否 | 按通话 ID 过滤 |
| `cursor` | string? | 否 | 上一次响应返回的 `nextCursor` |
| `pageSize` | int? | 否 | 每页条数 |

响应 `data`:`CursorPage<CallRecordingDto>`,即 `{ items, nextCursor }`。

#### 3.3.4 `DELETE /api/admin/v1/voicecall/sessions/{callId}`

管理员强制结束指定通话。

权限要求:`voicecall.manage_calls`

路径参数:

| 字段 | 类型 | 说明 |
|---|---|---|
| `callId` | GUID | 通话 ID |

响应 `data` 根据通话当前状态有三种分支:

**(A) 正常派发结束指令:**

| 字段 | 类型 | 说明 |
|---|---|---|
| `callId` | GUID | 被结束的通话 ID |
| `dispatched` | bool | `true`,已派发结束指令到对应中继节点 |

**(B) 通话已结束:**

| 字段 | 类型 | 说明 |
|---|---|---|
| `callId` | GUID | 通话 ID |
| `alreadyEnded` | bool | `true` |

**(C) 节点离线时本地兜底结束:**

| 字段 | 类型 | 说明 |
|---|---|---|
| `callId` | GUID | 通话 ID |
| `endedLocally` | bool | `true`,服务端本地直接把通话置为 `ended`,客户端可能不会收到 RTC 层结束信号,需结合 ICE 失败自行兜底 |

#### 3.3.5 `POST /api/admin/v1/voicecall/recordings/cleanup`

按保留天数清理录音。

权限要求:`voicecall.manage_recordings`

请求体(`CleanupRecordingsRequest`):

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `retentionDays` | int | 是 | 保留天数;早于此天数的录音会被删除 |

响应 `data`:

| 字段 | 类型 | 说明 |
|---|---|---|
| `deletedCount` | int | 实际删除的录音条数 |

#### 3.3.6 端点权限码总览

| 端点 | 权限码 |
|---|---|
| `GET /nodes` | `voicecall.view` |
| `GET /nodes/configs` | `voicecall.view` |
| `GET /nodes/{nodeId}/calls` | `voicecall.view` |
| `PUT /nodes/{nodeId}/maintenance` | `voicecall.manage_nodes` |
| `PUT /nodes/{nodeId}/advertised-ip` | `voicecall.manage_nodes` |
| `GET /codec/opus` | `voicecall.view` |
| `PUT /codec/opus` | `voicecall.manage_nodes` |
| `GET /sessions` | `voicecall.view` |
| `GET /sessions/active` | `voicecall.view` |
| `GET /sessions/{callId}` | `voicecall.view` |
| `DELETE /sessions/{callId}` | `voicecall.manage_calls` |
| `GET /recordings` | `voicecall.view` |
| `GET /recordings/{recordingId}/download` | `voicecall.view` |
| `DELETE /recordings/{recordingId}` | `voicecall.manage_recordings` |
| `POST /recordings/cleanup` | `voicecall.manage_recordings` |

### 3.4 平台级管理

主要覆盖：

- 租户列表 / 详情
- 审批 / 拒绝 / 暂停 / 恢复 / 删除租户
- 平台侧创建租户
- 平台统计与租户存储统计
- 批量审批租户
- 更新配额与功能开关
- 租户用户管理
- 租户客户当前归属客服改绑
- 平台侧加入申请审批
- 平台用户管理

平台侧租户详情页还负责配置客户接待规则：

- `customerServiceMode=auto`
- `customerServiceMode=designated`
- `designatedServiceStaffId`

### 3.4A 平台管理端点详细文档

以下是 `/api/admin/v1/platform/` 路由组下的平台管理端点详细文档。所有端点均需平台超级管理员权限（`is_platform_admin=true`）。

#### 3.4A.1 租户生命周期管理

##### `GET /api/admin/v1/platform/tenants/{tenantId}/permanent-delete-plan`

永久删除计划预览。返回指定租户的永久删除影响评估，包含各类数据的统计和建议操作步骤。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |

响应 `data`：`PlatformTenantPermanentDeletePlanDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `currentStatus` | short | 当前租户状态 |
| `archivedAt` | string? | 归档时间（ISO 8601） |
| `canPermanentlyDelete` | bool | 是否可以执行永久删除 |
| `summary` | string | 影响摘要说明 |
| `recommendedSteps` | string[] | 建议的操作步骤列表 |
| `checks` | array | 数据检查项列表 |

`checks` 数组项（`PlatformTenantPermanentDeleteCheckDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `key` | string | 检查项键名（如 `users`、`groups`、`messages`） |
| `label` | string | 检查项显示名 |
| `count` | long | 数据条数 |
| `recommendation` | string | 处理建议 |

##### `POST /api/admin/v1/platform/tenants/{tenantId}/permanent-delete`

永久删除租户。不可逆操作，将彻底删除租户及其全部数据。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |

请求体（`PermanentlyDeleteTenantRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `tenantCodeConfirm` | string | 是 | 确认租户编码（必须与目标租户编码一致，防止误操作） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 被永久删除的租户 ID |
| `deleted` | bool | 是否已删除（固定为 `true`） |

##### `PUT /api/admin/v1/platform/tenants/{tenantId}/info`

更新租户信息。修改指定租户的基本信息。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |

请求体（`UpdatePlatformTenantInfoRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `tenantName` | string? | 否 | 租户名称 |
| `logoUrl` | string? | 否 | Logo URL |
| `tenantDescription` | string? | 否 | 租户描述 |
| `domain` | string? | 否 | 域名 |
| `industry` | string? | 否 | 行业 |
| `scale` | string? | 否 | 规模 |
| `contactName` | string? | 否 | 联系人姓名 |
| `contactMobile` | string? | 否 | 联系人手机 |
| `contactEmail` | string? | 否 | 联系人邮箱 |
| `isListed` | bool? | 否 | 是否在公开列表中展示 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 被更新的租户 ID |
| `updated` | bool | 是否更新成功（固定为 `true`） |

#### 3.4A.2 租户配额与功能开关

##### `PUT /api/admin/v1/platform/tenants/{tenantId}/quota`

更新租户配额。修改指定租户的资源配额限制。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |

请求体（`UpdateTenantQuotaRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `maxUsers` | int? | 否 | 最大用户数 |
| `maxGroups` | int? | 否 | 最大群组数 |
| `maxStorageMb` | long? | 否 | 最大存储空间（MB） |
| `planCode` | string? | 否 | 套餐编码 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 被更新的租户 ID |

##### `PUT /api/admin/v1/platform/tenants/{tenantId}/features`

更新租户功能开关。修改指定租户的功能开关配置。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |

请求体（`UpdateTenantFeaturesRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `featuresJson` | string | 是 | 功能开关配置（JSON 字符串） |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 被更新的租户 ID |

#### 3.4A.3 平台存储统计

##### `GET /api/admin/v1/platform/storage-stats`

租户存储统计。返回所有租户的存储使用情况。

无请求参数。

响应 `data`：`TenantStorageStatsDto[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantName` | string | 租户名称 |
| `usedStorageMb` | long | 已使用存储（MB） |
| `maxStorageMb` | long | 最大存储（MB） |
| `fileCount` | int | 文件数量 |
| `mediaCount` | int | 媒体数量 |
| `documentCount` | int | 文档数量 |

#### 3.4A.4 租户用户管理

##### `GET /api/admin/v1/platform/tenants/{tenantId}/users/{userId}`

租户用户详情。返回指定租户下指定用户的完整信息。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 用户 ID |

响应 `data`：`PlatformTenantUserDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | GUID | 用户 ID |
| `platformUserId` | GUID? | 平台用户 ID |
| `loginName` | string | 登录名 |
| `lppId` | string? | LPP ID |
| `displayName` | string | 显示名 |
| `avatarUrl` | string? | 头像 URL |
| `mobile` | string? | 手机号 |
| `email` | string? | 邮箱 |
| `userType` | short | 用户类型 |
| `status` | short | 用户状态 |
| `muteMode` | short | 禁言模式 |
| `muteUntil` | string? | 禁言截止时间 |
| `muteReason` | string? | 禁言原因 |
| `rateLimitOverride` | int? | 速率限制覆盖值 |
| `adminNote` | string? | 管理员备注 |
| `signature` | string? | 个性签名 |
| `gender` | short | 性别 |
| `birthday` | string? | 生日 |
| `location` | string? | 位置 |
| `bio` | string? | 个人简介 |
| `membershipRole` | short | 成员角色 |
| `joinMethod` | short | 加入方式 |
| `isOfficialServiceUser` | bool | 是否为官方服务账号用户 |
| `assignedStaffDisplayName` | string? | 归属客服显示名 |
| `assignedCustomerCount` | int | 归属客户数 |
| `joinedAt` | string? | 加入时间 |
| `roleCodes` | string[] | 角色编码列表 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |
| `customerService` | object | 客服上下文，参见 `PlatformCustomerServiceContextDto` |

##### `POST /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/customer-service/assign`

平台侧改绑某租户客户的归属客服。语义与租户后台 `POST /users/{userId}/customer-service/assign` 一致,但作用于平台侧的"租户详情 → 成员详情"入口。

权限要求:平台超级管理员(`is_platform_admin=true`)

路径参数:

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 目标租户 ID |
| `userId` | GUID | 目标客户用户 ID |

请求体(`PlatformAssignCustomerServiceRequest`):

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `staffUserId` | GUID? | 否 | 目标员工 ID;为空表示按租户规则自动分配 |
| `transferConversation` | bool | 是 | 是否把客户与原客服的服务单聊直接转给新客服 |

响应 `data`(`PlatformAssignCustomerServiceResultDto`):

| 字段 | 类型 | 说明 |
|---|---|---|
| `staffUserId` | GUID? | 实际生效的员工 ID;自动分配失败可能为空 |
| `transferredConversationCount` | int | 成功转交的单聊数量 |
| `skippedConversationCount` | int | 因目标单聊已存在等跳过的数量 |

##### `POST /api/admin/v1/platform/tenants/{tenantId}/users`

平台侧创建租户用户。在指定租户中创建一个新用户。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |

请求体（`PlatformCreateTenantUserRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `lppId` | string? | 否 | LPP ID |
| `password` | string | 是 | 初始密码 |
| `displayName` | string | 是 | 显示名 |
| `mobile` | string? | 否 | 手机号 |
| `email` | string? | 否 | 邮箱 |
| `userType` | short | 是 | 用户类型 |
| `membershipRole` | short | 是 | 成员角色 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 新创建的用户 ID |

##### `PUT /api/admin/v1/platform/tenants/{tenantId}/users/{userId}`

平台侧更新租户用户。修改指定租户下指定用户的信息。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 用户 ID |

请求体（`PlatformUpdateTenantUserRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `displayName` | string? | 否 | 显示名 |
| `avatarUrl` | string? | 否 | 头像 URL |
| `lppId` | string? | 否 | LPP ID |
| `userType` | short? | 否 | 用户类型 |
| `status` | short? | 否 | 用户状态 |
| `membershipRole` | short? | 否 | 成员角色 |
| `adminNote` | string? | 否 | 管理员备注 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 被更新的用户 ID |

##### `POST /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/reset-password`

平台侧重置用户密码。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 用户 ID |

请求体（`PlatformResetTenantUserPasswordRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `newPassword` | string | 是 | 新密码 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 被重置密码的用户 ID |

##### `POST /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/disable`

平台侧禁用用户。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 用户 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 被禁用的用户 ID |

##### `POST /api/admin/v1/platform/tenants/{tenantId}/users/{userId}/enable`

平台侧启用用户。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 用户 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 被启用的用户 ID |

##### `DELETE /api/admin/v1/platform/tenants/{tenantId}/users/{userId}`

平台侧移除用户。从指定租户中移除用户。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 用户 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `userId` | GUID | 被移除的用户 ID |

#### 3.4A.5 租户加入申请管理

##### `POST /api/admin/v1/platform/tenants/{tenantId}/join-requests/{requestId}/approve`

审批加入申请。批准指定租户的加入申请。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `requestId` | GUID | 加入申请 ID |

无请求体。

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `requestId` | GUID | 被批准的申请 ID |

##### `POST /api/admin/v1/platform/tenants/{tenantId}/join-requests/{requestId}/reject`

拒绝加入申请。拒绝指定租户的加入申请。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `requestId` | GUID | 加入申请 ID |

请求体（`ReviewJoinRequestRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `rejectReason` | string? | 否 | 拒绝原因 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `requestId` | GUID | 被拒绝的申请 ID |

#### 3.4A.6 平台用户管理

##### `GET /api/admin/v1/platform/users/{platformUserId}`

平台用户详情。返回指定平台用户的完整信息，包含其所属租户列表。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `platformUserId` | GUID | 平台用户 ID |

响应 `data`：`PlatformUserDetailDto`

| 字段 | 类型 | 说明 |
|---|---|---|
| `platformUserId` | GUID | 平台用户 ID |
| `lppId` | string? | LPP ID |
| `displayName` | string | 显示名 |
| `mobile` | string? | 手机号 |
| `email` | string? | 邮箱 |
| `avatarUrl` | string? | 头像 URL |
| `status` | short | 用户状态 |
| `isPlatformAdmin` | bool | 是否为平台管理员 |
| `lastLoginAt` | string? | 最后登录时间 |
| `spaceContext` | object | 空间上下文 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |
| `tenants` | array | 所属租户列表，参见 `TenantSummaryDto` |

`spaceContext` 字段（`PlatformSpaceContextDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `spaceType` | short | 空间类型（0=selection_required, 1=personal, 2=tenant） |
| `tenantId` | GUID? | 当前租户 ID（`spaceType=2` 时有值） |

`tenants` 数组项（`TenantSummaryDto`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | GUID | 租户 ID |
| `tenantCode` | string | 租户编码 |
| `tenantName` | string | 租户名称 |
| `logoUrl` | string? | Logo URL |
| `membershipRole` | short | 成员角色 |

##### `PUT /api/admin/v1/platform/users/{platformUserId}`

更新平台用户。修改指定平台用户的信息。

路径参数：

| 字段 | 类型 | 说明 |
|---|---|---|
| `platformUserId` | GUID | 平台用户 ID |

请求体（`UpdatePlatformUserRequest`）：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `lppId` | string? | 否 | LPP ID |
| `status` | short? | 否 | 用户状态 |
| `isPlatformAdmin` | bool? | 否 | 是否为平台管理员 |

响应 `data`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `platformUserId` | GUID | 被更新的平台用户 ID |

补充：

- 所有平台管理端点均需平台超级管理员权限，非超级管理员调用将返回 `403 Forbidden`
- 永久删除租户操作不可逆，执行前建议先调用 `permanent-delete-plan` 预览影响
- 平台侧创建的用户会自动加入目标租户，无需走加入申请流程
- `featuresJson` 为 JSON 字符串，包含租户功能开关配置（如 `joinApprovalMode`、`customerServiceMode`、`friendMode`、`tempSessionEnabled` 等）

## 3.X Admin 实时通知通道（`/ws/admin`）

管理后台拥有专属实时通道，用于即时刷新红点和列表，不再依赖轮询。

### 3.X.1 连接方式

- **URL**：`wss://{adminApiHost}/ws/admin`
- **鉴权**：与管理 REST 接口使用同一套管理端 JWT
  - 浏览器场景：通过实时连接客户端的 `accessTokenFactory` 传入
  - 或 query 兜底：`?access_token={accessToken}`

### 3.X.2 事件结构

每条事件都通过 hub 方法 `realtime.event` 下发，payload 形如：

```json
{
  "eventType": "tenant.join_request.created",
  "entityId": "0192abcd-...",
  "title": "新的入驻申请",
  "body": "Bob 申请加入企业",
  "tenantId": "0192...",
  "data": {
    "type": "tenant.join_request.created",
    "platformUserId": "...",
    "joinMethod": "tenant_code"
  }
}
```

### 3.X.3 当前事件类型

与 [open-platform.md §12](./open-platform.md) 完全一致：

- `tenant.join_request.{created,approved,rejected,cancelled}`
- `group.join_request.{created,approved,rejected}`

> 好友申请（`friend.request.*`）属于端到端用户事件，走客户端实时通道（`/ws/client`），不在管理后台通道下发。

### 3.X.4 接收人

事件由服务端按接收人范围自动投递，集成方无需手动订阅——只要当前管理员满足下列条件之一且在线，就会收到对应事件：

| 范围 | 收件人 |
|---|---|
| 租户权限持有者 | 持有 `tenant.join_request.review` 权限的管理员、租户管理员 / 所有者，以及平台超管 |
| 群管理角色 | 目标群的管理员 / 群主 |
| 指定单人 | 事件指定的某一管理员 |

### 3.X.5 重连建议

- 实时连接客户端建议开启自动重连，并采用指数退避（如 1s / 2s / 4s / … / 30s 上限）
- 重连成功后**不会回放历史事件**——红点的最终一致性由 REST 接口在用户进入对应页面时拉取保证

## 4. 推荐阅读顺序

如果你在接管理后台：

1. 先看 [admin-api-reference.md](./admin-api-reference.md) 的"接口总览"
2. 再看同文档的"关键 DTO 字段表"
3. 遇到公共枚举，再查 [field-enum-reference.md](./field-enum-reference.md)

如果你在接平台管理页：

1. 先看 `platform/*` 路由表
2. 再看租户 / 平台用户 / 租户用户 DTO
3. 再看加入申请、租户状态、用户状态等枚举说明

## 5. 特别注意

- `/api/admin/v1` 与 `/api/admin/v1/platform` 是两套不同层级的后台能力，不要混用
- 新后台优先接 `/api/admin/v1/customer-service/center/*`；`temp-sessions/*` 不再是全部客服运营的唯一入口
- 单客户"客服归属改绑"与"员工整体会话转移"是两条不同能力，不要把它们当成同一个动作
- 不是所有管理端列表都支持真正游标分页；很多接口当前仍是"返回最近 N 条 / 全量"
- 平台管理里的若干状态字段是数值型 `short`，展示时应按枚举映射处理
- 音视频运维接口中,通话历史和录音列表返回的是 `CursorPage<T>`(即 `{ items, nextCursor }`);如需翻页,客户端使用上一次响应的 `nextCursor` 作为下次请求的 `cursor` 查询参数
- 管理端媒体上传返回的 `url` 已改写为后台公开地址，可直接用于后台页面展示
- 客户加入租户后，系统会确保存在默认官方账号，并为客户建立与官方账号、当前负责客服的关系；后台展示和改绑都以这一条链路为准
- `threadId` 是统一客服线程标识，`conversationId` 是底层实际会话 ID；`direct_customer` 下两者不是同一个值

## 6. 核心枚举与状态

### 6.1 租户状态

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `pending_approval` | 待审核 |
| `1` | `active` | 已激活 |
| `2` | `suspended` | 已暂停 |
| `9` | `deleted` | 已删除 |

### 6.2 租户成员角色

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `member` | 普通成员 |
| `1` | `admin` | 管理员 |
| `2` | `owner` | 所有者 |

### 6.3 加入申请状态

| 值 | 名称 | 说明 |
|---|---|---|
| `0` | `pending` | 待审批 |
| `1` | `approved` | 已通过 |
| `2` | `rejected` | 已拒绝 |
| `3` | `cancelled` | 申请人已撤销 |

### 6.4 管理端用户状态

| 值 | 说明 |
|---|---|
| `active` | 正常可用 |
| `disabled` | 已禁用 |

### 6.5 Webhook 投递状态

| 值 | 说明 |
|---|---|
| `pending` | 待投递 |
| `delivered` | 已送达 |
| `retrying` | 重试中 |
| `dead_letter` | 最终失败 / 死信 |

### 6.6 音视频通话状态

| 值 | 说明 |
|---|---|
| `0` | `initiating` 发起中 |
| `1` | `ringing` 振铃中 |
| `2` | `active` 通话中 |
| `3` | `ended` 已结束 |
| `4` | `failed` 失败 |
| `5` | `rejected` 被拒绝 |
| `6` | `timeout` 超时 |
| `7` | `cancelled` 已取消 |

### 6.7 挂断原因

| 值 | 说明 |
|---|---|
| `0` | `normal` 正常结束 |
| `1` | `caller_hangup` 主叫挂断 |
| `2` | `callee_hangup` 被叫挂断 |
| `3` | `rejected` 被拒绝 |
| `4` | `timeout` 超时 |
| `5` | `cancelled` 已取消 |
| `6` | `failed` 失败 |
| `7` | `admin_force_end` 管理员强制结束 |
| `8` | `node_offline` 中继节点离线 |
| `9` | `connection_lost` 连接丢失 |

## 12. 移动推送管理

Base URL:`/api/admin/v1/notifications`

### 12.1 模块职责

移动端推送配置中心面向管理后台提供:

- 通道凭证管理(FCM Service Account JSON、JPush `appKey`/`masterSecret`)
- 路由规则管理(按用户 / 租户 / 地域 / 平台默认组合)
- 测试推送(绕过业务事件直接触发一次完整下发流程)
- 推送日志查阅(供审计 / 排障)

### 12.2 通道配置

- `GET /api/admin/v1/notifications/channels/{channel}`
- `PUT /api/admin/v1/notifications/channels/{channel}`

参数与字段:

- `channel`:`1=Fcm`、`2=JPush`
- `GET` 返回凭证状态但**不返回**明文 / 密文(只暴露 `hasCredentials` 布尔位)
- `PUT` 请求体:
  - `enabled`:是否启用
  - `credentialsPlaintext`:明文凭证;服务端加密后持久化
  - `extraOptionsJson`:预留扩展 JSON

凭证格式:

- **FCM**:整段 Firebase Service Account JSON 文件内容
- **JPush**:`{"appKey":"xxx","masterSecret":"yyy"}`

字段 / 响应速查见 [admin-api-reference.md §15.2-15.3](./admin-api-reference.md)。

### 12.3 路由规则

- `GET    /api/admin/v1/notifications/routing-rules`
- `POST   /api/admin/v1/notifications/routing-rules`
- `PUT    /api/admin/v1/notifications/routing-rules/{id}`
- `DELETE /api/admin/v1/notifications/routing-rules/{id}`

规则字段:

- `priority`:整数;同类型内部按 `priority` 升序先匹配
- `ruleType`:`1=PlatformDefault`、`2=Region`、`3=Tenant`、`4=User`
- `matchValue`:语义由 `ruleType` 决定(`User`→`userId`、`Tenant`→`tenantId`、`Region`→地域、`PlatformDefault`→`Android`/`iOS`)
- `targetChannel`:`1=Fcm`、`2=JPush`
- `enabled`:禁用规则直接跳过

通道选择优先级:`User` → `Tenant` → `Region` → `PlatformDefault` → 设备自身 `channel`。

推荐配置方式:

1. 默认在 `PlatformDefault` 规则下为 `Android` 选 `JPush`、`iOS` 选 `FCM`(或反之,按海外 / 国内倾向调整)
2. 针对特定地域(如 `CN`、`SG`)建 `Region` 规则覆盖
3. 针对特定租户 / 用户用 `Tenant` / `User` 规则进一步覆盖
4. 同规则类型内部按 `priority` 细化匹配顺序

### 12.4 测试推送

`POST /api/admin/v1/notifications/test-push`

请求体:

```json
{
  "tenantId": "...",
  "userId": "...",
  "scenario": 1,
  "title": "测试推送",
  "body": "来自管理后台",
  "data": { "k": "v" },
  "highPriority": false
}
```

`scenario` 值:`1=Message`、`2=Call`、`3=FriendRequest`。

**响应:`200 OK`,响应壳 `data` 为:**

```json
{ "accepted": true }
```

服务端异步派发;实际结果通过推送日志查询。

### 12.5 推送触发场景

业务侧触发推送的场景:

- **消息**:直聊和群聊新消息入库后触发 `Scenario=Message`
- **音视频**:发起通话邀请时触发 `Scenario=Call`(高优先级)
- **好友**:发送好友申请时触发 `Scenario=FriendRequest`(高优先级)
- **群公告**:当前不推送

### 12.6 设备 Token 生命周期

- 客户端通过 `POST /api/v1/notifications/devices` 注册推送 token,以 `(tenantId, userId, deviceId, channel)` 为唯一维度
- 上游 provider 返回失效码时,服务端会自动把对应设备置为 `IsActive=false`
- 长时间未活跃的设备记录会被定期清理(对客户端无可见影响)

### 12.7 权限与安全

- 所有 `/api/admin/v1/notifications/*` 端点都需要管理端登录
- 凭证明文只在 `PUT /channels/{channel}` 入口出现,其余均加密存储,不回显
- 规划权限码 `push.manage`(与后台菜单绑定)

### 12.8 可观测性

- 提供推送相关 metrics(`push_sent_total` Counter、`push_latency_seconds` Histogram),label 包括 `channel` / `scenario` / `status`
- Prometheus 兼容端点 `/metrics` 可直接 scrape

详细字段 / 枚举见 [admin-api-reference.md §15](./admin-api-reference.md) 与 [field-enum-reference.md §12](./field-enum-reference.md)。

## 13. 错误码总览

下表汇总管理后台 API 常见的 `code` 字段值,客户端可据此做统一错误处理。

| code | HTTP 状态 | 触发场景 |
|---|---|---|
| `OK` | 200 | 成功 |
| `ADMIN_INVALID_CREDENTIALS` | 401 | 登录名或密码错误 |
| `ADMIN_INVALID_PASSWORD` | 400 | 新密码不满足最小长度 |
| `ADMIN_CURRENT_PASSWORD_MISMATCH` | 400 | 修改密码时当前密码错误 |
| `ADMIN_SELF_ROLE_REVOKE_FORBIDDEN` | 400 | 不能移除自身全部角色 |
| `ADMIN_ROLE_NOT_FOUND` | 400 | 提交的角色编码不存在 |
| `ADMIN_ROLE_EXISTS` | 409 | 创建角色时编码已存在 |
| `ADMIN_ROLE_TEMPLATE_NOT_FOUND` | 400 | 模板角色不存在 |
| `ADMIN_ROLE_IN_USE` | 409 | 角色仍有分配,不能删除 |
| `ADMIN_ROLE_FORBIDDEN` | 403 | 内建角色不允许修改 |
| `ADMIN_USER_NOT_FOUND` | 404 | 目标用户不存在 |
| `ADMIN_BOT_APP_NOT_FOUND` | 404 | BOT 应用不存在 |
| `ADMIN_BOT_APP_GRANT_CONVERSATION_NOT_FOUND` | 400 | 授权会话不存在 |
| `ADMIN_SERVICE_ACCOUNT_NOT_FOUND` | 404 | 服务账号不存在 |
| `ADMIN_SERVICE_ACCOUNT_EXISTS` | 409 | 服务账号 code 已存在 |
| `AUTH_DEVICE_BOUND_RECENTLY_ACTIVE` | 409 | 设备短期内被他人绑定 |
| `AUTH_DEVICE_LIMIT_EXCEEDED` | 409 | 当前账号在线设备已达上限 |
| `AUTH_DEVICE_MISMATCH` | 409 | 设备 ID 不一致 |
| `AI_SERVICE_CONFIG_NOT_FOUND` | 404 | AI 配置缺失 |
| `AI_SERVICE_RERANKER_CONFIG_INCOMPLETE` | 400 | 选择 reranker / hybrid 策略但 reranker 配置不完整 |
| `CUSTOMER_SERVICE_TRANSFER_SAME_STAFF` | 400 | 批量转移源员工和目标员工相同 |
| `TEMP_SESSION_ADMIN_INTERVENTION_REASON_REQUIRED` | 400 | 管理员介入但未提交 `interventionReason` |
| `TEMP_SESSION_KNOWLEDGE_IMPORT_FORM_REQUIRED` | 400 | 知识库文档导入未使用 `multipart/form-data` |
| `TEMP_SESSION_KNOWLEDGE_IMPORT_FILE_REQUIRED` | 400 | 知识库文档导入未上传文件或文件为空 |
